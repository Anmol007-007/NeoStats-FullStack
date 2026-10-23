import mongoose, { Document, Schema } from 'mongoose';
import { GlobalRole } from '../types/index.js';

export interface IUser extends Document {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: GlobalRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'VIEWER'],
      default: 'TEAM_MEMBER',
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash; // NEVER leak passwordHash
        return ret;
      },
    },
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
