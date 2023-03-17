const KoaRouter = require('koa-router');
const jwt = require('jsonwebtoken');
const aws = require('aws-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const router = new KoaRouter();

// disabled for testing purposes
const sendNewAccountAlertEmail = require('../mailers/newAccount');
const sendNewSpecialistAlertEmail = require('../mailers/newSpecialist');

async function loadSpecialist(ctx, next) {
  const specialist = await ctx.orm.specialist.findAll({ where: { id: ctx.params.id } });
  [ctx.state.specialist] = specialist;
  return next();
}

const uploadFile = async ({
  fileName, filePath, fileType, id, revision,
}) => new Promise((resolve, reject) => {
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
  
  if (!revision) {
    s3.upload(
      {
        ACL: 'public-read',
        // You'll input your bucket name here
        Bucket: process.env.AWS_BUCKET,
        Body: stream,
        Key: `perfil/${id}/${fileName}`,
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
  } else {
    s3.upload(
      {
        ACL: 'public-read',
        // You'll input your bucket name here
        Bucket: 'nutri-cheap',
        Body: stream,
        Key: `revision/${id}/${fileName}`,
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
  }
});


router.get('users.new', '/new', async (ctx) => {
  const user = ctx.orm.user.build();
  await ctx.render('users/new', {
    user,
    submitUserPath: ctx.router.url('users.create'),
    notice: ctx.flashMessage.notice,
  });
});

router.post('users.create', '/', async (ctx) => {
  const user = ctx.orm.user.build(ctx.request.body);
  user.role = 'common';
  const file = ctx.request.files.image;
  const { email } = ctx.request.body;
  const searchUser = await ctx.orm.user.findOne({ where: { email } });
  if (searchUser !== null) {
    return ctx.render('users/new', {
      user,
      submitUserPath: ctx.router.url('users.create'),
      error: 'Este email ya esta ocupado',
    });
  }
  await sendNewAccountAlertEmail(ctx, { user });
  await user.save();
  if (file.name) {
    const { key, url } = await uploadFile({
      fileName: file.name,
      filePath: file.path,
      fileType: file.type,
      id: user.id,
    });
    user.image = url;
  } else {
    const userImagePath = 'default-profile.jpg';
    user.image = `/assets/${userImagePath}`;
  }
  await user.save();
  const token = jwt.sign({ userId: user.id }, 'shhhhh');
  ctx.session.token = token;
  return ctx.redirect('/');
});

router.get('users.edit', '/edit', async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  await ctx.render('users/edit', {
    user,
    submitUserPath: ctx.router.url('users.update'),
  });
});

router.delete('users.destroy', '/', (ctx) => {
  ctx.session = null;
  ctx.redirect(ctx.router.url('users.new'));
});

router.patch('users.update', '/', async (ctx) => {
  const { username, password } = ctx.request.body;
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  const file = ctx.request.files.image;
  if (file.name) {
    const { key, url } = await uploadFile({
      fileName: file.name,
      filePath: file.path,
      fileType: file.type,
      id: user.id,
    });
    user.image = url;
  }
  user.username = username;
  user.password = password;
  await user.save();
  return ctx.redirect('/');
});

router.get('users.newlogin', '/newlogin', (ctx) => ctx.render('users/newlogin', {
  logINPath: ctx.router.url('users.login'),
  notice: ctx.flashMessage.notice,
}));

router.put('users.login', '/', async (ctx) => {
  const { email, password } = ctx.request.body;
  const user = await ctx.orm.user.findOne({ where: { email } });
  const isPasswordCorrect = user && await user.checkPassword(password);
  if (isPasswordCorrect) {
    const token = jwt.sign({ userId: user.id }, 'shhhhh');
    ctx.session.token = token;
    return ctx.redirect('/');
  }
  return ctx.render('users/newlogin', {
    email,
    logINPath: ctx.router.url('users.login'),
    error: 'Incorrect mail or password',
  });
});

router.get('users.newspecialist', '/newspecialist', async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user) {
    ctx.redirect('/');
    return;
  }
  const specialist = ctx.orm.specialist.build();
  await ctx.render('users/newspecialist', {
    specialist,
    submitUserPath: ctx.router.url('users.createspecialist'),
    notice: ctx.flashMessage.notice,
  });
});

router.post('users.createspecialist', '/createspecialist', async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user) {
    ctx.redirect('/');
    return;
  }
  const specialist = ctx.orm.specialist.build(ctx.request.body);
  const file = ctx.request.files.document;
  const { key, url } = await uploadFile({
    fileName: file.name,
    filePath: file.path,
    fileType: file.type,
    id: user.id,
    revision: true,
  });
  specialist.document = url;
  specialist.userId = user.id;
  specialist.status = 'revision';
  user.role = 'revision';
  try {
    await specialist.save({ fields: ['userId', 'profession', 'document', 'status'] });
    user.save();
    ctx.redirect('/');
  } catch (validationError) {
    await ctx.render('users/newspecialist', {
      specialist,
      errors: validationError.errors,
      submitUserPath: ctx.router.url('users.createspecialist'),
    });
  }
});

router.get('users.revisionlist', '/revisionlist', async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user || user.role !== 'specialist') {
    ctx.redirect('/');
    return;
  }
  const users = await ctx.orm.user.findAll({ where: { role: 'revision' } });
  const usersList = [];
  for (let i = 0; i < users.length; i += 1) {
    const userwithDocument = {};
    userwithDocument.username = users[i].username;
    userwithDocument.email = users[i].email;
    const userDocument = await ctx.orm.specialist.findAll({ where: { userId: users[i].id } });
    userwithDocument.document = userDocument[0].document;
    userwithDocument.profession = userDocument[0].profession;
    userwithDocument.id = userDocument[0].id;
    usersList.push(userwithDocument);
  }

  switch (ctx.accepts(['json', 'html'])) {
    case 'json':
      ctx.body = usersList;
      break;
    case 'html':
      await ctx.render('users/revision', {
        usersList,
        acceptSpecialistPath: (user) => ctx.router.url('users.acceptrevision', { id: user.id }),
      });
      break;
    default:
      break;
  }
});

router.post('users.acceptrevision', '/:id/accept', loadSpecialist, async (ctx) => {
  const user = ctx.session.token && await ctx.orm.user.findByPk(jwt.verify(ctx.session.token, 'shhhhh').userId);
  if (!user || user.role !== 'specialist') {
    ctx.redirect('/');
    return;
  }
  const { specialist } = ctx.state;
  const [userSpecialist] = await ctx.orm.user.findAll({ where: { id: specialist.userId } });
  try {
    specialist.status = 'specialist';
    userSpecialist.role = 'specialist';
    specialist.save();
    userSpecialist.save();
    await sendNewSpecialistAlertEmail(ctx, { userSpecialist });
    ctx.redirect(ctx.router.url('users.revisionlist'));
  } catch (validationError) {
    const users = await ctx.orm.user.findAll({ where: { role: 'revision' } });
    const usersList = [];
    for (let i = 0; i < users.length; i += 1) {
      const userwithDocument = {};
      userwithDocument.username = users[i].username;
      userwithDocument.email = users[i].email;
      const userDocument = await ctx.orm.specialist.findAll({ where: { userId: users[i].id } });
      userwithDocument.document = userDocument[0].document;
      userwithDocument.profession = userDocument[0].profession;
      usersList.push(userwithDocument);
    }
    await ctx.render('users/revision', {
      usersList,
      errors: validationError.errors,
    });
  }
});

module.exports = router;
