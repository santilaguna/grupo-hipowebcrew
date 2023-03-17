const KoaRouter = require('koa-router');
const foodsApi = require('./foods');
const sectorsApi = require('./sectors');
const usersApi = require('./users');

const router = new KoaRouter();

router.use('/foods', foodsApi.routes());
router.use('/sectors', sectorsApi.routes());
router.use('/users', usersApi.routes());

module.exports = router;
