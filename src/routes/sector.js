const KoaRouter = require('koa-router');
const jwt = require('jsonwebtoken');

const router = new KoaRouter();

async function loadSector(ctx, next) {
  ctx.state.sector = await ctx.orm.sector.findByPk(ctx.params.id);
  return next();
}

async function loadSectorFood(ctx, next) {
  ctx.state.sectorfood = await ctx.orm.sectorfood.findOne({
    attributes: ['id', 'foodId', 'sectorId', 'price'],
    where: {
      id: ctx.params.sectorfoodid,
    },
  });
  return next();
}

router.get('sectors.list', '/', async (ctx) => {
  const sectorsList = await ctx.orm.sector.findAll();

  switch (ctx.accepts(['json', 'html'])) {
    case 'json':
      ctx.body = sectorsList;
      break;
    case 'html':
      await ctx.render('sectors/index', {
        sectorsList,
        newSectorPath: ctx.router.url('sectors.new'),
        editSectorPath: (sector) => ctx.router.url('sectors.edit', { id: sector.id }),
        deleteSectorPath: (sector) => ctx.router.url('sectors.delete', { id: sector.id }),
        showSectorPath: (sector) => ctx.router.url('sectors.show', { id: sector.id }),
      });
      break;
    default:
      break;
  }
});

router.get('sectors.show', '/:id/show', loadSector, async (ctx) => {
  const { sector } = ctx.state;
  const foodsList = await sector.getFood({ joinTableAttributes: ['price', 'id'] });
  await ctx.render('sectors/show', {
    sector,
    foodsList,
    editSectorFoodPath: (sectorfood) => ctx.router.url('sectors.editfood',
      { sectorfoodid: sectorfood.id }),
    newSectorFoodPath: (newsector) => ctx.router.url('sectors.newfood',
      { id: newsector.id }),
    editSectorPath: ctx.router.url('sectors.edit', { id: sector.id }),
    deleteSectorPath: ctx.router.url('sectors.delete', { id: sector.id }),
  });
});

router.get('sectors.new', '/new', async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user) {
    ctx.redirect('/');
    return;
  }
  const sector = ctx.orm.sector.build();
  await ctx.render('sectors/new', {
    sector,
    submitSectorPath: ctx.router.url('sectors.create'),
  });
});

router.post('sectors.create', '/', async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user) {
    ctx.redirect('/');
    return;
  }
  const sector = ctx.orm.sector.build(ctx.request.body);
  try {
    await sector.save({ fields: ['name', 'latitude', 'longitude'] });
    ctx.redirect(ctx.router.url('sectors.list'));
  } catch (validationError) {
    await ctx.render('sectors/new', {
      sector,
      errors: validationError.errors,
      submitSectorPath: ctx.router.url('sectors.create'),
    });
  }
});

router.get('sectors.edit', '/:id/edit', loadSector, async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user) {
    ctx.redirect('/');
    return;
  }
  const { sector } = ctx.state;
  await ctx.render('sectors/edit', {
    sector,
    submitSectorPath: ctx.router.url('sectors.update', { id: sector.id }),
  });
});

router.patch('sectors.update', '/:id', loadSector, async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user) {
    ctx.redirect('/');
    return;
  }
  const { sector } = ctx.state;
  try {
    const { name, latitude, longitude } = ctx.request.body;
    await sector.update({ name, latitude, longitude });
    ctx.redirect(ctx.router.url('sectors.list'));
  } catch (validationError) {
    await ctx.render('sectors/edit', {
      sector,
      errors: validationError.errors,
      submitSectorPath: ctx.router.url('sectors.update', { id: sector.id }),
    });
  }
});

router.del('sectors.delete', '/:id', loadSector, async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user) {
    ctx.redirect('/');
    return;
  }
  const { sector } = ctx.state;
  await sector.destroy();
  ctx.redirect(ctx.router.url('sectors.list'));
});

router.get('sectors.newfood', '/:id/newfood', loadSector, async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user) {
    ctx.redirect('/');
    return;
  }
  const { sector } = ctx.state;
  const sectorfood = ctx.orm.sectorfood.build();
  const foodsList = await ctx.orm.food.findAll();
  await ctx.render('sectors/newfood', {
    sectorfood,
    foodsList,
    submitSectorPath: ctx.router.url('sectors.createfood', { id: sector.id }),
  });
});

router.post('sectors.createfood', '/:id', loadSector, async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user) {
    ctx.redirect('/');
    return;
  }
  const { sector } = ctx.state;
  const sectorfood = ctx.orm.sectorfood.build();
  const foodsList = await ctx.orm.food.findAll();
  const foods = JSON.stringify(ctx.request.body.foods);
  const foodsParsed = JSON.parse(foods);
  try {
    sectorfood.sectorId = sector.id;
    sectorfood.foodId = foodsParsed;
    sectorfood.price = ctx.request.body.price;
    await sectorfood.save({ fields: ['price', 'foodId', 'sectorId'] });
    ctx.redirect(ctx.router.url('sectors.show', { id: sector.id }));
  } catch (validationError) {
    await ctx.render('sectors/newfood', {
      sectorfood,
      foodsList,
      errors: validationError.errors,
      submitSectorPath: ctx.router.url('sectors.createfood', { id: sector.id }),
    });
  }
});

router.get('sectors.editfood', '/:sectorfoodid/editfood', loadSectorFood, async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user) {
    ctx.redirect('/');
    return;
  }
  const { sectorfood } = ctx.state;
  const foodsList = await ctx.orm.food.findAll();
  await ctx.render('sectors/editfood', {
    sectorfood,
    foodsList,
    submitSectorPath: ctx.router.url('sectors.updatefood', { sectorfoodid: sectorfood.id }),
  });
});

router.patch('sectors.updatefood', '/:sectorfoodid/patchfood', loadSectorFood, async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user) {
    ctx.redirect('/');
    return;
  }
  const { sectorfood } = ctx.state;
  const foodsList = await ctx.orm.food.findAll();
  try {
    const { price } = ctx.request.body;
    await sectorfood.update({ price });
    ctx.redirect(ctx.router.url('sectors.show', { id: sectorfood.sectorId }));
  } catch (validationError) {
    await ctx.render('sectors/editfood', {
      sectorfood,
      foodsList,
      errors: validationError.errors,
      submitSectorPath: ctx.router.url('sectors.updatefood', { sectorfoodid: sectorfood.id }),
    });
  }
});

module.exports = router;
