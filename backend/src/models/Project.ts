import { Document, Schema, Types } from 'mongoose';
import { projectsDb, mirrorSave, mirrorDelete } from '../db/connections.js';
import { ProjectStatus } from '../types/index.js';

export interface IProject extends Document {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  createdById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['ACTIVE', 'ARCHIVED'],
      default: 'ACTIVE',
    },
    createdById: { type: Schema.Types.ObjectId, required: true },
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

ProjectSchema.post('save', async function (doc) {
  await mirrorSave('projects', doc);
});

ProjectSchema.post('findOneAndDelete', async function (doc) {
  if (doc) await mirrorDelete('projects', doc._id);
});

export const Project = projectsDb.model<IProject>('Project', ProjectSchema);
