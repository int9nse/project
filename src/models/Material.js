import mongoose from 'mongoose';
const Chunk = new mongoose.Schema({ text: String, embedding: [Number] });

export const Material = mongoose.model(
  'Material',
  new mongoose.Schema({
    title: String,
    topicId: String,
    chunks: [Chunk],
    createdAt: { type: Date, default: Date.now },
  }),
);
