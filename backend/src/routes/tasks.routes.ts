import { Router } from 'express';
import { z } from 'zod';
import { Task } from '../models/Task.js';
import { Project } from '../models/Project.js';
import { ProjectMember } from '../models/ProjectMember.js';
import { Comment } from '../models/Comment.js';
import { User } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as policy from '../permissions/policy.js';

const router = Router();
router.use(requireAuth);

// Helper to convert Task doc to DTO with permissions
async function toTaskDto(taskDoc: any, actor: any, membershipRole: any) {
  const project = await Project.findById(taskDoc.projectId);
  const isArchived = project?.status === 'ARCHIVED';
  const taskAssigneeId = taskDoc.assigneeId ? taskDoc.assigneeId._id ? taskDoc.assigneeId._id.toString() : taskDoc.assigneeId.toString() : null;

  const permissions = {
    canEdit: policy.canEditTask(actor, isArchived, membershipRole, taskAssigneeId),
    canChangeStatus: policy.canChangeTaskStatus(actor, isArchived, membershipRole, taskAssigneeId),
    canAssign: policy.canAssignTask(actor, isArchived, membershipRole),
    canDelete: policy.canDeleteTask(actor, isArchived, membershipRole),
  };

  const assignee = taskDoc.assigneeId
    ? {
        id: taskDoc.assigneeId._id ? taskDoc.assigneeId._id.toString() : taskDoc.assigneeId.toString(),
        name: taskDoc.assigneeId.name || 'User',
        email: taskDoc.assigneeId.email || '',
      }
    : null;

  const createdBy = taskDoc.createdById
    ? {
        id: taskDoc.createdById._id ? taskDoc.createdById._id.toString() : taskDoc.createdById.toString(),
        name: taskDoc.createdById.name || 'User',
      }
    : { id: '', name: 'System' };

  return {
    id: taskDoc.id,
    projectId: taskDoc.projectId.toString(),
    title: taskDoc.title,
    description: taskDoc.description,
    status: taskDoc.status,
    priority: taskDoc.priority,
    dueDate: taskDoc.dueDate,
    version: taskDoc.version,
    assignee,
    createdBy,
    createdAt: taskDoc.createdAt,
    updatedAt: taskDoc.updatedAt,
    permissions,
  };
}

