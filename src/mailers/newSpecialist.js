module.exports = function sendExampleEmail(ctx, data) {
  // you can get all the additional data needed by using the provided one plus ctx
  return ctx.sendMail('new-specialist', { to: data.userSpecialist.dataValues.email, subject: 'Especialista Nutricheap' }, { data });
};
