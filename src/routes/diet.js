/* eslint-disable no-await-in-loop */
const KoaRouter = require('koa-router');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');

const router = new KoaRouter();

async function loadDiet(ctx, next) {
  ctx.state.diet = await ctx.orm.diet.findByPk(ctx.params.id);
  return next();
}

router.get('diets.list', '/', async (ctx) => {
  const dietsList = await ctx.orm.diet.findAll();
  const images = [];
  const userNames = [];
  for (let i = 0; i < dietsList.length; i += 1) {
    const meal = await ctx.orm.meal.findByPk(dietsList[i].meals[0].meals[0]);
    const user = await ctx.orm.user.findByPk(dietsList[i].userId);
    try { images.push(meal.image); } catch (err) { images.push('/assets/comida1.jpeg'); }
    try { userNames.push(user.username); } catch (err) { userNames.push('Anon'); }
  }
  switch (ctx.accepts(['json', 'html'])) {
    case 'json':
      ctx.body = dietsList;
      break;
    case 'html':
      await ctx.render('diets/index', {
        dietsList,
        newDietPath: ctx.router.url('diets.new'),
        showDietPath: (diet) => ctx.router.url('diets.show', { id: diet.id }),
        imageRep: images,
        userNames,
      });
      break;
    default:
      break;
  }
});

router.get('diets.show', '/show/:id', loadDiet, async (ctx) => {
  const { diet } = ctx.state;
  const mealsList = [];
  let price = 0;
  for (let i = 0; i < diet.meals.length; i += 1) {
    const meals = await ctx.orm.meal.findAll({
      where: {
        id: {
          [Op.or]: diet.meals[i].meals,
        },
      },
    });
    const obj = { name: diet.meals[i].name, meals, time: diet.meals[i].time };
    mealsList.push(obj);

    for (let j = 0; j < meals.length; j += 1) {
      price += await meals[j].getPrice;
    }
  }
  const user = await diet.getUser();
  await ctx.render('diets/show', {
    diet,
    mealsList,
    user,
    price,
    editDietPath: (diet) => ctx.router.url('diets.edit', { id: diet.id }),
    deleteDietPath: (diet) => ctx.router.url('diets.delete', { id: diet.id }),
  });
});

router.get('diets.new', '/new', async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user) {
    ctx.redirect('/');
    return;
  }
  const diet = ctx.orm.diet.build();
  const mealsList = await ctx.orm.meal.findAll();
  await ctx.render('diets/new', {
    diet,
    mealsList,
    submitDietPath: ctx.router.url('diets.create'),
  });
});

router.post('diets.create', '/', async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user) {
    ctx.redirect('/');
    return;
  }
  const diet = ctx.orm.diet.build();
  diet.name = ctx.request.body.name;
  diet.weeks = ctx.request.body.weeks;
  diet.observation = ctx.request.body.observation;
  const dietMealsList = [];
  const mealsIds = ctx.request.body.mealsIds.split(',');
  for (let i = 0; i < ctx.request.body.member; i += 1) {
    const bigmeal = { name: ctx.request.body[`name meal${i}`], time: ctx.request.body[`time${i}`] };
    let mealsParsed = mealsIds[i];
    if (!Array.isArray(mealsParsed)) {
      mealsParsed = [mealsParsed];
    }
    bigmeal.meals = mealsParsed;
    dietMealsList.push(bigmeal);
  }
  diet.meals = dietMealsList;
  try {
    await diet.save();
    const diets = await user.getDiets();
    diets.push(diet);
    user.setDiets(diets);
    ctx.redirect(ctx.router.url('diets.list'));
  } catch (validationError) {
    /* await ctx.render('diets/new', {
      diet,
      mealsList,
      errors: validationError.errors,
      submitDietPath: ctx.router.url('diets.create'),
    }); */
  }
});

router.get('diets.edit', '/:id/edit', loadDiet, async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user) {
    ctx.redirect('/');
    return;
  }
  const { diet } = ctx.state;
  const mealsList = await ctx.orm.meal.findAll();
  await ctx.render('diets/edit', {
    diet,
    mealsList,
    submitDietPath: ctx.router.url('diets.update', { id: diet.id }),
  });
});

router.patch('diets.update', '/:id', loadDiet, async (ctx) => {
  console.log(ctx.request.body);
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user) {
    ctx.redirect('/');
    return;
  }
  const { diet } = ctx.state;
  try {
    const dietmealList = diet.meals;
    dietmealList.forEach(async (element) => {
      element.meals = [];
    });
    diet.name = ctx.request.body.name;
    diet.weeks = ctx.request.body.weeks;
    diet.observation = ctx.request.body.observation;
    const mealsOfDiet = [];
    const mealsIds = ctx.request.body.mealsIds.split(',');
    for (let i = 0; i < dietmealList.length; i += 1) {
      console.log(ctx.request.body.meals);
      console.log(ctx.request.body.mealsIds);
      const bigmeal = { name: ctx.request.body[`name meal${i}`], time: ctx.request.body[`time${i}`] };
      let mealsParsed = mealsIds[i];
      if (!Array.isArray(mealsParsed)) {
        mealsParsed = [mealsParsed];
      }
      bigmeal.meals = mealsParsed;
      mealsOfDiet.push(bigmeal);
    }
    console.log(mealsOfDiet);
    diet.meals = mealsOfDiet;
    await diet.save();
    ctx.redirect(ctx.router.url('diets.list'));
  } catch (validationError) {
    /* await ctx.render('diets/edit', {
      diet,
      mealsList,
      errors: validationError.errors,
      submitDietPath: ctx.router.url('diets.update', { id: diet.id }),
    }); */
  }
});

router.del('diets.delete', '/:id', loadDiet, async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user) {
    ctx.redirect('/');
    return;
  }
  const { diet } = ctx.state;
  await diet.destroy();
  ctx.redirect(ctx.router.url('diets.list'));
});

module.exports = router;