// GET /projects/:id/tasks
router.get(
  '/projects/:id/tasks',
  validate({
    query: z.object({
      page: z.coerce.number().min(1).default(1),
      pageSize: z.coerce.number().min(1).max(100).default(20),
      q: z.string().optional(),
      status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
      assigneeId: z.string().optional(),
      sort: z.enum(['createdAt', 'dueDate', 'priority', 'updatedAt']).default('createdAt'),
      order: z.enum(['asc', 'desc']).default('desc'),
    }),
  }),
  async (req, res, next) => {
    try {
      const actor = req.user!;
      const project = await Project.findById(req.params.id);
      if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found');

      let membershipRole: any = null;
      if (actor.role === 'ADMIN') {
        membershipRole = 'ADMIN';
      } else {
        const m = await ProjectMember.findOne({ projectId: project._id, userId: actor.id });
        if (!m) throw new AppError(403, 'FORBIDDEN', 'Access denied');
        membershipRole = m.role;
      }

      const { page, pageSize, q, status, priority, assigneeId, sort, order } = req.query as any;
      const query: any = { projectId: project._id };

      if (status) query.status = status;
      if (priority) query.priority = priority;
      if (assigneeId) query.assigneeId = assigneeId;
      if (q) {
        query.$or = [
          { title: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
        ];
      }

      const sortOrder = order === 'asc' ? 1 : -1;
      const total = await Task.countDocuments(query);
      const tasks = await Task.find(query)
        .populate('assigneeId')
        .populate('createdById')
        .sort({ [sort]: sortOrder })
        .skip((page - 1) * pageSize)
        .limit(pageSize);

      const items = await Promise.all(
        tasks.map((t) => toTaskDto(t, actor, membershipRole))
      );

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

// GET /tasks (Scoped cross-project tasks for "My Tasks" and dashboard)
router.get(
  '/tasks',
  validate({
    query: z.object({
      assignee: z.enum(['me']).optional(),
      status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
      page: z.coerce.number().min(1).default(1),
      pageSize: z.coerce.number().min(1).max(100).default(20),
    }),
  }),
  async (req, res, next) => {
    try {
      const actor = req.user!;
      const { status, page, pageSize } = req.query as any;

      const query: any = { assigneeId: actor.id };
      if (status) query.status = status;

      const total = await Task.countDocuments(query);
      const tasks = await Task.find(query)
        .populate('assigneeId')
        .populate('createdById')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize);

      const items = await Promise.all(
        tasks.map(async (t) => {
          let role = 'TEAM_MEMBER';
          if (actor.role === 'ADMIN') role = 'ADMIN';
          else {
            const m = await ProjectMember.findOne({ projectId: t.projectId, userId: actor.id });
            if (m) role = m.role;
          }
          return toTaskDto(t, actor, role);
        })
      );

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

// POST /projects/:id/tasks
router.post(
  '/projects/:id/tasks',
  validate({
    body: z.object({
      title: z.string().min(1).max(200).trim(),
      description: z.string().max(5000).optional(),
      status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).default('TODO'),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
      assigneeId: z.string().nullable().optional(),
      dueDate: z.string().nullable().optional(),
    }),
  }),
  async (req, res, next) => {
    try {
      const actor = req.user!;
      const project = await Project.findById(req.params.id);
      if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found');

      if (project.status === 'ARCHIVED') {
        throw new AppError(409, 'PROJECT_ARCHIVED', 'Cannot create tasks in an archived project');
      }

      let membershipRole: any = null;
      if (actor.role === 'ADMIN') {
        membershipRole = 'ADMIN';
      } else {
        const m = await ProjectMember.findOne({ projectId: project._id, userId: actor.id });
        if (!m) throw new AppError(403, 'FORBIDDEN', 'Access denied');
        membershipRole = m.role;
      }

      if (!policy.canCreateTask(actor, false, membershipRole)) {
        throw new AppError(403, 'FORBIDDEN', 'Only Admins and Project Managers can create tasks');
      }

      const { title, description, status, priority, assigneeId, dueDate } = req.body;

      // BR-7: Assignee must be an active member with role PROJECT_MANAGER or TEAM_MEMBER
      if (assigneeId) {
        const membership = await ProjectMember.findOne({
          projectId: project._id,
          userId: assigneeId,
        });
        if (!membership || membership.role === 'VIEWER') {
          throw new AppError(
            400,
            'INVALID_ASSIGNEE',
            'Task assignee must be an active project member with role Project Manager or Team Member'
          );
        }
      }

      const task = await Task.create({
        projectId: project._id,
        title,
        description: description || '',
        status,
        priority,
        assigneeId: assigneeId || null,
        createdById: actor.id,
        dueDate: dueDate || null,
        version: 1,
      });

      const populated = await Task.findById(task._id).populate('assigneeId').populate('createdById');
      const dto = await toTaskDto(populated, actor, membershipRole);

      return res.status(201).json({ data: dto });
    } catch (err) {
      next(err);
    }
  }
);

// GET /tasks/:id
router.get('/tasks/:id', async (req, res, next) => {
  try {
    const actor = req.user!;
    const task = await Task.findById(req.params.id).populate('assigneeId').populate('createdById');
    if (!task) throw new AppError(404, 'NOT_FOUND', 'Task not found');

    let membershipRole: any = null;
    if (actor.role === 'ADMIN') {
      membershipRole = 'ADMIN';
    } else {
      const m = await ProjectMember.findOne({ projectId: task.projectId, userId: actor.id });
      if (!m) throw new AppError(403, 'FORBIDDEN', 'You do not have access to this task');
      membershipRole = m.role;
    }

    const dto = await toTaskDto(task, actor, membershipRole);
    return res.status(200).json({ data: dto });
  } catch (err) {
    next(err);
  }
});

// PATCH /tasks/:id — OPTIMISTIC CONCURRENCY CONTROL (VERSION LOCKING)
router.patch(
  '/tasks/:id',
  validate({
    body: z.object({
      version: z.number().int().positive('Version is required for optimistic concurrency check'),
      title: z.string().min(1).max(200).trim().optional(),
      description: z.string().max(5000).optional(),
      status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
      assigneeId: z.string().nullable().optional(),
      dueDate: z.string().nullable().optional(),
    }),
  }),
  async (req, res, next) => {
    try {
      const actor = req.user!;
      const task = await Task.findById(req.params.id);
      if (!task) throw new AppError(404, 'NOT_FOUND', 'Task not found');

      const project = await Project.findById(task.projectId);
      if (!project) throw new AppError(404, 'NOT_FOUND', 'Parent project not found');

      if (project.status === 'ARCHIVED') {
        throw new AppError(409, 'PROJECT_ARCHIVED', 'Cannot edit tasks in an archived project');
      }

      let membershipRole: any = null;
      if (actor.role === 'ADMIN') {
        membershipRole = 'ADMIN';
      } else {
        const m = await ProjectMember.findOne({ projectId: project._id, userId: actor.id });
        if (!m) throw new AppError(403, 'FORBIDDEN', 'Access denied');
        membershipRole = m.role;
      }

      const taskAssigneeId = task.assigneeId ? task.assigneeId.toString() : null;

      // Permission checks
      if (req.body.assigneeId !== undefined && !policy.canAssignTask(actor, false, membershipRole)) {
        throw new AppError(403, 'FORBIDDEN', 'Team Members cannot reassign tasks');
      }
      if (
        (req.body.title !== undefined || req.body.description !== undefined || req.body.priority !== undefined || req.body.dueDate !== undefined) &&
        !policy.canEditTask(actor, false, membershipRole, taskAssigneeId)
      ) {
        throw new AppError(403, 'FORBIDDEN', 'You do not have permission to modify this task');
      }
      if (req.body.status !== undefined && !policy.canChangeTaskStatus(actor, false, membershipRole, taskAssigneeId)) {
        throw new AppError(403, 'FORBIDDEN', 'You do not have permission to change the status of this task');
      }

      // BR-7 Check if assignee is valid
      if (req.body.assigneeId) {
        const membership = await ProjectMember.findOne({
          projectId: project._id,
          userId: req.body.assigneeId,
        });
        if (!membership || membership.role === 'VIEWER') {
          throw new AppError(
            400,
            'INVALID_ASSIGNEE',
            'Task assignee must be an active project member with role Project Manager or Team Member'
          );
        }
      }

      const { version, ...fieldsToUpdate } = req.body;

      // ATOMIC OPTIMISTIC LOCKING UPDATE
      // The update only succeeds if the document's version in the database strictly matches the version sent by the client.
      const updated = await Task.findOneAndUpdate(
        { _id: task._id, version },
        { ...fieldsToUpdate, $inc: { version: 1 } },
        { new: true }
      )
        .populate('assigneeId')
        .populate('createdById');

      if (!updated) {
        // Someone else updated this task in the meantime!
        const latestDoc = await Task.findById(task._id).populate('assigneeId').populate('createdById');
        if (!latestDoc) throw new AppError(404, 'NOT_FOUND', 'Task was deleted by another user');

        const latestDto = await toTaskDto(latestDoc, actor, membershipRole);

        throw new AppError(
          409,
          'VERSION_CONFLICT',
          'This task was modified by someone else. Review the latest version.',
          { currentTask: latestDto }
        );
      }

      const dto = await toTaskDto(updated, actor, membershipRole);
      return res.status(200).json({ data: dto });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /tasks/:id
router.delete('/tasks/:id', async (req, res, next) => {
  try {
    const actor = req.user!;
    const task = await Task.findById(req.params.id);
    if (!task) throw new AppError(404, 'NOT_FOUND', 'Task not found');

    const project = await Project.findById(task.projectId);
    if (!project) throw new AppError(404, 'NOT_FOUND', 'Parent project not found');

    if (project.status === 'ARCHIVED') {
      throw new AppError(409, 'PROJECT_ARCHIVED', 'Cannot delete tasks from an archived project');
    }

    let membershipRole: any = null;
    if (actor.role === 'ADMIN') {
      membershipRole = 'ADMIN';
    } else {
      const m = await ProjectMember.findOne({ projectId: project._id, userId: actor.id });
      if (!m) throw new AppError(403, 'FORBIDDEN', 'Access denied');
      membershipRole = m.role;
    }

    if (!policy.canDeleteTask(actor, false, membershipRole)) {
      throw new AppError(403, 'FORBIDDEN', 'Only Admins and Project Managers can delete tasks');
    }

    // Cascade delete comments per BR-10
    await Comment.deleteMany({ taskId: task._id });
    await Task.findByIdAndDelete(task._id);

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export const taskRoutes = router;
