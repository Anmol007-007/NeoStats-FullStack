import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(requireAuth, requireAdmin);

// GET /users
router.get(
  '/',
  validate({
    query: z.object({
      page: z.coerce.number().min(1).default(1),
      pageSize: z.coerce.number().min(1).max(100).default(20),
      q: z.string().optional(),
      role: z.enum(['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'VIEWER']).optional(),
      isActive: z
        .enum(['true', 'false'])
        .transform((v) => v === 'true')
        .optional(),
    }),
  }),
  async (req, res, next) => {
    try {
      const { page, pageSize, q, role, isActive } = req.query as any;
      const filter: any = {};

      if (role) filter.role = role;
      if (isActive !== undefined) filter.isActive = isActive;
      if (q) {
        filter.$or = [
          { name: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
        ];
      }

      const total = await User.countDocuments(filter);
      const users = await User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize);

      return res.status(200).json({
        data: users.map((u) => u.toJSON()),
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

// POST /users
router.post(
  '/',
  validate({
    body: z.object({
      name: z.string().min(1).max(100).trim(),
      email: z.string().email().trim().toLowerCase(),
      password: z.string().min(8),
      role: z.enum(['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'VIEWER']),
    }),
  }),
  async (req, res, next) => {
    try {
      const { name, email, password, role } = req.body;
      const existing = await User.findOne({ email });
      if (existing) {
        throw new AppError(409, 'EMAIL_TAKEN', 'A user with this email already exists');
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await User.create({
        name,
        email,
        passwordHash,
        role,
        isActive: true,
      });

      return res.status(201).json({ data: user.toJSON() });
    } catch (err) {
      next(err);
    }
  }
);

// GET /users/:id
router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
    return res.status(200).json({ data: user.toJSON() });
  } catch (err) {
    next(err);
  }
});

// PATCH /users/:id
router.patch(
  '/:id',
  validate({
    body: z.object({
      name: z.string().min(1).max(100).trim().optional(),
      email: z.string().email().trim().toLowerCase().optional(),
      role: z.enum(['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'VIEWER']).optional(),
      password: z.string().min(8).optional(),
    }),
  }),
  async (req, res, next) => {
    try {
      const targetUser = await User.findById(req.params.id);
      if (!targetUser) throw new AppError(404, 'NOT_FOUND', 'User not found');

      // BR-3: Admin cannot change the role of themselves
      if (req.user!.id === targetUser.id && req.body.role && req.body.role !== targetUser.role) {
        throw new AppError(403, 'FORBIDDEN', 'Admins cannot change their own role');
      }

      if (req.body.name) targetUser.name = req.body.name;
      if (req.body.email) {
        const existing = await User.findOne({ email: req.body.email, _id: { $ne: targetUser._id } });
        if (existing) throw new AppError(409, 'EMAIL_TAKEN', 'Email is already taken');
        targetUser.email = req.body.email;
      }
      if (req.body.role) targetUser.role = req.body.role;
      if (req.body.password) {
        targetUser.passwordHash = await bcrypt.hash(req.body.password, 10);
      }

      await targetUser.save();
      return res.status(200).json({ data: targetUser.toJSON() });
    } catch (err) {
      next(err);
    }
  }
);

// POST /users/:id/deactivate
router.post('/:id/deactivate', async (req, res, next) => {
  try {
    // BR-3: Admin cannot deactivate themselves
    if (req.user!.id === req.params.id) {
      throw new AppError(403, 'FORBIDDEN', 'Admins cannot deactivate their own account');
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');

    return res.status(200).json({ data: user.toJSON() });
  } catch (err) {
    next(err);
  }
});

// POST /users/:id/activate
router.post('/:id/activate', async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );
    if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');

    return res.status(200).json({ data: user.toJSON() });
  } catch (err) {
    next(err);
  }
});

export const userRoutes = router;
