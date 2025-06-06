/**
 * seedUser.js
 * 
 * Простой скрипт для создания (seed) одного пользователя в базе MongoDB.
 * Использует те же модели и подключение, что и ваш основной сервер.
 * 
 * Перед запуском убедитесь, что у вас установлен NODE_ENV=MONGO_URI,
 * либо у вас есть файл .env с переменной MONGO_URI, указывающей на вашу Atlas-базу.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

// Импорт модели User (убедитесь, что путь корректен относительно seedUser.js)
import { User } from './src/models/User.js';

// Загружаем переменные из .env (где у вас прописано MONGO_URI)
dotenv.config();

// Проверяем, что MONGO_URI где-то есть
const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('❌ Ошибка: не найдена переменная окружения MONGO_URI.');
  console.error('   Создайте файл .env в корне бэкенда с содержимым:');
  console.error('     MONGO_URI=<ваш MongoDB connection string>');
  process.exit(1);
}

async function main() {
  try {
    // 1) Подключаемся к MongoDB
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Успешно подключились к MongoDB');

    // 2) Создаем нового пользователя (или проверяем, нет ли уже)
    const email = 'admin@example.com';   // <-- здесь поменяйте e-mail
    const name = 'Админ Тестовый';       // <-- здесь имя
    const passwordPlain = '123'; // <-- здесь пароль в открытом виде
    const role = 'admin';                // <-- роль: "admin" или "employee"

    // Проверяем, нет ли уже пользователя с таким e-mail
    const exists = await User.findOne({ email });
    if (exists) {
      console.log(`⚠️ Пользователь с email="${email}" уже существует (ID: ${exists._id}).`);
    } else {
      // Хешируем пароль
      const hash = await bcrypt.hash(passwordPlain, 10);

      // Создаем нового пользователя
      const newUser = await User.create({
        name,
        email,
        password: hash,
        role,            // будет "admin"
      });
      console.log('✅ Новый пользователь создан:');
      console.log(`   ID:    ${newUser._id}`);
      console.log(`   Name:  ${newUser.name}`);
      console.log(`   Email: ${newUser.email}`);
      console.log(`   Role:  ${newUser.role}`);
    }

    // Завершаем работу
    await mongoose.disconnect();
    console.log('🔒 Отключились от MongoDB. Завершаем процесс.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Ошибка при создании пользователя:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();
