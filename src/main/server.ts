import express from 'express';
import path from 'path';
import studentsRouter from './routes/students';

import './db'; // Initializes the database and creates tables if they don't exist


export async function startServer(port: number): Promise<void> {
    const app = express();

    app.use(express.json());
    app.use('/api/students', studentsRouter);

    const rendererPath = path.join(__dirname, '../../out/renderer');
    app.use(express.static(rendererPath));

    // unnamed wildcards like '/', '/*' are no longer supported
    // using native JS regex instead
    // app.get(/.*/, (_req, res) => {
    //     res.sendFile(path.join(rendererPath, 'index.html'));
    // });

    return new Promise((resolve) => {
        app.listen(port, () => {
            // NOT the Vite dev server! This serves the built renderer (for production) 
            console.log(`EXpress server running at http://localhost:${port}`);
            resolve();
        });
    });
}