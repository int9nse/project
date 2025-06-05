import express from 'express';
import { Chat } from '../models/Chat.js';
import { User } from '../models/User.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/admin/chats?email=...
 * Возвращает историю чата для пользователя с указанным email.
 * Только для админов (middleware auth проверяет роль).
 */
router.get('/', auth('admin'), async (req, res) => {
  try {
    const { email } = req.query;
    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email required' });
    }
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const chats = await Chat.find({ userId: user._id }).sort({ updatedAt: -1 });
    // Собираем сообщения по урокам
    const result = chats.map(c => ({
      lessonId: c.lessonId,
      messages: c.messages
    }));
    return res.json(result);
  } catch (err) {
    console.error('GET /api/admin/chats error:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
