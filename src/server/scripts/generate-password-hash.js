const bcrypt = require('bcrypt');

// Default password - this should be changed in production
const password = 'admin123';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    return;
  }
  console.log('Generated hash:', hash);
}); 