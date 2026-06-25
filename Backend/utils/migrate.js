/**
 * migrate.js — Stencil OMS
 * ========================================================================
 * Copy ALL data from the current MongoDB (source) to a different MongoDB
 * (destination). Copies every collection document-for-document, preserving
 * _id and all fields/types.
 *
 *   SOURCE      = MONGODB_URI from Backend/.env
 *   DESTINATION = DEST_MONGODB_URI env var, or the first CLI argument
 *
 * Usage (from the Backend/ folder):
 *
 *   # safe upsert copy (default — re-runnable, never deletes dest data)
 *   node utils/migrate.js "mongodb+srv://user:pass@dest-cluster/dbname"
 *
 *   # exact clone (wipe each destination collection first, then copy)
 *   node utils/migrate.js "mongodb+srv://user:pass@dest-cluster/dbname" --drop
 *
 *   # or pass the destination via env instead of an argument
 *   DEST_MONGODB_URI="mongodb+srv://..." node utils/migrate.js
 *
 * Notes:
 *   • Indexes are NOT copied — the app recreates them automatically the first
 *     time the backend connects to the new DB (the schemas declare them).
 *   • Safe to re-run: default mode upserts by _id, so nothing is duplicated.
 * ========================================================================
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const SOURCE = process.env.MONGODB_URI;
const DEST   = process.env.DEST_MONGODB_URI || process.argv.find(a => a.startsWith('mongodb'));
const DROP   = process.argv.includes('--drop');
const BATCH  = 500;

function mask(uri) {
  return String(uri || '').replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
}

async function migrate() {
  if (!SOURCE) {
    console.error('❌ No source — MONGODB_URI is missing in Backend/.env');
    process.exit(1);
  }
  if (!DEST) {
    console.error('❌ No destination — pass it as an argument or set DEST_MONGODB_URI.');
    console.error('   Example: node utils/migrate.js "mongodb+srv://user:pass@cluster/dbname"');
    process.exit(1);
  }
  if (SOURCE === DEST) {
    console.error('❌ Source and destination are identical — refusing to run.');
    process.exit(1);
  }

  console.log('\n── MongoDB migration ────────────────────────────────');
  console.log('  Source :', mask(SOURCE));
  console.log('  Dest   :', mask(DEST));
  console.log('  Mode   :', DROP ? 'CLONE (drop each dest collection first)' : 'UPSERT (safe, re-runnable)');
  console.log('─────────────────────────────────────────────────────\n');

  const src = await mongoose.createConnection(SOURCE, { serverSelectionTimeoutMS: 10000 }).asPromise();
  const dst = await mongoose.createConnection(DEST,   { serverSelectionTimeoutMS: 10000 }).asPromise();
  console.log('✅ Connected to both databases\n');

  const started = Date.now();
  let grandTotal = 0;
  const summary = [];

  try {
    const collections = (await src.db.listCollections().toArray())
      .map(c => c.name)
      .filter(n => !n.startsWith('system.'));

    if (!collections.length) {
      console.log('⚠️  Source database has no collections — nothing to copy.');
    }

    for (const name of collections) {
      const srcCol = src.db.collection(name);
      const dstCol = dst.db.collection(name);
      const expected = await srcCol.countDocuments();

      if (DROP) {
        try { await dstCol.drop(); } catch (e) { /* didn't exist — fine */ }
      }

      let copied = 0;
      let batch = [];
      const flush = async () => {
        if (!batch.length) return;
        const ops = batch.map(doc => ({
          replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
        }));
        await dstCol.bulkWrite(ops, { ordered: false });
        copied += batch.length;
        batch = [];
      };

      try {
        const cursor = srcCol.find({});
        for await (const doc of cursor) {
          batch.push(doc);
          if (batch.length >= BATCH) await flush();
        }
        await flush();
        console.log(`  ✅ ${name.padEnd(16)} ${copied}/${expected} docs`);
      } catch (err) {
        console.error(`  ❌ ${name.padEnd(16)} failed after ${copied}/${expected}: ${err.message}`);
      }

      summary.push({ collection: name, expected, copied });
      grandTotal += copied;
    }
  } finally {
    await src.close();
    await dst.close();
  }

  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log('\n── Summary ──────────────────────────────────────────');
  summary.forEach(s => {
    const ok = s.copied === s.expected ? '  ' : '⚠️';
    console.log(`  ${ok} ${s.collection.padEnd(16)} ${s.copied}/${s.expected}`);
  });
  console.log('─────────────────────────────────────────────────────');
  console.log(`🌱 Done — ${grandTotal} documents copied in ${secs}s\n`);
}

migrate().catch(err => { console.error('\n❌ Migration failed:', err.message); process.exit(1); });
