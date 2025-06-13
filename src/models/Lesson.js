// backend/src/models/Lesson.js

import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },

  // Основной текст урока
  content: {
    type: String,
    required: true,
  },

  // финальные вопросы после всех порций материала
  finalQuestions: {
    type: [String],
    default: [],
  },

  // критерии оценки: имя критерия + вес (например, "Понимание": 0.4)
  criteria: {
    type: [
      {
        name:   { type: String, required: true },
        weight: { type: Number, required: true },
      }
    ],
    default: [],
  },

  // порядок урока в админ-панели
  order: {
    type:    Number,
    default: 0,
    index:   true,
  },
}, {
  timestamps: true, // createdAt, updatedAt
});

export const Lesson = mongoose.model('Lesson', lessonSchema);
