import express from 'express';
import cors from 'cors';
import dns from "dns"
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import workspaceRoutes from './routes/workspaceRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

if(process.env.ENV !== "production"){
  dns.setServers(["8.8.8.8", "1.1.1.1"])
}

app.get('/api/health', (_req, res) => res.json({ success: true, status: 'healthy' }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/workspaces', workspaceRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/tasks', taskRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;