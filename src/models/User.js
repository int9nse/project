import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['employee', 'admin'], default: 'employee' },
  progress: { type: Map, of: Number },
});

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});
UserSchema.methods.comparePassword = function (pw) {
  return bcrypt.compare(pw, this.password);
};

export const User = mongoose.model('User', UserSchema);
