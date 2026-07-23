const router = require('express').Router();
const { products: ctrl } = require('../controllers/master.controller');
const { protect } = require('../middleware/auth.middleware');
const { can }     = require('../middleware/permission.middleware');
const { cacheGet, invalidate } = require('../middleware/cache.middleware');

router.use(protect);
router.use(invalidate('m_products'));
router.get   ('/',    can('viewMaster'),  cacheGet('m_products', 300000), ctrl.getAll);
router.get   ('/:id', can('viewMaster'),  ctrl.getOne);
router.post  ('/bulk',can('editMaster'),  ctrl.bulkUpsert);
router.post  ('/',    can('editMaster'),  ctrl.create);
router.put   ('/:id', can('editMaster'),  ctrl.update);
router.delete('/:id', can('editMaster'),  ctrl.remove);
module.exports = router;
