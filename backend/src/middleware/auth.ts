import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { AppError } from './errorHandler.js';
import { GlobalRole } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_key_taskflow_9876543210';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: GlobalRole;
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null);

    if (!token) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      throw new AppError(401, 'UNAUTHENTICATED', 'Invalid or expired session');
    }

    // Check user in DB per-request to enforce immediate deactivation (BR-2)
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new AppError(401, 'UNAUTHENTICATED', 'User no longer exists');
    }

    if (!user.isActive) {
      throw new AppError(
        403,
        'ACCOUNT_DEACTIVATED',
        'Your account has been deactivated. Contact an administrator.'
      );
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return next(new AppError(403, 'FORBIDDEN', 'Administrator access required'));
  }
  next();
}
