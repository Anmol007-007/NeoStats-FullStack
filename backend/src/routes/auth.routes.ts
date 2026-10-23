import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { mirrorSave } from '../db/connections.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_key_taskflow_9876543210';


router.post(
  '/login',
  validate({
    body: z.object({
      email: z.string().email().trim().toLowerCase(),
      password: z.string().min(1, 'Password is required'),
    }),
  }),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }

      
      if (!user.isActive) {
        throw new AppError(
          403,
          'ACCOUNT_DEACTIVATED',
          'Your account has been deactivated. Contact an administrator.'
        );
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({ data: user.toJSON(), token });
    } catch (err) {
      next(err);
    }
  }
);


router.post(
  ['/signup', '/register'],
  validate({
    body: z.object({
      name: z.string().min(1, 'Name is required').max(100).trim(),
      email: z.string().email('Invalid email address').trim().toLowerCase(),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      role: z.enum(['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'VIEWER']).optional(),
    }),
  }),
  async (req, res, next) => {
    try {
      const { name, email, password, role } = req.body;
      const existing = await User.findOne({ email });
      if (existing) {
        throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await User.create({
        name,
        email,
        passwordHash,
        role: role || 'TEAM_MEMBER',
        isActive: true,
      });

      await mirrorSave('users', user);

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(201).json({ data: user.toJSON(), token });
    } catch (err) {
      next(err);
    }
  }
);


router.post('/logout', (_req, res) => {
  res.clearCookie('token');
  return res.status(204).send();
});


router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'User not found');
    return res.status(200).json({ data: user.toJSON() });
  } catch (err) {
    next(err);
  }
});


router.patch(
  '/me',
  requireAuth,
  validate({
    body: z.object({
      name: z.string().min(1).max(100).trim(),
    }),
  }),
  async (req, res, next) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.user!.id,
        { name: req.body.name },
        { new: true }
      );
      if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
      return res.status(200).json({ data: user.toJSON() });
    } catch (err) {
      next(err);
    }
  }
);


router.post(
  '/change-password',
  requireAuth,
  validate({
    body: z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    }),
  }),
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user!.id);
      if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');

      const matches = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
      if (!matches) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Current password is incorrect');
      }

      user.passwordHash = await bcrypt.hash(req.body.newPassword, 10);
      await user.save();

      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export const authRoutes = router;
