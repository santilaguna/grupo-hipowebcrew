const KoaRouter = require('koa-router');

const router = new KoaRouter();

router.get('index', '/', async (ctx) => {
  await ctx.render('faqs/index', {
    notice: ctx.flashMessage.notice,
  });
});

module.exports = router;
