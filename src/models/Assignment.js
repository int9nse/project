import mongoose from 'mongoose';

const AssignmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Types.ObjectId, ref: 'User' },
  lessonId: { type: mongoose.Types.ObjectId, ref: 'Lesson' },
  answer: String,
  score: Number,
  feedback: String,
});
export const Assignment = mongoose.model('Assignment', AssignmentSchema);
