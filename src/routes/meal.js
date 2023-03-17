const KoaRouter = require('koa-router');
const aws = require('aws-sdk');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const router = new KoaRouter();

async function loadMeal(ctx, next) {
  ctx.state.meal = await ctx.orm.meal.findByPk(ctx.params.id);
  return next();
}

const uploadFile = async ({ fileName, filePath, fileType, id }) => new Promise((resolve, reject) => {
  aws.config.update({
    region: 'sa-east-1',
    // You'll need your service's access keys here
    accessKeyId: process.env.AWS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET,
  });

  const s3 = new aws.S3({
    apiVersion: '2006-03-01',
    // If you want to specify a different endpoint, such as using DigitalOcean spaces
    // endpoint: new aws.Endpoint("nyc3.digitaloceanspaces.com"),
  });

  const stream = fs.createReadStream(filePath);
  stream.on('error', (err) => {
    reject(err);
  });

  s3.upload(
    {
      ACL: 'public-read',
      // You'll input your bucket name here
      Bucket: process.env.AWS_BUCKET,
      Body: stream,
      Key: `meal/${id}/${fileName}`,
      ContentType: fileType,
    },
    (err, data) => {
      if (err) {
        reject(err);
      } else if (data) {
        resolve({ key: data.Key, url: data.Location });
      }
    },
  );
});

router.get('meals.list', '/', async (ctx) => {
  const mealsList = await ctx.orm.meal.findAll();

  switch (ctx.accepts(['json', 'html'])) {
    case 'json':
      ctx.body = mealsList;
      break;
    case 'html':
      await ctx.render('meals/index', {
        mealsList,
        newMealPath: ctx.router.url('meals.new'),
        editMealPath: (meal) => ctx.router.url('meals.edit', { id: meal.id }),
        deleteMealPath: (meal) => ctx.router.url('meals.delete', { id: meal.id }),
        showMealPath: (meal) => ctx.router.url('meals.show', { id: meal.id }),
      });
      break;
    default:
      break;
  }
});

router.get('meals.show', '/show/:id', loadMeal, async (ctx) => {
  const { meal } = ctx.state;
  const foodsList = await meal.getFood();
  await ctx.render('meals/show', {
    meal,
    foodsList,
    editMealPath: (meal) => ctx.router.url('meals.edit', { id: meal.id }),
    deleteMealPath: (meal) => ctx.router.url('meals.delete', { id: meal.id }),
  });
});


router.get('meals.new', '/new', async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user) {
    ctx.redirect('/');
    return;
  }
  const meal = ctx.orm.meal.build();
  const foodsList = await ctx.orm.food.findAll();
  const mealFood = [];
  await ctx.render('meals/new', {
    meal,
    foodsList,
    mealFood,
    submitMealPath: ctx.router.url('meals.create'),
  });
});

router.post('meals.create', '/', async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user) {
    ctx.redirect('/');
    return;
  }
  const meal = ctx.orm.meal.build(ctx.request.body);
  const file = ctx.request.files.image;
  const foodsList = await ctx.orm.food.findAll();
  const foods = JSON.stringify(ctx.request.body.foods.split(','));
  let foodsParsed = JSON.parse(foods);
  if (!Array.isArray(foodsParsed)) {
    foodsParsed = [foodsParsed];
  }
  try {
    await meal.save();
    if (file.name) {
      const { key, url } = await uploadFile({
        fileName: file.name,
        filePath: file.path,
        fileType: file.type,
        id: meal.id,
      });
      meal.image = url;
    } else {
      const mealImagePath = 'comida1.jpeg';
      meal.image = `/assets/${mealImagePath}`;
    }
    await meal.save();
    foodsParsed.forEach(async (element) => {
      const food = await ctx.orm.food.findByPk(element);
      await meal.addFood(food);
    });
    ctx.redirect(ctx.router.url('meals.list'));
  } catch (validationError) {
    return validationError.errors;
    /*
    await ctx.render('meals/new', {
      meal,
      foodsList,
      errors: validationError.errors,
      submitMealPath: ctx.router.url('meals.create'),
    }); */
  }
});


router.get('meals.edit', '/:id/edit', loadMeal, async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user) {
    ctx.redirect('/');
    return;
  }
  const { meal } = ctx.state;
  const foodsList = await ctx.orm.food.findAll();
  const mealFood = await meal.getFood();
  await ctx.render('meals/edit', {
    meal,
    foodsList,
    mealFood,
    submitMealPath: ctx.router.url('meals.update', { id: meal.id }),
  });
});

router.patch('meals.update', '/:id', loadMeal, async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user) {
    ctx.redirect('/');
    return;
  }
  const { meal } = ctx.state;
  const foodmealList = await ctx.orm.foodmeal.findAll({
    where: {
      mealId: meal.id,
    },
  });
  foodmealList.forEach(async (element) => {
    await element.destroy();
  });
  const foods = JSON.stringify(ctx.request.body.foods.split(','));
  let foodsParsed = JSON.parse(foods);
  if (!Array.isArray(foodsParsed)) {
    foodsParsed = [foodsParsed];
  }
  try {
    const { name, recipe_description} = ctx.request.body;
    const file = ctx.request.files.image;
    let { image } = meal;
    if (file.name) {
      const { key, url } = await uploadFile({
        fileName: file.name,
        filePath: file.path,
        fileType: file.type,
        id: meal.id,
      });
      image = url;
    }
    await meal.update({ name, recipe_description, image });
    foodsParsed.forEach(async (element) => {
      const food = await ctx.orm.food.findByPk(element);
      await meal.addFood(food);
    });
    await meal.save();
    ctx.redirect(ctx.router.url('meals.show', { id: meal.id }));
  } catch (validationError) {
    return validationError.errors;
    /*
    await ctx.render('meals/edit', {
      meal,
      foodsList,
      mealFood,
      errors: validationError.errors,
      submitMealPath: ctx.router.url('meals.update', { id: meal.id }),
    });
    */
  }
});

router.del('meals.delete', '/:id', loadMeal, async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user) {
    ctx.redirect('/');
    return;
  }
  const { meal } = ctx.state;
  await meal.destroy();
  ctx.redirect(ctx.router.url('meals.list'));
});

module.exports = router;
