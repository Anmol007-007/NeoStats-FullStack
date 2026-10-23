import { Document, Schema, Types } from 'mongoose';
import { tasksDb, mirrorSave, mirrorDelete } from '../db/connections.js';

export interface IComment extends Document {
  id: string;
  taskId: Types.ObjectId;
  authorId: Types.ObjectId;
  body: string;
  createdAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    taskId: { type: Schema.Types.ObjectId, required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, required: true },
    body: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now, index: true },
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

CommentSchema.post('save', async function (doc) {
  await mirrorSave('comments', doc);
});

CommentSchema.post('findOneAndDelete', async function (doc) {
  if (doc) await mirrorDelete('comments', doc._id);
});

export const Comment = tasksDb.model<IComment>('Comment', CommentSchema);
