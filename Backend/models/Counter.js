const mongoose = require('mongoose');

/* Atomic sequence counters.
 *
 * One document per named sequence (e.g. `_id: 'orderSeq'`). Handing out the
 * next number is a single `$inc` inside findOneAndUpdate, which MongoDB
 * executes atomically per document — so two simultaneous order creations can
 * never receive the same value (the read-then-write race in the old
 * "find max seqId + 1" approach). */
const counterSchema = new mongoose.Schema({
  _id: { type: String },
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model('Counter', counterSchema);
