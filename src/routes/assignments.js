import express from 'express';
import { Assignment } from '../models/Assignment.js';
import { Lesson } from '../models/Lesson.js';
import { auth } from '../middleware/auth.js';
import { aiClient } from '../utils/aiClient.js';

const r = express.Router();

r.post('/', auth(), async (req, res) => {
  const { lessonId, answer } = req.body;
  const lesson = await Lesson.findById(lessonId);
  const criteria = lesson.criteria.map(c => `- ${c.name} (${c.weight})`).join('\n');
  const sys = `${lesson.promptTemplate}\nКритерии оценки:\n${criteria}`;

  const ai = await aiClient.chat([{ role: 'user', content: answer }], sys);
  const feedback = ai.choices[0].message.content;
  const score = Number((feedback.match(/SCORE:(\d+)/i) || [0, 0])[1]);

  const doc = await Assignment.create({ userId: req.user.id, lessonId, answer, score, feedback });
  res.json(doc);
});

r.get('/my', auth(), async (req, res) =>
  res.json(await Assignment.find({ userId: req.user.id }).populate('lessonId'))
);

export default r;
