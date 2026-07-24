/* Tiny in-memory response cache.
 *
 * The Atlas cluster is fast at querying but slow at *transferring* large result
 * sets out (free-tier egress throttling). Caching the heavy GET responses in
 * process memory means repeat loads (page reloads, other users, the 30s live
 * poll) skip Atlas entirely. Every mutating route clears the relevant prefix,
 * so a cache hit is never stale after a write on this instance.
 */
const store = new Map(); // key -> { val, exp }
let generation = 0;      // bumped on every invalidate; guards against caching a
                         // read that a concurrent write already superseded.

function get(key) {
  const e = store.get(key);
  if (e && e.exp > Date.now()) return e.val;
  if (e) store.delete(key);
  return null;
}
function set(key, val, ttlMs) { store.set(key, { val, exp: Date.now() + ttlMs }); }
function clear(prefix) {
  let n = 0;
  for (const k of store.keys()) if (k.startsWith(prefix + '::')) { store.delete(k); n++; }
  return n;
}

// Route middleware: serve a cached JSON body for GETs, or cache the response.
function cacheGet(prefix, ttlMs) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();
    const key = prefix + '::' + req.originalUrl;
    const hit = get(key);
    if (hit) { res.set('X-Cache', 'HIT'); return res.json(hit); }
    const genAtEntry = generation;
    const orig = res.json.bind(res);
    res.json = (body) => {
      try {
        // Only cache if NO write invalidated this data while we were reading it.
        // Otherwise a slow read that began before a concurrent write could finish
        // afterwards and re-poison the cache with pre-write (stale) data — the exact
        // race that made a just-approved order snap back to its old status.
        if (body && body.success !== false && generation === genAtEntry) set(key, body, ttlMs);
      } catch (e) { /* ignore */ }
      res.set('X-Cache', generation === genAtEntry ? 'MISS' : 'BYPASS');
      return orig(body);
    };
    next();
  };
}

// Route middleware: after any successful mutating request, drop the given
// cache prefixes so the next read re-fetches fresh data. No-op on GETs.
function invalidate(...prefixes) {
  return (req, res, next) => {
    if (req.method === 'GET') return next();
    const orig = res.json.bind(res);
    res.json = (body) => {
      try { if (body && body.success !== false) { generation++; prefixes.forEach((p) => clear(p)); } } catch (e) { /* ignore */ }
      return orig(body);
    };
    next();
  };
}

module.exports = { cacheGet, invalidate, clear, get, set, store };
