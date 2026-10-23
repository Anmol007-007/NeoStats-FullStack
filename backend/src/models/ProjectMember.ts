import { Document, Schema, Types } from 'mongoose';
import { projectsDb, mirrorSave, mirrorDelete } from '../db/connections.js';
import { ProjectRole } from '../types/index.js';

export interface IProjectMember extends Document {
  id: string;
  projectId: Types.ObjectId;
  userId: Types.ObjectId;
  role: ProjectRole;
  addedAt: Date;
}

const ProjectMemberSchema = new Schema<IProjectMember>(
  {
    projectId: { type: Schema.Types.ObjectId, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
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

ProjectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });

ProjectMemberSchema.post('save', async function (doc) {
  await mirrorSave('projectmembers', doc);
});

ProjectMemberSchema.post('findOneAndDelete', async function (doc) {
  if (doc) await mirrorDelete('projectmembers', doc._id);
});

export const ProjectMember = projectsDb.model<IProjectMember>(
  'ProjectMember',
  ProjectMemberSchema
);
