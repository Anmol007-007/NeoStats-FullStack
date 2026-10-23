import { Router } from 'express';
import { Project } from '../models/Project.js';
import { ProjectMember } from '../models/ProjectMember.js';
import { Task } from '../models/Task.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /dashboard
router.get('/', async (req, res, next) => {
  try {
    const actor = req.user!;
    let projectIds: any[] = [];

    if (actor.role === 'ADMIN') {
      const allProjects = await Project.find({}, '_id');
      projectIds = allProjects.map((p) => p._id);
    } else {
      const memberships = await ProjectMember.find({ userId: actor.id }, 'projectId');
      projectIds = memberships.map((m) => m.projectId);
    }

    const relevantTasks = await Task.find({ projectId: { $in: projectIds } });

    const tasksByStatus = {
      TODO: relevantTasks.filter((t) => t.status === 'TODO').length,
      IN_PROGRESS: relevantTasks.filter((t) => t.status === 'IN_PROGRESS').length,
      IN_REVIEW: relevantTasks.filter((t) => t.status === 'IN_REVIEW').length,
      DONE: relevantTasks.filter((t) => t.status === 'DONE').length,
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const overdueCount = relevantTasks.filter(
      (t) => t.status !== 'DONE' && t.dueDate && t.dueDate < todayStr
    ).length;

    // My Open Tasks (max 5)
    const myOpenTasks = await Task.find({
      assigneeId: actor.id,
      status: { $ne: 'DONE' },
    })
      .sort({ dueDate: 1, updatedAt: -1 })
      .limit(5);

    // Recent Projects (max 5)
    const recentProjects = await Project.find({ _id: { $in: projectIds } })
      .sort({ updatedAt: -1 })
      .limit(5);

    const recentProjectsDto = await Promise.all(
      recentProjects.map(async (p) => {
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
      data: {
        projectCount: projectIds.length,
        tasksByStatus,
        overdueCount,
        myOpenTasks: myOpenTasks.map((t) => ({
          id: t.id,
          projectId: t.projectId.toString(),
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          version: t.version,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
        recentProjects: recentProjectsDto,
      },
    });
  } catch (err) {
    next(err);
  }
});

export const dashboardRoutes = router;
