import mongoose from 'mongoose';

export const Progress = mongoose.model(
  'Progress',
  new mongoose.Schema({
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
    index:    { type: Number, default: 0 },     // какой chunk уже прочитан
    completed:{ type: Boolean, default: false },
    score:    { type: Number, default: 0 },
    updatedAt:{ type: Date, default: Date.now }
  })
);
