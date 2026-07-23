/* Auto-advance In Transit → At Transporter once the transit days elapse.
 *
 * When an order is marked In Transit with a number of transit days, the app
 * stores the arrival date on `order.eta` as YYYY-MM-DD (dispatch date + days).
 * This job periodically moves any In Transit order whose ETA has arrived to
 * "At Transporter", so the stage advances on its own without a manual click.
 *
 * Runs server-side (independent of any open browser). Each move is recorded in
 * the order trail and, via the Order post-save hook, notifies live clients and
 * clears the response cache.
 *
 * SAFETY: only active in production (or when ENABLE_AUTO_TRANSIT=true) so it
 * never mutates the shared DB from a local/dev backend.
 */
const Order = require('../models/Order');

// True once the transit ETA (YYYY-MM-DD, set by the auto-ETA on dispatch) has
// arrived. Only this exact format is considered, so manually-typed ETAs in
// other formats are left untouched.
function etaReached(eta, now = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(eta || '').trim());
  if (!m) return false;
  const etaDate = new Date(+m[1], +m[2] - 1, +m[3]);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return today >= etaDate;
}

// Advance a single order if it qualifies. Returns true if it was moved.
async function maybeAdvance(o) {
  if (!o || o.status !== 'In Transit' || o.isActive === false) return false;
  if (!etaReached(o.eta)) return false;
  o.status = 'At Transporter';
  if (!Array.isArray(o.trail)) o.trail = [];
  o.trail.push({
    type: 'status',
    desc: 'Auto-moved to At Transporter — transit days elapsed',
    from: 'In Transit',
    to: 'At Transporter',
    by: 'System',
    at: new Date(),
  });
  await o.save();
  return true;
}

async function runAutoTransit() {
  try {
    const inTransit = await Order.find({ status: 'In Transit', isActive: true });
    let moved = 0;
    for (const o of inTransit) {
      if (await maybeAdvance(o)) moved++;
    }
    if (moved) console.log(`⏱  auto-transit: advanced ${moved} order(s) In Transit → At Transporter`);
    return moved;
  } catch (e) {
    console.warn('auto-transit job failed:', e.message);
    return 0;
  }
}

function startAutoTransit() {
  const enabled = process.env.NODE_ENV === 'production' || process.env.ENABLE_AUTO_TRANSIT === 'true';
  if (!enabled) {
    console.log('⏱  auto-transit: disabled (not production; set ENABLE_AUTO_TRANSIT=true to enable)');
    return;
  }
  // First run shortly after boot (give the DB a moment), then every 15 minutes.
  setTimeout(runAutoTransit, 15000);
  setInterval(runAutoTransit, 15 * 60 * 1000);
  console.log('⏱  auto-transit: enabled (checks every 15 min)');
}

module.exports = { startAutoTransit, runAutoTransit, maybeAdvance, etaReached };
