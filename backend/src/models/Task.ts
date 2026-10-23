import mongoose, { Document, Schema } from 'mongoose';
import { TaskPriority, TaskStatus } from '../types/index.js';

export interface ITask extends Document {
  id: string;
  projectId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: mongoose.Types.ObjectId | null;
  createdById: mongoose.Types.ObjectId;
  dueDate: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'],
      default: 'TODO',
      index: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
    },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dueDate: { type: String, default: null },
    version: { type: Number, default: 1, required: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Task = mongoose.model<ITask>('Task', TaskSchema);
