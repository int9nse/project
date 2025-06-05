// backend/src/routes/materials.js

import express from 'express';
import { Material } from '../models/Material.js';
import { auth }     from '../middleware/auth.js';

const router = express.Router();

/**
 * GET  /api/materials/:lessonId
 * Возвращает материал (chunks) по уроку
 */
router.get('/:lessonId', async (req, res) => {
  const { lessonId } = req.params;
  let mat = await Material.findOne({ topicId: lessonId });
  if (!mat) {
    mat = await Material.findOne({ lessonId });
  }
  if (!mat) return res.status(404).json({ error: 'Material not found' });
  res.json(mat);
});

/**
 * POST /api/materials
 * Создает материал
 * body: { topicId, chunks }
 */
router.post('/', auth(['admin']), async (req, res) => {
  const { topicId, chunks } = req.body;
  const mat = await Material.create({ topicId, chunks });
  res.status(201).json(mat);
});

/**
 * PUT  /api/materials/:id
 * Обновляет материал по его _id
 * body: { topicId, chunks }
 */
router.put('/:id', auth(['admin']), async (req, res) => {
  const { id } = req.params;
  const mat = await Material.findByIdAndUpdate(
    id,
    { topicId: req.body.topicId, chunks: req.body.chunks },
    { new: true, runValidators: true }
  );
  if (!mat) return res.status(404).json({ error: 'Material not found' });
  res.json(mat);
});

export default router;
