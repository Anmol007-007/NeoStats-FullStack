import mongoose, { Document, Schema } from 'mongoose';
import { ProjectRole } from '../types/index.js';

export interface IProjectMember extends Document {
  id: string;
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: ProjectRole;
  addedAt: Date;
}

const ProjectMemberSchema = new Schema<IProjectMember>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: {
      type: String,
      enum: ['PROJECT_MANAGER', 'TEAM_MEMBER', 'VIEWER'],
      default: 'TEAM_MEMBER',
    },
    addedAt: { type: Date, default: Date.now },
  },
  {
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

// Compound unique index ensuring a user is added to a project only once
ProjectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });

export const ProjectMember = mongoose.model<IProjectMember>(
  'ProjectMember',
  ProjectMemberSchema
);
