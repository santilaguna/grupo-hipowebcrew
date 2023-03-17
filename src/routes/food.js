const KoaRouter = require('koa-router');
const aws = require('aws-sdk');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });



const router = new KoaRouter();

async function loadFood(ctx, next) {
  ctx.state.food = await ctx.orm.food.findByPk(ctx.params.id);
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
      Key: `food/${id}/${fileName}`,
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

router.get('foods.list', '/', async (ctx) => {
  const foodsList = await ctx.orm.food.findAll();

  switch (ctx.accepts(['json', 'html'])) {
    case 'json':
      ctx.body = foodsList;
      break;
    case 'html':
      await ctx.render('foods/index', {
        foodsList,
        newFoodPath: ctx.router.url('foods.new'),
        editFoodPath: (food) => ctx.router.url('foods.edit', { id: food.id }),
        deleteFoodPath: (food) => ctx.router.url('foods.delete', { id: food.id }),
        showFoodPath: (food) => ctx.router.url('foods.show', { id: food.id }),
      });
      break;
    default:
      break;
  }
});

router.get('foods.show', '/:id/show', loadFood, async (ctx) => {
  const { food } = ctx.state;
  const mealsList = await food.getMeals();
  const sectorList = await food.getSectors({ joinTableAttributes: ['price', 'id'] });
  await ctx.render('foods/show', {
    food,
    mealsList,
    sectorList,
    showMealPath: (meal) => ctx.router.url('meals.show', { id: meal.id }),
    newPricePath: (food) => ctx.router.url('foods.newprice', {id: food.id}),
    editFoodPath: (food) => ctx.router.url('foods.edit', { id: food.id }),
    deleteFoodPath: (food) => ctx.router.url('foods.delete', { id: food.id }),
  });
});


router.get('foods.new', '/new', async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user) {
    ctx.redirect('/');
  }
  const food = ctx.orm.food.build();
  await ctx.render('foods/new', {
    food,
    submitFoodPath: ctx.router.url('foods.create'),
  });
});

router.post('foods.create', '/', async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user) {
    ctx.redirect('/');
    return;
  }
  const food = ctx.orm.food.build(ctx.request.body);
  try {
    await food.save({
      fields: ['name', 'image', 'calories', 'fat', 'cholesterol', 'sodium',
        'carbohydrate', 'protein', 'category'],
    });
    const file = ctx.request.files.image;
    if (file.name) {
      const { key, url } = await uploadFile({
        fileName: file.name,
        filePath: file.path,
        fileType: file.type,
        id: food.id,
      });
      food.image = url;
    } else {
      const foodImagePath = 'comida1.jpeg';
      food.image = `/assets/${foodImagePath}`;
    }
    await food.save();
    ctx.redirect(ctx.router.url('foods.list'));
  } catch (validationError) {
    await ctx.render('foods/new', {
      food,
      errors: validationError.errors,
      submitFoodPath: ctx.router.url('foods.create'),
    });
  }
});


router.get('foods.edit', '/:id/edit', loadFood, async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user) {
    ctx.redirect('/');
  }
  const { food } = ctx.state;
  await ctx.render('foods/edit', {
    food,
    submitFoodPath: ctx.router.url('foods.update', { id: food.id }),
  });
});

router.patch('foods.update', '/:id', loadFood, async (ctx) => {
  const { food } = ctx.state;
  try {
    const {
      name, calories, fat, cholesterol, sodium, carbohydrate, protein, category,
    } = ctx.request.body;
    const file = ctx.request.files.image;
    let { image } = food;
    if (file.name) {
      const { key, url } = await uploadFile({
        fileName: file.name,
        filePath: file.path,
        fileType: file.type,
        id: food.id,
      });
      image = url;
    }
    await food.update({
      name, image, calories, fat, cholesterol, sodium, carbohydrate, protein, category,
    });
    ctx.redirect(ctx.router.url('foods.show', { id: food.id }));
  } catch (validationError) {
    await ctx.render('foods/edit', {
      food,
      errors: validationError.errors,
      submitFoodPath: ctx.router.url('foods.update', { id: food.id }),
    });
  }
});

router.del('foods.delete', '/:id', loadFood, async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user) {
    ctx.redirect('/');
  } else {
    const { food } = ctx.state;
    await food.destroy();
    ctx.redirect(ctx.router.url('foods.list'));
  }
});

router.get('foods.newprice', '/:id/newprice', loadFood, async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user) {
    ctx.redirect('/');
  }
  const { food } = ctx.state;
  const sectorfood = ctx.orm.sectorfood.build();
  const sectorList = await ctx.orm.sector.findAll();
  await ctx.render('foods/newfoodprice', {
    sectorfood,
    sectorList,
    submitPricePath: ctx.router.url('foods.createprice', { id: food.id }),
  });
});

router.post('foods.createprice', '/:id', loadFood, async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user) {
    ctx.redirect('/');
  }
  const { food } = ctx.state;
  const sectorfood = ctx.orm.sectorfood.build();
  const sectorList = await ctx.orm.sector.findAll();
  const sector = JSON.stringify(ctx.request.body.sector);
  const sectorParsed = JSON.parse(sector);
  //console.log(sector);
  console.log(sectorParsed);
  try {
    sectorfood.sectorId = sectorParsed;
    sectorfood.foodId = food.id;
    sectorfood.price = ctx.request.body.price;
    await sectorfood.save({ fields: ['price', 'foodId', 'sectorId'] });
    ctx.redirect(ctx.router.url('foods.show', { id: food.id }));
  } catch (validationError) {
    console.log(validationError);
    await ctx.render('foods/newfoodprice', {
      sectorfood,
      sectorList,
      errors: validationError.errors,
      submitPricePath: ctx.router.url('foods.createprice', { id: food.id }),
    });
  }
});


module.exports = router;
