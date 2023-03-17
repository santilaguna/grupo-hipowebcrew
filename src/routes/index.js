const KoaRouter = require('koa-router');


const router = new KoaRouter();

router.get('index.home', '/', async (ctx) => {
  await ctx.render('index');
});

module.exports = router;
