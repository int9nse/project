import mongoose from 'mongoose';

const Msg = new mongoose.Schema({
  role:    { type: String, enum: ['user','assistant'], required: true },
  content: { type: String, required: true },
  ts:      { type: Date, default: Date.now },
});

export const Chat = mongoose.model(
  'Chat',
  new mongoose.Schema({
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    lessonId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', index: true },
    messages:  [Msg],
    updatedAt: { type: Date, default: Date.now },
  })
);
