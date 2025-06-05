import express from 'express';
import { User } from '../models/User.js';
import { Assignment } from '../models/Assignment.js';

const r = express.Router();

/* краткая сводка */
r.get('/summary', async (_q, res) => {
  const users = await User.countDocuments();
  const agg = await Assignment.aggregate([{ $group: { _id: null, cnt: { $sum: 1 }, avg: { $avg: '$score' } } }]);
  res.json({ users, assignments: agg[0]?.cnt || 0, avgScore: +(agg[0]?.avg || 0).toFixed(1) });
});

/* детальная таблица */
r.get('/users', async (_q, res) => {
  const stats = await Assignment.aggregate([
    { $group: { _id: '$userId', assignments: { $sum: 1 }, avgScore: { $avg: '$score' }, lastActivity: { $max: '$createdAt' } } },
  ]);
  const users = await User.find({}, 'name email role').lean();
  const map = Object.fromEntries(stats.map(s => [s._id.toString(), s]));
  res.json(users.map(u => ({
    ...u,
    assignments: map[u._id]?.assignments || 0,
    avgScore: map[u._id]?.avgScore?.toFixed(1) || '-',
    lastActivity: map[u._id]?.lastActivity || '—',
  })));
});

export default r;
