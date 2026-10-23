import { Router } from 'express';
import { z } from 'zod';
import { Project } from '../models/Project.js';
import { ProjectMember } from '../models/ProjectMember.js';
import { Task } from '../models/Task.js';
import { Comment } from '../models/Comment.js';
import { User } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as policy from '../permissions/policy.js';
import { mirrorDelete, mirrorDeleteMany } from '../db/connections.js';

const router = Router();
router.use(requireAuth);


function getProjectPermissions(actor: any, project: any, membershipRole: any) {
  const isArchived = project.status === 'ARCHIVED';
  const isCreator = project.createdById?.toString() === actor.id;
  const isProjectPM = membershipRole === 'PROJECT_MANAGER';
  return {
    canEdit: policy.canEditProject(actor, isArchived, membershipRole),
    canArchive: policy.canArchiveProject(actor, membershipRole),
    canDelete: policy.canDeleteProject(actor) || isCreator || isProjectPM,
    canManageMembers: policy.canManageMembers(actor, isArchived, membershipRole),
    canManageProjectManagers: policy.canManageProjectManagers(actor, isArchived),
    canCreateTasks: policy.canCreateTask(actor, isArchived, membershipRole),
    canComment: policy.canCreateComment(actor, isArchived, membershipRole),
  };
}


