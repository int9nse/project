import { User } from '../models/User.js';

const users = [
  { name: 'Super Admin',  email: 'admin2@adm.local',  password: 'admPass!1',  role: 'admin' },
  { name: 'Regular User', email: 'user2@adm.local',   password: 'userPass!1', role: 'employee' },
  { name: 'Olga Smirnova', email: 'olga@adm.local',    password: 'spring2025', role: 'employee' },
  { name: 'mama',     email: 'mama@gmail.com',  password: 'parol', role: 'admin' }
];

export async function ensureDefaultUsers() {
  for (const u of users) {
    const exists = await User.findOne({ email: u.email });
    if (exists) continue;
    await User.create({
      name:     u.name,
      email:    u.email,
      password: u.password,
      role:     u.role
    });
    console.log(`✓ created ${u.role} → ${u.email}`);
  }
}
