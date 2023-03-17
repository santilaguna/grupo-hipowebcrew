const KoaRouter = require('koa-router');
const jwt = require('jsonwebtoken');
const yup = require('yup');

const router = new KoaRouter();

async function loadSector(ctx, next) {
  try {
    ctx.state.sector = await ctx.orm.sector.findByPk(ctx.params.id);
  } catch (err) { ctx.throw(400, 'id sector no existe'); }
  if (ctx.state.sector === null) { ctx.throw(400, 'id sector no existe'); }
  return next();
}

router.get('api.sectors.list', '/', async (ctx) => {
  const sectorsList = await ctx.orm.sector.findAll();
  ctx.body = ctx.jsonSerializer('sectors', {
    attributes: ['name', 'latitude', 'longitude'],
    topLevelLinks: {
      self: `${ctx.origin}${ctx.router.url('api.sectors.list')}`,
    },
    dataLinks: {
      self: (dataset, sector) => `${ctx.origin}/api/sectors/${sector.id}`,
    },
  }).serialize(sectorsList);
});

router.get('api.sectors.show', '/:id', loadSector, async (ctx) => {
  const { sector } = ctx.state;
  ctx.body = ctx.jsonSerializer('sector', {
    attributes: ['name', 'latitude', 'longitude'],
    topLevelLinks: {
      self: `${ctx.origin}${ctx.router.url('api.sectors.list')}${sector.id}`,
    },
  }).serialize(sector);
});

const schema = yup.object().shape({
  name: yup.string()
    .required('Debes ingresar un nombre')
    .min(3, 'largo mínimo es 3')
    .max(255, 'largo máximo es 255'),
  latitude: yup.number()
    .required('Debes ingresar la latitud')
    .min(-90.0, 'mínimo -90')
    .max(90.0, 'máximo 90'),
  longitude: yup.number()
    .required('Debes ingresar la longitud')
    .min(-180.0, 'mínimo -180')
    .max(180.0, 'máximo 180'),
});

router.post('api.sectors.create', '/', async (ctx) => {
  try {
    const user = ctx.headers.authorization && await ctx.orm.user.findByPk(jwt.verify(ctx.headers.authorization, 'shhhhh').userId);
    if (!user) { ctx.throw(401, 'debe ingresar token de usuario'); }
  } catch (err) { ctx.throw(401, 'token de usuario incorrecta'); }

  if (!schema.isValidSync(ctx.request.body)) {
    await schema.validate(ctx.request.body).catch(
      (error) => ctx.throw(415, `Wrong data: ${error.errors}`),
    );
  }

  const sector = ctx.orm.sector.build(ctx.request.body);
  try {
    await sector.save({ fields: ['name', 'latitude', 'longitude'] });
    ctx.body = ctx.jsonSerializer('sector', {
      attributes: ['name', 'latitude', 'longitude'],
      topLevelLinks: {
        self: `${ctx.origin}${ctx.router.url('api.sectors.list')}${sector.id}`,
      },
    }).serialize(sector);
  } catch (validationError) {
    ctx.throw(415, 'Wrong data types');
  }
});

router.patch('api.sectors.update', '/:id', loadSector, async (ctx) => {
  try {
    const user = ctx.headers.authorization && await ctx.orm.user.findByPk(jwt.verify(ctx.headers.authorization, 'shhhhh').userId);
    if (!user) { ctx.throw(401, 'debe ingresar token de usuario'); }
  } catch (err) { ctx.throw(401, 'token de usuario incorrecta'); }

  if (!schema.isValidSync(ctx.request.body)) {
    await schema.validate(ctx.request.body).catch(
      (error) => ctx.throw(415, `Wrong data: ${error.errors}`),
    );
  }

  const { sector } = ctx.state;
  try {
    const { name, latitude, longitude } = ctx.request.body;
    await sector.update({ name, latitude, longitude });
    ctx.body = ctx.jsonSerializer('sector', {
      attributes: ['name', 'latitude', 'longitude'],
      topLevelLinks: {
        self: `${ctx.origin}${ctx.router.url('api.sectors.list')}${sector.id}`,
      },
    }).serialize(sector);
  } catch (validationError) {
    ctx.throw(415, 'Wrong data types');
  }
});

router.del('api.sectors.delete', '/:id', loadSector, async (ctx) => {
  try {
    const user = ctx.headers.authorization && await ctx.orm.user.findByPk(jwt.verify(ctx.headers.authorization, 'shhhhh').userId);
    if (!user) { ctx.throw(401, 'debe ingresar token de usuario'); }
  } catch (err) { ctx.throw(401, 'token de usuario incorrecta'); }

  const { sector } = ctx.state;
  await sector.destroy();
  ctx.body = { status: 200, sector, message: 'Sector Deleted' };
});

module.exports = router;
