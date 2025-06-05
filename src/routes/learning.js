import express from 'express';
import { Lesson } from '../models/Lesson.js';
import { Material } from '../models/Material.js';
import { Progress } from '../models/Progress.js';
import { auth } from '../middleware/auth.js';
import { aiClient } from '../utils/aiClient.js';

const r = express.Router();

/* ---- получить следующий кусок ---- */
r.get('/next', auth(), async (req, res) => {
  // находим первый непройденный урок
  const lessons = await Lesson.find().sort({ createdAt: 1 });
  const progMap = Object.fromEntries(
    (await Progress.find({ userId: req.user.id })).map(p => [p.lessonId.toString(), p])
  );
  const current = lessons.find(l => !progMap[l._id]?.completed) || lessons.at(-1);

  const prog = progMap[current._id?.toString()] ||
    await Progress.create({ userId: req.user.id, lessonId: current._id, index: 0 });

  const material = await Material.findOne({ topicId: current._id });
  if (!material) return res.json({ end: true, msg: 'No material.' });

  // если весь урок пройден — вернём финальные вопросы
  if (prog.index >= material.chunks.length) {
    return res.json({ final: true, questions: current.finalQuestions || [] });
  }

  const chunk = material.chunks[prog.index];
  prog.index += 1;
  prog.updatedAt = new Date();
  await prog.save();

  res.json({ chunk, progress: prog.index, total: material.chunks.length });
});

/* ---- проверить ответы ---- */
r.post('/submit', auth(), async (req, res) => {
  const { lessonId, answers } = req.body;
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  const criteria = lesson.criteria?.map(c => `${c.name}: ${c.weight}`)?.join('\n') || '';

  const prompt = `You are evaluator. Criteria:\n${criteria}\n\nQuestions & Answers:\n${answers}`;
  const ai   = await aiClient.chat([{ role:'user', content: prompt }]);
  const score = parseFloat(ai.choices[0].message.content.match(/(\d+(\.\d+)?)/)?.[0] || '0');

  const prog = await Progress.findOneAndUpdate(
    { userId: req.user.id, lessonId },
    { completed: true, score, updatedAt: new Date() },
    { new: true }
  );

  res.json({ score });
});

export default r;
