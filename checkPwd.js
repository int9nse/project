import bcrypt from 'bcrypt';

const hashFromDb = '$2b$10$B9UXSoFu7vTSTvWJbN1FQOcbG/T8N74rl0rWmqQebitb2nzt8BLGO'; // ваш хеш из базы
const plain = 'spring2025';                         // тот пароль, который вы вводите

bcrypt.compare(plain, hashFromDb)
  .then(ok => console.log('Match?', ok))
  .catch(err => console.error(err));
