const KoaRouter = require('koa-router');
const jwt = require('jsonwebtoken');

const router = new KoaRouter();

// As seen at: https://github.com/IIC2513-2019-2/my-university/blob/master/src/routes/api/auth.js
router.post('api.users.login', '/login', async (ctx) => {
  const { email, password } = ctx.request.body;
  if (typeof (email) !== 'string' || typeof (password) !== 'string') {
    ctx.throw(401, 'Wrong e-mail or password format');
  }
  const user = await ctx.orm.user.findOne({ where: { email } });
  if (user && await user.checkPassword(password)) {
    const token = await new Promise((resolve, reject) => {
      jwt.sign(
        { userId: user.id },
        'shhhhh', // process.env.JWT_SECRET,
        (err, tokenResult) => (err ? reject(err) : resolve(tokenResult)),
      );
    });
    ctx.body = { token };
  } else {
    ctx.throw(401, 'Wrong e-mail or password');
  }
});

module.exports = router;