router.get(
  '/',
  validate({
    query: z.object({
      page: z.coerce.number().min(1).default(1),
      pageSize: z.coerce.number().min(1).max(100).default(20),
      q: z.string().optional(),
      status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
    }),
  }),
  async (req, res, next) => {
    try {
      const actor = req.user!;
      const { page, pageSize, q, status } = req.query as any;

      let projectIdsFilter: any = null;

      
      if (actor.role !== 'ADMIN') {
        const memberships = await ProjectMember.find({ userId: actor.id });
        projectIdsFilter = memberships.map((m) => m.projectId);
      }

      const query: any = {};
      if (projectIdsFilter) {
        query._id = { $in: projectIdsFilter };
      }
      if (status) query.status = status;
      if (q) {
        query.$or = [
          { name: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
        ];
      }

      const total = await Project.countDocuments(query);
      const projects = await Project.find(query)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize);

      
      const items = await Promise.all(
        projects.map(async (p) => {
          const memberCount = await ProjectMember.countDocuments({ projectId: p._id });
          const taskCount = await Task.countDocuments({ projectId: p._id });

          let myRole: any = null;
          if (actor.role === 'ADMIN') {
            myRole = 'ADMIN';
          } else {
            const m = await ProjectMember.findOne({ projectId: p._id, userId: actor.id });
            myRole = m ? m.role : null;
          }

          return {
            id: p.id,
            name: p.name,
            description: p.description,
            status: p.status,
            memberCount,
            taskCount,
            myRole,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          };
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


router.post(
  '/',
  validate({
    body: z.object({
      name: z.string().min(1).max(120).trim(),
      description: z.string().max(2000).optional(),
      projectManagerId: z.string().optional(),
    }),
  }),
  async (req, res, next) => {
    try {
      const actor = req.user!;
      const { name, description, projectManagerId } = req.body;

      if (projectManagerId) {
        const pmUser = await User.findById(projectManagerId);
        if (!pmUser || !pmUser.isActive || pmUser.role !== 'PROJECT_MANAGER') {
          throw new AppError(
            400,
            'INVALID_ROLE',
            'Initial Project Manager must be an active user with global role PROJECT_MANAGER'
          );
        }
      }

      const project = await Project.create({
        name,
        description: description || '',
        status: 'ACTIVE',
        createdById: actor.id,
      });

      
      if (actor.role !== 'ADMIN') {
        await ProjectMember.create({
          projectId: project._id,
          userId: actor.id,
          role: 'PROJECT_MANAGER',
        });
      }

      if (projectManagerId && projectManagerId !== actor.id) {
        await ProjectMember.create({
          projectId: project._id,
          userId: projectManagerId,
          role: 'PROJECT_MANAGER',
        });
      }

      const memberCount = await ProjectMember.countDocuments({ projectId: project._id });
      const permissions = getProjectPermissions(
        actor,
        project,
        actor.role === 'ADMIN' ? 'ADMIN' : 'PROJECT_MANAGER'
      );

      return res.status(201).json({
        data: {
          id: project.id,
          _id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          memberCount,
          taskCount: 0,
          myRole: actor.role === 'ADMIN' ? 'ADMIN' : 'PROJECT_MANAGER',
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          permissions,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);


router.get('/:id', async (req, res, next) => {
  try {
    const actor = req.user!;
    const project = await Project.findById(req.params.id);
    if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found');

    let membershipRole: any = null;
    if (actor.role === 'ADMIN') {
      membershipRole = 'ADMIN';
    } else {
      const m = await ProjectMember.findOne({ projectId: project._id, userId: actor.id });
      if (!m) {
        throw new AppError(403, 'FORBIDDEN', 'You do not have access to this project');
      }
      membershipRole = m.role;
    }

    const memberCount = await ProjectMember.countDocuments({ projectId: project._id });
    const taskCount = await Task.countDocuments({ projectId: project._id });
    const permissions = getProjectPermissions(actor, project, membershipRole);

    return res.status(200).json({
      data: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        memberCount,
        taskCount,
        myRole: membershipRole,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        permissions,
      },
    });
  } catch (err) {
    next(err);
  }
});


router.patch(
  '/:id',
  validate({
    body: z.object({
      name: z.string().min(1).max(120).trim().optional(),
      description: z.string().max(2000).optional(),
    }),
  }),
  async (req, res, next) => {
    try {
      const actor = req.user!;
      const project = await Project.findById(req.params.id);
      if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found');

      let membershipRole: any = null;
      if (actor.role !== 'ADMIN') {
        const m = await ProjectMember.findOne({ projectId: project._id, userId: actor.id });
        if (!m) throw new AppError(403, 'FORBIDDEN', 'Access denied');
        membershipRole = m.role;
      }

      if (!policy.canEditProject(actor, project.status === 'ARCHIVED', membershipRole)) {
        if (project.status === 'ARCHIVED') {
          throw new AppError(409, 'PROJECT_ARCHIVED', 'Archived projects are read-only');
        }
        throw new AppError(403, 'FORBIDDEN', 'You do not have permission to edit this project');
      }

      if (req.body.name) project.name = req.body.name;
      if (req.body.description !== undefined) project.description = req.body.description;
      await project.save();

      const memberCount = await ProjectMember.countDocuments({ projectId: project._id });
      const taskCount = await Task.countDocuments({ projectId: project._id });
      const permissions = getProjectPermissions(actor, project, membershipRole || 'ADMIN');

      return res.status(200).json({
        data: {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          memberCount,
          taskCount,
          myRole: membershipRole || 'ADMIN',
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          permissions,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);


router.post('/:id/archive', async (req, res, next) => {
  try {
    const actor = req.user!;
    const project = await Project.findById(req.params.id);
    if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found');

    let membershipRole: any = null;
    if (actor.role !== 'ADMIN') {
      const m = await ProjectMember.findOne({ projectId: project._id, userId: actor.id });
      if (!m) throw new AppError(403, 'FORBIDDEN', 'Access denied');
      membershipRole = m.role;
    }

    if (!policy.canArchiveProject(actor, membershipRole)) {
      throw new AppError(403, 'FORBIDDEN', 'Only Admin and Project Managers can archive projects');
    }

    project.status = 'ARCHIVED';
    await project.save();

    const memberCount = await ProjectMember.countDocuments({ projectId: project._id });
    const taskCount = await Task.countDocuments({ projectId: project._id });
    const permissions = getProjectPermissions(actor, project, membershipRole || 'ADMIN');

    return res.status(200).json({
      data: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        memberCount,
        taskCount,
        myRole: membershipRole || 'ADMIN',
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        permissions,
      },
    });
  } catch (err) {
    next(err);
  }
});


router.post('/:id/unarchive', async (req, res, next) => {
  try {
    const actor = req.user!;
    const project = await Project.findById(req.params.id);
    if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found');

    let membershipRole: any = null;
    if (actor.role !== 'ADMIN') {
      const m = await ProjectMember.findOne({ projectId: project._id, userId: actor.id });
      if (!m) throw new AppError(403, 'FORBIDDEN', 'Access denied');
      membershipRole = m.role;
    }

    if (!policy.canArchiveProject(actor, membershipRole)) {
      throw new AppError(403, 'FORBIDDEN', 'Only Admin and Project Managers can unarchive projects');
    }

    project.status = 'ACTIVE';
    await project.save();

    const memberCount = await ProjectMember.countDocuments({ projectId: project._id });
    const taskCount = await Task.countDocuments({ projectId: project._id });
    const permissions = getProjectPermissions(actor, project, membershipRole || 'ADMIN');

    return res.status(200).json({
      data: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        memberCount,
        taskCount,
        myRole: membershipRole || 'ADMIN',
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        permissions,
      },
    });
  } catch (err) {
    next(err);
  }
});


router.delete('/:id', async (req, res, next) => {
  try {
    const actor = req.user!;
    const project = await Project.findById(req.params.id);
    if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found');

    const isCreator = project.createdById?.toString() === actor.id;
    const isProjectPM = await ProjectMember.exists({
      projectId: project._id,
      userId: actor.id,
      role: 'PROJECT_MANAGER',
    });

    if (actor.role !== 'ADMIN' && !isCreator && !isProjectPM) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Only Admins, Project Managers, or the Creator can delete this project'
      );
    }

    
    const tasks = await Task.find({ projectId: project._id });
    const taskIds = tasks.map((t) => t._id);

    await Comment.deleteMany({ taskId: { $in: taskIds } });
    await Task.deleteMany({ projectId: project._id });
    await ProjectMember.deleteMany({ projectId: project._id });
    await Project.findByIdAndDelete(project._id);

    
    await mirrorDeleteMany('comments', { taskId: { $in: taskIds } });
    await mirrorDeleteMany('tasks', { projectId: project._id });
    await mirrorDeleteMany('projectmembers', { projectId: project._id });
    await mirrorDelete('projects', project._id);

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export const projectRoutes = router;
