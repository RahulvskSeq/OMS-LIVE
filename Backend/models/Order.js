const mongoose = require('mongoose');
const Counter  = require('./Counter');

// ── Trail Entry ──────────────────────────────────────────────────
const trailEntrySchema = new mongoose.Schema({
  type:  { type: String, default: 'edit' },
  desc:  { type: String, default: '' },
  from:  { type: String, default: '' },
  to:    { type: String, default: '' },
  note:  { type: String, default: '' },
  by:    { type: String, default: 'System' },
  byId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  role:  { type: String, default: '' },
  at:    { type: Date, default: Date.now },
}, { _id: true });

// ── ETA History Entry ────────────────────────────────────────────
const etaHistorySchema = new mongoose.Schema({
  from:       { type: String },
  to:         { type: String },
  reason:     { type: String },
  changedBy:  { type: String },
  changedById:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changedAt:  { type: Date, default: Date.now },
}, { _id: true });

// ── Main Order Schema ────────────────────────────────────────────
const orderSchema = new mongoose.Schema({
  // Sequential numeric DON id (for display as DON-XXXX)
  seqId:          { type: Number },
  groupDonId:     { type: Number },

  // Order details
  customer:       { type: String, required: true, trim: true },
  customerId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  product:        { type: String, required: true, trim: true },
  productId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  orderedCode:    { type: String, trim: true },
  qty:            { type: Number, required: true, min: 1 },
  unit:           { type: String, default: 'pcs' },

  // Vendor / Supplier
  vendor:         { type: String, trim: true },
  supplierId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },

  // Dates
  orderDate:      { type: Date, required: true, default: Date.now },
  eta:            { type: String },
  etaBangalore:   { type: String },
  dispatchDate:   { type: String, default: '' }, // manager-EXTENDED supplier dispatch date (YYYY-MM-DD); blank = use auto (orderDate + default days)
  transitExtendDate: { type: String, default: '' }, // manager-EXTENDED transporter arrival date (YYYY-MM-DD); blank = use auto (dispatch + default transit days)

  // Status
  status: {
    type: String,
    enum: ['Order','Approved','PO Raised','In Transit','At Transporter','Warehouse','GRN','Purchased','Billed','Delivered','Cancelled'],
    default: 'Order',
  },

  // Logistics
  lr:             { type: String, trim: true },
  lrDate:         { type: String },
  transporter:    { type: String, trim: true },
  transporterId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Transporter' },
  transitMode:    { type: String },
  transitForm:    { type: String },
  vendorInvoice:  { type: String, trim: true },
  transitDays:    { type: Number },

  // Pricing
  purchaseRate:   { type: Number },
  sellingRate:    { type: Number },

  // PO / Vendor
  poNum:          { type: String, trim: true, default: '' },
  vendorPoNum:    { type: String, trim: true, default: '' },

  // Staff fields
  biller:         { type: String, trim: true, default: '' },
  salesExec:      { type: String, trim: true, default: '' },

  // Cancel fields
  cancelReason:   { type: String, default: '' },
  cancelledBy:    { type: String, default: '' },
  cancelledAt:    { type: String, default: '' },

  // GRN flat fields
  grnNo:          { type: String, trim: true, default: '' },
  grnDate:        { type: String, default: '' },
  grnBy:          { type: String, default: '' },
  grnRemarks:     { type: String, default: '' },
  purchVoucherNo: { type: String, trim: true, default: '' },
  physGrnNo:      { type: String, trim: true, default: '' },
  physGrnDate:    { type: String, default: '' },

  // Vendor invoice flat fields
  vendorInvoiceNum:  { type: String, trim: true, default: '' },
  vendorInvoiceDate: { type: String, default: '' },

  // Remarks / comments
  remark:         { type: String, default: '' },
  comments:       [{ type: mongoose.Schema.Types.Mixed }],

  // Transit details (flexible object)
  transitDetails: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Stock flags
  isStockOrder:     { type: Boolean, default: false },
  isStockAddition:  { type: Boolean, default: false },

  // Misc
  notes:          { type: String },
  isSplit:        { type: Boolean, default: false },
  linkedToOrderId:{ type: Number },

  // Sub-documents — stored as Mixed so frontend arrays/objects pass through without cast errors
  grn:            { type: mongoose.Schema.Types.Mixed, default: {} },
  billing:        { type: mongoose.Schema.Types.Mixed, default: [] },
  delivery:       { type: mongoose.Schema.Types.Mixed, default: {} },
  etaHistory:     [etaHistorySchema],
  trail:          [trailEntrySchema],

  // Created by
  createdBy:      { type: String },
  createdById:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedTo:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive:       { type: Boolean, default: true },
  billerHistory: [{ type: String }],
  salesHistory: [{ type: String }],
}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────────────
orderSchema.index({ seqId: 1 }, { unique: true, sparse: true });
orderSchema.index({ status: 1 });
orderSchema.index({ customer: 1 });
orderSchema.index({ orderDate: -1 });
orderSchema.index({ eta: 1 });
orderSchema.index({ customerId: 1 });

// ── Auto-increment seqId (concurrency-safe) ──────────────────────
// Two users creating orders at the same instant previously both read the same
// "max seqId" and computed the same +1 → duplicate DON numbers. Now the number
// comes from an atomic counter document, so every create gets a unique value
// even under simultaneous requests.
async function nextOrderSeq(OrderModel) {
  // Lazily seed the counter from the current max seqId the first time it is
  // used, so new ids continue after existing data instead of restarting at 1001.
  const existing = await Counter.findById('orderSeq').lean();
  if (!existing) {
    const last  = await OrderModel.findOne({}, { seqId: 1 }).sort({ seqId: -1 }).lean();
    const start = last && last.seqId ? last.seqId : 1000;
    // $setOnInsert is atomic: if two creates race the seed, only the first
    // insert seeds — the loser hits the existing doc and is ignored.
    await Counter.updateOne({ _id: 'orderSeq' }, { $setOnInsert: { seq: start } }, { upsert: true });
  }
  const doc = await Counter.findByIdAndUpdate(
    'orderSeq',
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return doc.seq;
}

orderSchema.pre('save', async function(next) {
  try {
    if (this.isNew && !this.seqId) {
      this.seqId = await nextOrderSeq(this.constructor);
      if (!this.groupDonId) this.groupDonId = this.seqId;
    }
    next();
  } catch (err) { next(err); }
});


// Accumulate every biller / sales-exec the order has ever had (for visibility)
orderSchema.pre('save', function(next){
  try{
    if(this.biller){ if(!Array.isArray(this.billerHistory)) this.billerHistory=[]; if(!this.billerHistory.includes(this.biller)) this.billerHistory.push(this.biller); }
    if(this.salesExec){ if(!Array.isArray(this.salesHistory)) this.salesHistory=[]; if(!this.salesHistory.includes(this.salesExec)) this.salesHistory.push(this.salesExec); }
  }catch(e){}
  next();
});

// Notify connected SSE clients on any order change (create / status / grn / billing / etc.)
// and drop the cached order list + dashboard aggregates so the next read is fresh.
// Covers writes that bypass the route middleware (e.g. background sheet sync).
orderSchema.post('save', function(doc){
  try{ if(global.__sseNotify) global.__sseNotify(doc); }catch(e){}
  try{ const c = require('../middleware/cache.middleware'); c.clear('orders'); c.clear('dash'); }catch(e){}
});

module.exports = mongoose.model('Order', orderSchema);
