const yup = require('yup');
const KoaRouter = require('koa-router');
const aws = require('aws-sdk');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const router = new KoaRouter();

async function loadFood(ctx, next) {
  try {
    ctx.state.food = await ctx.orm.food.findByPk(ctx.params.id);
  } catch (err) { ctx.throw(400, 'id ingresado no es válido'); }
  if (ctx.state.food === null) { ctx.throw(400, 'id comida no existe'); }
  return next();
}

const uploadFile = async (
  {
    fileName, filePath, fileType, id,
  },
) => new Promise((resolve, reject) => {
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

router.get('api.foods.list', '/', async (ctx) => {
  const foodsList = await ctx.orm.food.findAll();
  ctx.body = ctx.jsonSerializer('foods', {
    attributes: ['name', 'image', 'calories', 'fat',
      'cholesterol', 'sodium', 'carbohydrate',
      'protein', 'category'],
    topLevelLinks: {
      self: `${ctx.origin}${ctx.router.url('api.foods.list')}`,
    },
    dataLinks: {
      self: (dataset, food) => `${ctx.origin}/api/foods/${food.id}`,
    },
  }).serialize(foodsList);
});


router.get('api.foods.show', '/:id', loadFood, async (ctx) => {
  const { food } = ctx.state;
  ctx.body = ctx.jsonSerializer('food', {
    attributes: ['name', 'image', 'calories', 'fat',
      'cholesterol', 'sodium', 'carbohydrate',
      'protein', 'category'],
    topLevelLinks: {
      self: `${ctx.origin}${ctx.router.url('api.foods.list')}${food.id}`,
    },
  }).serialize(food);
});


const schema = yup.object().shape({
  name: yup.string()
    .required('Debes ingresar un nombre')
    .min(3, 'largo mínimo es 3')
    .max(255, 'largo máximo es 255'),
  category: yup.string()
    .required('Debes ingresar una categoria')
    .matches(/(^Leche y derivados$|^Carnes$|^Verduras$|^Frutas$)/, 'Categoría no está entre las opciones')
    .min(3, 'largo mínimo es 3')
    .max(255, 'largo máximo es 255'),
  calories: yup.number()
    .required('Debes ingresar las calorias')
    .min(0, 'mínimo 0')
    .max(5000, 'máximo 5000'),
  fat: yup.number()
    .required('Debes ingresar las calorias')
    .min(0, 'mínimo 0')
    .max(5000, 'máximo 5000'),
  cholesterol: yup.number()
    .required('Debes ingresar las calorias')
    .min(0, 'mínimo 0')
    .max(5000, 'máximo 5000'),
  sodium: yup.number()
    .required('Debes ingresar las calorias')
    .min(0, 'mínimo 0')
    .max(5000, 'máximo 5000'),
  carbohydrate: yup.number()
    .required('Debes ingresar las calorias')
    .min(0, 'mínimo 0')
    .max(5000, 'máximo 5000'),
  protein: yup.number()
    .required('Debes ingresar las calorias')
    .min(0, 'mínimo 0')
    .max(5000, 'máximo 5000'),
});

router.post('api.foods.create', '/', async (ctx) => {
  try {
    const user = ctx.headers.authorization && await ctx.orm.user.findByPk(jwt.verify(ctx.headers.authorization, 'shhhhh').userId);
    if (!user) { ctx.throw(401, 'debe ingresar token de usuario'); }
  } catch (err) { ctx.throw(401, 'token de usuario incorrecta'); }

  if (!schema.isValidSync(ctx.request.body)) {
    await schema.validate(ctx.request.body).catch(
      (error) => ctx.throw(415, `Wrong data: ${error.errors}`),
    );
  }
  const food = ctx.orm.food.build(ctx.request.body);
  try {
    await food.save({
      fields: ['name', 'image', 'calories', 'fat', 'cholesterol', 'sodium',
        'carbohydrate', 'protein', 'category'],
    });
    const file = ctx.request.files.image;
    if (file !== undefined) {
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
    ctx.body = { status: 200, food };
  } catch (validationError) {
    ctx.throw(415, 'Wrong data types');
  }
});


router.patch('api.foods.update', '/:id', loadFood, async (ctx) => {
  try {
    const user = ctx.headers.authorization && await ctx.orm.user.findByPk(jwt.verify(ctx.headers.authorization, 'shhhhh').userId);
    if (!user) { ctx.throw(401, 'debe ingresar token de usuario'); }
  } catch (err) { ctx.throw(401, 'token de usuario incorrecta'); }

  if (!schema.isValidSync(ctx.request.body)) {
    await schema.validate(ctx.request.body).catch(
      (error) => ctx.throw(415, `Wrong data: ${error.errors}`),
    );
  }
  const { food } = ctx.state;
  try {
    const {
      name, calories, fat, cholesterol, sodium, carbohydrate, protein, category,
    } = ctx.request.body;
    const file = ctx.request.files.image;
    let { image } = food;
    if (file !== undefined) {
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
    ctx.body = { status: 200, food };
  } catch (validationError) {
    ctx.throw(415, 'Wrong data types - Database error');
  }
});

router.del('api.foods.delete', '/:id', loadFood, async (ctx) => {
  try {
    const user = ctx.headers.authorization && await ctx.orm.user.findByPk(jwt.verify(ctx.headers.authorization, 'shhhhh').userId);
    if (!user) { ctx.throw(401, 'debe ingresar token de usuario'); }
  } catch (err) { ctx.throw(401, 'token de usuario incorrecta'); }

  const { food } = ctx.state;
  await food.destroy();
  ctx.body = { status: 200, food, message: 'food deleted' };
});

module.exports = router;
