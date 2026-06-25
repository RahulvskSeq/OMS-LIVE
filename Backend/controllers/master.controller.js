const Customer    = require('../models/Customer');
const Supplier    = require('../models/Supplier');
const Product     = require('../models/Product');
const Transporter = require('../models/Transporter');

const makeCrud = (Model, label) => ({
  getAll: async (req, res, next) => {
    try {
      const { search, isActive = 'true', page, limit } = req.query;
      const filter = {};
      if (isActive !== 'all') filter.isActive = isActive === 'true';
      if (search) filter.name = { $regex: search, $options: 'i' };
      // Opt-in pagination: ONLY when page/limit is supplied. Without them the
      // response is identical to before ({ success, data }), so every existing
      // caller is untouched. With them, the catalog can be streamed in chunks
      // (sort+skip is index-backed — `name` is indexed) instead of one big payload.
      if (page != null || limit != null) {
        const _limit = Math.min(Math.max(parseInt(limit, 10) || 1000, 1), 5000);
        const _page  = Math.max(parseInt(page, 10) || 1, 1);
        const [items, total] = await Promise.all([
          Model.find(filter).sort('name').skip((_page - 1) * _limit).limit(_limit).lean(),
          Model.countDocuments(filter),
        ]);
        return res.json({
          success: true,
          data: items,
          total,
          page: _page,
          pages: Math.max(Math.ceil(total / _limit), 1),
        });
      }
      const items = await Model.find(filter).sort('name').lean();
      res.json({ success: true, data: items });
    } catch (err) { next(err); }
  },
  getOne: async (req, res, next) => {
    try {
      const item = await Model.findById(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: `${label} not found` });
      res.json({ success: true, data: item });
    } catch (err) { next(err); }
  },
  create: async (req, res, next) => {
    try {
      const item = await Model.create({ ...req.body, createdBy: req.user._id });
      res.status(201).json({ success: true, data: item, message: `${label} created` });
    } catch (err) { next(err); }
  },
  update: async (req, res, next) => {
    try {
      const item = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!item) return res.status(404).json({ success: false, message: `${label} not found` });
      res.json({ success: true, data: item, message: `${label} updated` });
    } catch (err) { next(err); }
  },
  remove: async (req, res, next) => {
    try {
      const item = await Model.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
      if (!item) return res.status(404).json({ success: false, message: `${label} not found` });
      res.json({ success: true, message: `${label} deactivated` });
    } catch (err) { next(err); }
  },
});

const _custCrud = makeCrud(Customer, 'Customer');
// Upsert by unique name: a POST with an existing customer name UPDATES it instead of failing on duplicate.
_custCrud.create = async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim();
    if (name) {
      const existing = await Customer.findOne({ name });
      if (existing) {
        Object.keys(req.body).forEach(k => { if (k !== '_id' && k !== 'createdBy') existing[k] = req.body[k]; });
        existing.isActive = true;
        await existing.save();
        return res.json({ success: true, data: existing, message: 'Customer updated' });
      }
    }
    const item = await Customer.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: item, message: 'Customer created' });
  } catch (err) { next(err); }
};
exports.customers = _custCrud;
const _supCrud = makeCrud(Supplier, 'Supplier');
_supCrud.create = async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim();
    if (name) {
      const existing = await Supplier.findOne({ name });
      if (existing) {
        Object.keys(req.body).forEach(k => { if (k !== '_id' && k !== 'createdBy') existing[k] = req.body[k]; });
        existing.isActive = true;
        await existing.save();
        return res.json({ success: true, data: existing, message: 'Supplier updated' });
      }
    }
    const item = await Supplier.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: item, message: 'Supplier created' });
  } catch (err) { next(err); }
};
exports.suppliers = _supCrud;
const _prodCrud = makeCrud(Product, 'Product');
_prodCrud.create = async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim();
    const code = (req.body.code || '').trim();
    if (!code) delete req.body.code;
    let existing = null;
    if (name) existing = await Product.findOne({ name });
    if (!existing && code) existing = await Product.findOne({ code });
    if (existing) {
      Object.keys(req.body).forEach(k => { if (k !== '_id' && k !== 'createdBy') existing[k] = req.body[k]; });
      if (!code) existing.code = undefined;
      existing.isActive = true;
      await existing.save();
      return res.json({ success: true, data: existing, message: 'Product updated' });
    }
    const item = await Product.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: item, message: 'Product created' });
  } catch (err) { next(err); }
};
// Bulk import — upsert thousands of products in a few round-trips instead of one
// HTTP request per record (which timed out and silently dropped most of a large
// template). Keyed on `name` (always present and unique). In 'replace' mode every
// existing product is deactivated first, then the upsert reactivates the ones that
// are still present, so the DB mirrors the upload without a hard delete.
_prodCrud.bulkUpsert = async (req, res, next) => {
  try {
    const { items = [], mode = 'add' } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'items must be an array' });
    }
    const createdBy = req.user._id;

    if (mode === 'replace') {
      await Product.updateMany({}, { $set: { isActive: false } });
    }

    const seen = new Set();
    const ops = [];
    for (const it of items) {
      const name = String((it && (it.name || it.code)) || '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue; // last write wins is irrelevant; dedup keeps bulkWrite valid
      seen.add(key);
      const code = String((it && it.code) || '').trim();
      const set = {
        name,
        category: (it && it.category) || '',
        unit: (it && it.unit) || 'pcs',
        defaultVendor: (it && it.defaultVendor) || '',
        parentCode: (it && it.parentCode) || '',
        parentAlias: (it && it.parentAlias) || '',
        isActive: true,
      };
      if (code) set.code = code; // leave sparse-unique code unset when blank
      ops.push({
        updateOne: {
          filter: { name },
          update: { $set: set, $setOnInsert: { createdBy } },
          upsert: true,
        },
      });
    }

    let upserted = 0, modified = 0, matched = 0;
    const CH = 1000;
    for (let i = 0; i < ops.length; i += CH) {
      const r = await Product.bulkWrite(ops.slice(i, i + CH), { ordered: false });
      upserted += r.upsertedCount || 0;
      modified += r.modifiedCount || 0;
      matched  += r.matchedCount  || 0;
    }
    const activeTotal = await Product.countDocuments({ isActive: true });
    res.json({
      success: true,
      received: items.length,
      upserted, modified, matched, activeTotal,
      message: `Bulk import: ${upserted} created, ${modified} updated (${activeTotal} active)`,
    });
  } catch (err) { next(err); }
};
exports.products = _prodCrud;
const _transCrud = makeCrud(Transporter, 'Transporter');
_transCrud.create = async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim();
    if (name) {
      const existing = await Transporter.findOne({ name });
      if (existing) {
        Object.keys(req.body).forEach(k => { if (k !== '_id' && k !== 'createdBy') existing[k] = req.body[k]; });
        existing.isActive = true;
        await existing.save();
        return res.json({ success: true, data: existing, message: 'Transporter updated' });
      }
    }
    const item = await Transporter.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: item, message: 'Transporter created' });
  } catch (err) { next(err); }
};
exports.transporters = _transCrud;
