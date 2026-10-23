import { Router } from 'express';
import { z } from 'zod';
import { Project } from '../models/Project.js';
import { ProjectMember } from '../models/ProjectMember.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as policy from '../permissions/policy.js';

const router = Router();
router.use(requireAuth);

// GET /projects/:id/members
router.get('/:id/members', async (req, res, next) => {
  try {
    const actor = req.user!;
    const project = await Project.findById(req.params.id);
    if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found');

    if (actor.role !== 'ADMIN') {
      const isMember = await ProjectMember.exists({ projectId: project._id, userId: actor.id });
      if (!isMember) throw new AppError(403, 'FORBIDDEN', 'Access denied');
    }

    const memberships = await ProjectMember.find({ projectId: project._id }).populate('userId');

    const data = memberships
      .filter((m) => m.userId) // filter deleted or dangling
      .map((m: any) => ({
        userId: m.userId._id.toString(),
        name: m.userId.name,
        email: m.userId.email,
        globalRole: m.userId.role,
        role: m.role,
        addedAt: m.addedAt,
      }));

    return res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
});

// GET /projects/:id/member-candidates
router.get(
  '/:id/member-candidates',
  validate({
    query: z.object({
      q: z.string().optional(),
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

      if (!policy.canManageMembers(actor, project.status === 'ARCHIVED', membershipRole)) {
        throw new AppError(403, 'FORBIDDEN', 'Permission denied');
      }

      const existingMembers = await ProjectMember.find({ projectId: project._id });
      const memberUserIds = existingMembers.map((m) => m.userId);

      const filter: any = {
        _id: { $nin: memberUserIds },
        isActive: true,
        role: { $ne: 'ADMIN' }, // Admins are not added as project members (BR-4)
      };

      const q = req.query.q as string | undefined;
      if (q) {
        filter.$or = [
          { name: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
        ];
      }

      const candidates = await User.find(filter).limit(10);
      return res.status(200).json({ data: candidates.map((u) => u.toJSON()) });
    } catch (err) {
      next(err);
    }
  }
);

// POST /projects/:id/members
router.post(
  '/:id/members',
  validate({
    body: z.object({
      userId: z.string().min(1),
      role: z.enum(['PROJECT_MANAGER', 'TEAM_MEMBER', 'VIEWER']),
    }),
  }),
  async (req, res, next) => {
    try {
      const actor = req.user!;
      const project = await Project.findById(req.params.id);
      if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found');

      if (project.status === 'ARCHIVED') {
        throw new AppError(409, 'PROJECT_ARCHIVED', 'Cannot add members to an archived project');
      }

      let membershipRole: any = null;
      if (actor.role !== 'ADMIN') {
        const m = await ProjectMember.findOne({ projectId: project._id, userId: actor.id });
        if (!m) throw new AppError(403, 'FORBIDDEN', 'Access denied');
        membershipRole = m.role;
      }

      if (!policy.canManageMembers(actor, false, membershipRole)) {
        throw new AppError(403, 'FORBIDDEN', 'Permission denied');
      }

      // BR-5: Only Admin may grant or change PROJECT_MANAGER
      if (req.body.role === 'PROJECT_MANAGER' && !policy.canManageProjectManagers(actor, false)) {
        throw new AppError(403, 'FORBIDDEN', 'Only Admins can assign Project Managers');
      }

      const targetUser = await User.findById(req.body.userId);
      if (!targetUser || !targetUser.isActive) {
        throw new AppError(400, 'INVALID_MEMBER', 'Target user is invalid or deactivated');
      }

      // BR-4: Admins cannot be added as members (they have implicit access)
      if (targetUser.role === 'ADMIN') {
        throw new AppError(400, 'INVALID_MEMBER', 'Administrators have implicit access and cannot be added as project members');
      }

      // BR-4: Role hierarchy checks
      if (targetUser.role === 'VIEWER' && req.body.role !== 'VIEWER') {
        throw new AppError(400, 'INVALID_ROLE', 'A user with global role VIEWER can only hold the VIEWER project role');
      }
      if (targetUser.role === 'TEAM_MEMBER' && req.body.role === 'PROJECT_MANAGER') {
        throw new AppError(400, 'INVALID_ROLE', 'A Team Member cannot be assigned Project Manager');
      }

      const existingMember = await ProjectMember.findOne({
        projectId: project._id,
        userId: targetUser._id,
      });
      if (existingMember) {
        throw new AppError(409, 'ALREADY_MEMBER', 'User is already a member of this project');
      }

      const membership = await ProjectMember.create({
        projectId: project._id,
        userId: targetUser._id,
        role: req.body.role,
      });

      return res.status(201).json({
        data: {
          userId: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          globalRole: targetUser.role,
          role: membership.role,
          addedAt: membership.addedAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /projects/:id/members/:userId
router.patch(
  '/:id/members/:userId',
  validate({
    body: z.object({
      role: z.enum(['PROJECT_MANAGER', 'TEAM_MEMBER', 'VIEWER']),
    }),
  }),
  async (req, res, next) => {
    try {
      const actor = req.user!;
      const project = await Project.findById(req.params.id);
      if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found');

      if (project.status === 'ARCHIVED') {
        throw new AppError(409, 'PROJECT_ARCHIVED', 'Cannot edit members in an archived project');
      }

      let membershipRole: any = null;
      if (actor.role !== 'ADMIN') {
        const m = await ProjectMember.findOne({ projectId: project._id, userId: actor.id });
        if (!m) throw new AppError(403, 'FORBIDDEN', 'Access denied');
        membershipRole = m.role;
      }

      const membership = await ProjectMember.findOne({
        projectId: project._id,
        userId: req.params.userId,
      }).populate('userId');

      if (!membership || !membership.userId) {
        throw new AppError(404, 'NOT_FOUND', 'Project membership not found');
      }

      // BR-5: PM cannot grant, revoke or change PROJECT_MANAGER
      if (
        (membership.role === 'PROJECT_MANAGER' || req.body.role === 'PROJECT_MANAGER') &&
        !policy.canManageProjectManagers(actor, false)
      ) {
        throw new AppError(403, 'FORBIDDEN', 'Only Admins can grant, revoke or modify the Project Manager role');
      }

      membership.role = req.body.role;
      await membership.save();

      const userDoc = membership.userId as any;
      return res.status(200).json({
        data: {
          userId: userDoc._id.toString(),
          name: userDoc.name,
          email: userDoc.email,
          globalRole: userDoc.role,
          role: membership.role,
          addedAt: membership.addedAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /projects/:id/members/:userId (unassigns member's tasks in this project per BR-8)
router.delete('/:id/members/:userId', async (req, res, next) => {
  try {
    const actor = req.user!;
    const project = await Project.findById(req.params.id);
    if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found');

    if (project.status === 'ARCHIVED') {
      throw new AppError(409, 'PROJECT_ARCHIVED', 'Cannot remove members from an archived project');
    }

    let membershipRole: any = null;
    if (actor.role !== 'ADMIN') {
      const m = await ProjectMember.findOne({ projectId: project._id, userId: actor.id });
      if (!m) throw new AppError(403, 'FORBIDDEN', 'Access denied');
      membershipRole = m.role;
    }

    const membership = await ProjectMember.findOne({
      projectId: project._id,
      userId: req.params.userId,
    });
    if (!membership) throw new AppError(404, 'NOT_FOUND', 'Membership not found');

    // BR-5: Only Admin can remove a Project Manager
    if (membership.role === 'PROJECT_MANAGER' && !policy.canManageProjectManagers(actor, false)) {
      throw new AppError(403, 'FORBIDDEN', 'Only Admins can remove Project Managers');
    }

    // BR-8: Removing a member unassigns their tasks in this project
    await Task.updateMany(
      { projectId: project._id, assigneeId: req.params.userId },
      { assigneeId: null }
    );

    await ProjectMember.findByIdAndDelete(membership._id);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export const memberRoutes = router;
