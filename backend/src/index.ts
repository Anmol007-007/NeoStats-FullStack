import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import { authRoutes } from './routes/auth.routes.js';
import { userRoutes } from './routes/users.routes.js';
import { projectRoutes } from './routes/projects.routes.js';
import { memberRoutes } from './routes/members.routes.js';
import { taskRoutes } from './routes/tasks.routes.js';
import { commentRoutes } from './routes/comments.routes.js';
import { dashboardRoutes } from './routes/dashboard.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://aids23anmolsoni_db_user:7QlJdlhPLInSZgoc@fullstack.tlfwh2o.mongodb.net/pm_platform?retryWrites=true&w=majority';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';


app.use(
  cors({
    origin: [FRONTEND_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());


app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
  });
  next();
});


app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});


app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/projects', memberRoutes);
app.use('/api/v1', taskRoutes);
app.use('/api/v1', commentRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

import { waitForDbConnections } from './db/connections.js';


app.use(errorHandler);


async function startServer() {
  try {
    console.log('[Database] Connecting to MongoDB Atlas multi-databases...');
    await waitForDbConnections();
    console.log('[Database] Connected to users_db, projects_db, and tasks_db successfully.');

    app.listen(PORT, () => {
      console.log(`[Server] Backend API running at http://localhost:${PORT}/api/v1`);
      console.log(`[Server] Health check available at http://localhost:${PORT}/health`);
    });
  } catch (err) {
    console.error('[Database Error] Failed to connect to MongoDB:', err);
    process.exit(1);
  }
}

startServer();
