const KoaRouter = require('koa-router');
const jwt = require('jsonwebtoken');

const hello = require('./routes/hello');
const index = require('./routes/index');
const food = require('./routes/food');
const meal = require('./routes/meal');
const sector = require('./routes/sector');
const diet = require('./routes/diet');
const user = require('./routes/user');
const faq = require('./routes/faq');
const api = require('./routes/api');

const router = new KoaRouter();

router.use(async (ctx, next) => {
  Object.assign(ctx.state, {
    currentUser: ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId),
    newUserPath: ctx.router.url('users.new'),
    destroyUserPath: ctx.router.url('users.destroy'),
    editUserPath: ctx.router.url('users.edit'),
    loginPath: ctx.router.url('users.newlogin'),
    specialistPath: ctx.router.url('users.newspecialist'),
    revisionsPath: ctx.router.url('users.revisionlist'),
  });
  return next();
});

router.use('/', index.routes());
router.use('/hello', hello.routes());
router.use('/alimentos', food.routes());
router.use('/comidas', meal.routes());
router.use('/sectores', sector.routes());
router.use('/dietas', diet.routes());
router.use('/usuarios', user.routes());
router.use('/FAQ', faq.routes());
router.use('/api', api.routes());

module.exports = router;
