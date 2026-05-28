import { app as electronApp } from 'electron';
import express from 'express';
import path from 'path';

import studentsRouter from './routes/students';
import dashboardRouter from './routes/dashboard';
import requirementsRouter from './routes/requirements';
import backupRouter from './routes/backup';
import uploadsRouter from './routes/uploads'
import './db'; 

export async function startServer(port: number): Promise<void> {
    const app = express();
    app.use(express.json());
    
    app.use('/api/students', studentsRouter);
    app.use('/api/dashboard', dashboardRouter);
    app.use('/api/requirements', requirementsRouter);
    app.use('/api/backup', backupRouter);
    app.use('/api/uploads', uploadsRouter)

    const rendererPath = path.join(__dirname, '../renderer');
    app.use(express.static(rendererPath));

    const uploadsPath = path.join(electronApp.getPath('userData'), 'data', 'uploads');
    app.use('/uploads', express.static(uploadsPath));

    app.get(/.*/, (_req, res) => {
        res.sendFile(path.join(rendererPath, 'index.html'));
    });

    return new Promise((resolve) => {
        app.listen(port, () => {
            console.log(`Express server running at http://localhost:${port}`);
            resolve();
        });
    });
}