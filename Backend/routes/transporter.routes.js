const router = require('express').Router();
const { transporters: ctrl } = require('../controllers/master.controller');
const { protect } = require('../middleware/auth.middleware');
const { can }     = require('../middleware/permission.middleware');
const { cacheGet, invalidate } = require('../middleware/cache.middleware');

router.use(protect);
router.use(invalidate('m_transporters'));
router.get   ('/',    can('viewMaster'),  cacheGet('m_transporters', 300000), ctrl.getAll);
router.get   ('/:id', can('viewMaster'),  ctrl.getOne);
router.post  ('/',    can('editMaster'),  ctrl.create);
router.put   ('/:id', can('editMaster'),  ctrl.update);
router.delete('/:id', can('editMaster'),  ctrl.remove);
module.exports = router;
