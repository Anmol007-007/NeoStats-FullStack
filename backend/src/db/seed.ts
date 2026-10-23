import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { ProjectMember } from '../models/ProjectMember.js';
import { Task } from '../models/Task.js';
import { Comment } from '../models/Comment.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://aids23anmolsoni_db_user:7QlJdlhPLInSZgoc@fullstack.tlfwh2o.mongodb.net/pm_platform?retryWrites=true&w=majority';

export async function seedDatabase(force = false) {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
  }

  const existingCount = await User.countDocuments();
  if (existingCount > 0 && !force) {
    console.log(`[Seed] Database already contains ${existingCount} users. Skipping seed.`);
    return;
  }

  console.log('[Seed] Seeding database with initial users, projects, tasks, and comments...');

  // Clear existing collections in dependency order
  await Comment.deleteMany({});
  await Task.deleteMany({});
  await ProjectMember.deleteMany({});
  await Project.deleteMany({});
  await User.deleteMany({});

  const adminHash = await bcrypt.hash('Admin@123', 10);
  const passwordHash = await bcrypt.hash('Password@123', 10);

  // 1. Create Users
  const alice = await User.create({
    name: 'Alice Admin',
    email: 'admin@example.com',
    passwordHash: adminHash,
    role: 'ADMIN',
    isActive: true,
  });

  const priya = await User.create({
    name: 'Priya Manager',
    email: 'pm1@example.com',
    passwordHash,
    role: 'PROJECT_MANAGER',
    isActive: true,
  });

  const paul = await User.create({
    name: 'Paul Manager',
    email: 'pm2@example.com',
    passwordHash,
    role: 'PROJECT_MANAGER',
    isActive: true,
  });

  const maya = await User.create({
    name: 'Maya Member',
    email: 'member1@example.com',
    passwordHash,
    role: 'TEAM_MEMBER',
    isActive: true,
  });

  const mike = await User.create({
    name: 'Mike Member',
    email: 'member2@example.com',
    passwordHash,
    role: 'TEAM_MEMBER',
    isActive: true,
  });

  const vera = await User.create({
    name: 'Vera Viewer',
    email: 'viewer@example.com',
    passwordHash,
    role: 'VIEWER',
    isActive: true,
  });

  const ian = await User.create({
    name: 'Ian Inactive',
    email: 'inactive@example.com',
    passwordHash,
    role: 'TEAM_MEMBER',
    isActive: false, // Deactivated user test
  });

  // 2. Create Projects
  const websiteRedesign = await Project.create({
    name: 'Website Redesign',
    description: 'Complete revamp of customer web application with modern UX design tokens.',
    status: 'ACTIVE',
    createdById: alice._id,
  });

  const mobileApp = await Project.create({
    name: 'Mobile App Launch',
    description: 'Cross-platform mobile rollout for enterprise client field workers.',
    status: 'ACTIVE',
    createdById: alice._id,
  });

  const legacyMigration = await Project.create({
    name: 'Legacy Migration',
    description: 'Decommissioning monolith services. Archived and preserved for compliance.',
    status: 'ARCHIVED',
    createdById: alice._id,
  });

  // 3. Create Project Memberships
  await ProjectMember.create([
    // Website Redesign members
    { projectId: websiteRedesign._id, userId: priya._id, role: 'PROJECT_MANAGER' },
    { projectId: websiteRedesign._id, userId: maya._id, role: 'TEAM_MEMBER' },
    { projectId: websiteRedesign._id, userId: mike._id, role: 'TEAM_MEMBER' },
    { projectId: websiteRedesign._id, userId: vera._id, role: 'VIEWER' },

    // Mobile App Launch members (pm1 and member2 excluded for cross-project 403 test)
    { projectId: mobileApp._id, userId: paul._id, role: 'PROJECT_MANAGER' },
    { projectId: mobileApp._id, userId: maya._id, role: 'TEAM_MEMBER' },
    { projectId: mobileApp._id, userId: vera._id, role: 'VIEWER' },

    // Legacy Migration members
    { projectId: legacyMigration._id, userId: priya._id, role: 'PROJECT_MANAGER' },
    { projectId: legacyMigration._id, userId: maya._id, role: 'TEAM_MEMBER' },
  ]);

  // 4. Create Tasks
  const task1 = await Task.create({
    projectId: websiteRedesign._id,
    title: 'Design high-fidelity mockups for authentication flow',
    description: 'Ensure contrast ratios meet WCAG AA standards and include quick-switch demo profiles.',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    assigneeId: maya._id,
    createdById: priya._id,
    dueDate: '2026-11-01',
    version: 3,
  });

  const task2 = await Task.create({
    projectId: websiteRedesign._id,
    title: 'Implement RBAC middleware on project routes',
    description: 'Enforce server-side policy guards for ADMIN, PROJECT_MANAGER, TEAM_MEMBER, and VIEWER.',
    status: 'TODO',
    priority: 'URGENT',
    assigneeId: mike._id,
    createdById: priya._id,
    dueDate: '2026-10-30',
    version: 1,
  });

  const task3 = await Task.create({
    projectId: websiteRedesign._id,
    title: 'Database migration for optimistic locking version column',
    description: 'Use atomic update with version increment to prevent concurrent overwrite bugs.',
    status: 'DONE',
    priority: 'MEDIUM',
    assigneeId: priya._id,
    createdById: alice._id,
    dueDate: '2026-10-25',
    version: 2,
  });

  const task4 = await Task.create({
    projectId: websiteRedesign._id,
    title: 'Audit comments cascade deletion integrity',
    description: 'Verify deleting a task cascades to comments, and removing a member unassigns their tasks.',
    status: 'IN_REVIEW',
    priority: 'LOW',
    assigneeId: maya._id,
    createdById: priya._id,
    dueDate: '2026-11-05',
    version: 1,
  });

  const task5 = await Task.create({
    projectId: websiteRedesign._id,
    title: 'Write automated end-to-end permission matrix tests',
    description: 'Validate 403 Forbidden responses on all forbidden endpoint invocations.',
    status: 'TODO',
    priority: 'HIGH',
    assigneeId: null,
    createdById: priya._id,
    dueDate: '2026-10-20', // Overdue
    version: 1,
  });

  const task6 = await Task.create({
    projectId: websiteRedesign._id,
    title: 'Client-side toast alerts and conflict resolution modal',
    description: 'Display side-by-side comparison of local vs server fields on 409 VERSION_CONFLICT.',
    status: 'DONE',
    priority: 'MEDIUM',
    assigneeId: mike._id,
    createdById: priya._id,
    dueDate: '2026-10-24',
    version: 4,
  });

  // Mobile App tasks
  await Task.create({
    projectId: mobileApp._id,
    title: 'Setup mobile push notification service hooks',
    description: 'Configure APNS and FCM credentials with local fallback.',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    assigneeId: maya._id,
    createdById: paul._id,
    dueDate: '2026-11-10',
    version: 1,
  });

  // Legacy Migration tasks
  await Task.create({
    projectId: legacyMigration._id,
    title: 'Archive Oracle database dump snapshots',
    description: 'Encrypted cold storage backup completed.',
    status: 'DONE',
    priority: 'LOW',
    assigneeId: priya._id,
    createdById: priya._id,
    dueDate: '2026-09-10',
    version: 1,
  });

  // 5. Create Comments
  await Comment.create([
    {
      taskId: task1._id,
      authorId: priya._id,
      body: 'Maya, please make sure the evaluator quick-fill buttons are prominent on the login page.',
    },
    {
      taskId: task1._id,
      authorId: maya._id,
      body: 'Done! Added one-click cards for Alice (Admin), Priya (PM), Maya (Team Member), and Vera (Viewer).',
    },
    {
      taskId: task1._id,
      authorId: alice._id,
      body: 'Looks great in review. The design tokens and responsive states align with our UX standards.',
    },
  ]);

  console.log('[Seed] Database seeded successfully!');
  console.log(`[Seed] Seeded accounts:
  - Admin:            admin@example.com (Password: Admin@123)
  - Project Manager:  pm1@example.com (Password: Password@123)
  - Project Manager:  pm2@example.com (Password: Password@123)
  - Team Member:      member1@example.com (Password: Password@123)
  - Team Member:      member2@example.com (Password: Password@123)
  - Viewer:           viewer@example.com (Password: Password@123)
  - Inactive Member:  inactive@example.com (Password: Password@123)`);
}

// Run standalone if invoked directly
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase(true)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed Error]:', err);
      process.exit(1);
    });
}
