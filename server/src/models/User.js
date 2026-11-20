import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    settings: {
      theme: { type: String, enum: ['light', 'dark'], default: 'dark' },
    },
  },
  { timestamps: true }
);

export function toPublic(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    settings: {
      theme: user.settings?.theme === 'light' ? 'light' : 'dark',
    },
  };
}

export default mongoose.model('User', userSchema);
