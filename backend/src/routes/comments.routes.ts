import { Router } from 'express';
import { z } from 'zod';
import { Comment } from '../models/Comment.js';
import { Task } from '../models/Task.js';
import { Project } from '../models/Project.js';
import { ProjectMember } from '../models/ProjectMember.js';
import { AppError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as policy from '../permissions/policy.js';

const router = Router();
router.use(requireAuth);

// GET /tasks/:id/comments
router.get(
  '/tasks/:id/comments',
  validate({
    query: z.object({
      page: z.coerce.number().min(1).default(1),
      pageSize: z.coerce.number().min(1).max(100).default(50),
    }),
  }),
  async (req, res, next) => {
    try {
      const actor = req.user!;
      const task = await Task.findById(req.params.id);
      if (!task) throw new AppError(404, 'NOT_FOUND', 'Task not found');

      const project = await Project.findById(task.projectId);
      if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found');

      let membershipRole: any = null;
      if (actor.role === 'ADMIN') {
        membershipRole = 'ADMIN';
      } else {
        const m = await ProjectMember.findOne({ projectId: project._id, userId: actor.id });
        if (!m) throw new AppError(403, 'FORBIDDEN', 'Access denied');
        membershipRole = m.role;
      }

      const { page, pageSize } = req.query as any;
      const total = await Comment.countDocuments({ taskId: task._id });
      const comments = await Comment.find({ taskId: task._id })
        .populate('authorId')
        .sort({ createdAt: 1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize);

      const items = comments.map((c: any) => ({
        id: c.id,
        taskId: c.taskId.toString(),
        body: c.body,
        author: {
          id: c.authorId._id.toString(),
          name: c.authorId.name,
        },
        createdAt: c.createdAt,
        canDelete: policy.canDeleteComment(actor, membershipRole, c.authorId._id.toString()),
      }));

      return res.status(200).json({
        data: items,
        meta: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize) || 1,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /tasks/:id/comments
router.post(
  '/tasks/:id/comments',
  validate({
    body: z.object({
      body: z.string().min(1).max(2000).trim(),
    }),
  }),
  async (req, res, next) => {
    try {
      const actor = req.user!;
      const task = await Task.findById(req.params.id);
      if (!task) throw new AppError(404, 'NOT_FOUND', 'Task not found');

      const project = await Project.findById(task.projectId);
      if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found');

      if (project.status === 'ARCHIVED') {
        throw new AppError(409, 'PROJECT_ARCHIVED', 'Cannot comment on tasks in an archived project');
      }

      let membershipRole: any = null;
      if (actor.role === 'ADMIN') {
        membershipRole = 'ADMIN';
      } else {
        const m = await ProjectMember.findOne({ projectId: project._id, userId: actor.id });
        if (!m) throw new AppError(403, 'FORBIDDEN', 'Access denied');
        membershipRole = m.role;
      }

      if (!policy.canCreateComment(actor, false, membershipRole)) {
        throw new AppError(403, 'FORBIDDEN', 'Viewers cannot create comments');
      }

      const comment = await Comment.create({
        taskId: task._id,
        authorId: actor.id,
        body: req.body.body,
      });

      return res.status(201).json({
        data: {
          id: comment.id,
          taskId: comment.taskId.toString(),
          body: comment.body,
          author: {
            id: actor.id,
            name: actor.name,
          },
          createdAt: comment.createdAt,
          canDelete: true,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /comments/:id
router.delete('/comments/:id', async (req, res, next) => {
  try {
    const actor = req.user!;
    const comment = await Comment.findById(req.params.id);
    if (!comment) throw new AppError(404, 'NOT_FOUND', 'Comment not found');

    const task = await Task.findById(comment.taskId);
    if (!task) throw new AppError(404, 'NOT_FOUND', 'Task not found');

    const project = await Project.findById(task.projectId);
    if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found');

    if (project.status === 'ARCHIVED') {
      throw new AppError(409, 'PROJECT_ARCHIVED', 'Cannot delete comments in an archived project');
    }

    let membershipRole: any = null;
    if (actor.role === 'ADMIN') {
      membershipRole = 'ADMIN';
    } else {
      const m = await ProjectMember.findOne({ projectId: project._id, userId: actor.id });
      if (!m) throw new AppError(403, 'FORBIDDEN', 'Access denied');
      membershipRole = m.role;
    }

    if (!policy.canDeleteComment(actor, membershipRole, comment.authorId.toString())) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to delete this comment');
    }

    await Comment.findByIdAndDelete(comment._id);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export const commentRoutes = router;
