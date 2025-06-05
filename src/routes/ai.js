// backend/src/routes/ai.js
import express from 'express';
import { auth } from '../middleware/auth.js';
import { aiClient } from '../utils/aiClient.js';
import { Progress } from '../models/Progress.js';
import { Material } from '../models/Material.js';
import { Lesson } from '../models/Lesson.js';

const router = express.Router();

/**
 * POST /api/ai/chat
 * body: { messages: [{role,content}, …] }
 * В system-prompt передаём весь урок целиком.
 */
router.post('/chat', auth(), async (req, res) => {
  try {
    const uid = req.user.id;
    const { messages } = req.body;

    // 1) находим непройденный урок у пользователя
    const prog = await Progress.findOne({ userId: uid, completed: false })
      .sort({ updatedAt: -1 });
    if (!prog) {
      return res.status(400).json({ error: 'No active lesson. Please start one via /learning/next.' });
    }

    // 2) достаём сам урок (Lesson) и материал (Material)
    const lesson = await Lesson.findById(prog.lessonId);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found in DB.' });
    }

    // пытаемся найти Material по обоим возможным полям
    let material = await Material.findOne({ topicId: prog.lessonId });
    if (!material) {
      material = await Material.findOne({ lessonId: prog.lessonId });
    }
    if (!material) {
      // fallback: если materiales хранит полный текст в lesson.content
      material = { chunks: [{ text: lesson.content || '' }] };
    }

    // 3) собираем полный текст урока
    const lessonText = material.chunks
      .map((c, i) => `== Chunk ${i + 1} ==\n${c.text.trim()}`)
      .join('\n\n');

    // 4) system-prompt с полным материалом
    const systemPrompt = `
You are an AI tutor. Use the following full lesson content to answer all questions.
Lesson title: ${lesson.title}

${lessonText}

Always reference the lesson content in your answers.
`.trim();

    // 5) вызываем модель
    const aiResponse = await aiClient.chat(messages, systemPrompt);

    res.json(aiResponse);
  } catch (err) {
    console.error('AI call failed:', err);
    res.status(500).json({ error: err.message || 'AI call failed' });
  }
});

export default router;
