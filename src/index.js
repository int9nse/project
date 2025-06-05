import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';                   // Для создания http Server
import { initSocket } from './socket.js'; // Функция инициализации Socket.IO
import { ensureDefaultUsers } from './seed/defaultUsers.js';


import authRoutes       from './routes/auth.js';
import lessonRoutes     from './routes/lessons.js';
import materialRoutes   from './routes/materials.js';
import learningChat     from './routes/learningChat.js';
import adminChatsRoutes from './routes/adminChats.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Маршруты
app.use('/api/auth',      authRoutes);
app.use('/api/lessons',   lessonRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/learning/chat', learningChat);
app.use('/api/admin/chats', adminChatsRoutes);

// Создаём HTTP сервер и «вкатываем» на него Socket.IO
const server = http.createServer(app);
initSocket(server);

// Подключение к MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser:    true,
    useUnifiedTopology: true
  })
  .then(async () => {
    console.log('✅ MongoDB connected');

    // ← здесь вызываем скрипт, который создаёт дефолтных пользователей
    await ensureDefaultUsers();
    console.log('✅ ensureDefaultUsers() completed');

    // Только после этого запускаем HTTP-сервер
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));
