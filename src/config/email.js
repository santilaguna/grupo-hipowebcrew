const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

module.exports = {
  provider: {
    // your provider name directly or from ENV var
    service: 'SendGrid',
    // auth data always from ENV vars
    auth: {
      user: process.env.SENDGRID_USER,
      pass: process.env.SENDGRID_PASS,
    },
  },
  // defaults to be passed to nodemailer's emails
  defaults: {
    from: 'Nutri-cheap <nutricheap@gmail.com>',
  },
};
