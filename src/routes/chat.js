import express from 'express';
import { Chat } from '../models/Chat.js';
import { auth } from '../middleware/auth.js';

const r = express.Router();

/**
 * POST /api/chat/message
 * Тело: { role, content, lessonId }
 * Сохраняет одно сообщение (user/assistant) в истории по userId+lessonId
 */
r.post('/message', auth(), async (req, res) => {
  const { role, content, lessonId } = req.body;
  const uid = req.user.id;

  const chat = await Chat.findOneAndUpdate(
    { userId: uid, lessonId },
    {
      $push: { messages: { role, content, ts: new Date() } },
      $set:  { updatedAt: new Date() },
    },
    { upsert: true, new: true }
  );

  res.json(chat);
});

/**
 * GET /api/chat/self?lessonId=…
 * Возвращает всю историю текущего пользователя для данного lessonId
 */
r.get('/self', auth(), async (req, res) => {
  const uid = req.user.id;
  const { lessonId } = req.query;
  if (!lessonId) return res.status(400).json({ error: 'lessonId required' });

  const chat = await Chat.findOne({ userId: uid, lessonId });
  res.json(chat ? chat.messages : []);
});

/**
 * GET /api/chat/:userId?lessonId=…
 * (admin only) — историю указанного пользователя и урока
 */
r.get('/:userId', auth(['admin']), async (req, res) => {
  const { userId } = req.params;
  const { lessonId } = req.query;
  if (!lessonId) return res.status(400).json({ error: 'lessonId required' });

  const chat = await Chat.findOne({ userId, lessonId });
  res.json(chat ? chat.messages : []);
});

export default r;
