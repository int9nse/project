// backend/src/routes/lessons.js

import express from 'express';
import { Lesson } from '../models/Lesson.js';
import { auth }   from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/lessons
 * Возвращает список всех уроков, отсортированных по полю order,
 * теперь с полями _id, title, content и order.
 */
router.get('/', auth(), async (req, res) => {
  try {
    const lessons = await Lesson.find()
      .sort({ order: 1 })
      .select('_id title content order');  
    return res.json(lessons);
  } catch (err) {
    console.error('GET /api/lessons error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/lessons
 * Создаёт новый урок (admin only)
 */
router.post('/', auth('admin'), async (req, res) => {
  try {
    const criteria = (req.body.criteria || [])
      .filter(c => c.name && c.name.trim())
      .map(c => ({ name: c.name.trim(), weight: c.weight || 0 }));

    const lesson = new Lesson({
      title:          req.body.title,
      content:        req.body.content,
      finalQuestions: req.body.finalQuestions || [],
      order:          req.body.order,
      criteria,
    });

    await lesson.save();
    return res.json(lesson);
  } catch (err) {
    console.error('POST /api/lessons error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/lessons/:id
 * Редактирует урок (admin only)
 */
router.put('/:id', auth('admin'), async (req, res) => {
  try {
    const criteria = (req.body.criteria || [])
      .filter(c => c.name && c.name.trim())
      .map(c => ({ name: c.name.trim(), weight: c.weight || 0 }));

    const lesson = await Lesson.findByIdAndUpdate(
      req.params.id,
      {
        title:          req.body.title,
        content:        req.body.content,
        finalQuestions: req.body.finalQuestions || [],
        order:          req.body.order,
        criteria,
      },
      { new: true, runValidators: true }
    );

    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    return res.json(lesson);
  } catch (err) {
    console.error('PUT /api/lessons/:id error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/lessons/:id
 * Удаляет урок (admin only)
 */
router.delete('/:id', auth('admin'), async (req, res) => {
  try {
    const lesson = await Lesson.findByIdAndDelete(req.params.id);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/lessons/:id error:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
