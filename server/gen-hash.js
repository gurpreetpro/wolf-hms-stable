const bcrypt = require('bcryptjs');
const password = 'admin123';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, function(err, hash) {
  if (err) {
      console.error(err);
  } else {
      console.log('HASH:', hash);
  }
});
