// backend/src/services/learningEngine.js
import cron from 'node-cron';
import { getIO } from '../socket.js';
import { Material } from '../models/Material.js';
import { Assignment } from '../models/Assignment.js';
import { User } from '../models/User.js';

export function initEngine() {
  // запуск каждые 10 минут
  cron.schedule('*/10 * * * *', tick);
}

async function tick() {
  const io = getIO();
  const users = await User.find();

  for (const u of users) {
    const last = await Assignment.findOne({ userId: u._id }).sort({ createdAt: -1 });
    const sixHours = 6 * 60 * 60 * 1000;

    if (!last || Date.now() - last.createdAt > sixHours) {
      const mat = await Material.findOne().sort({ createdAt: 1 });
      if (!mat) continue;

      io.to(u._id.toString()).emit('newMaterial', {
        chunk: mat.chunks[0],
        index: 0,
        topicId: mat.topicId,
      });
    }
  }
}
