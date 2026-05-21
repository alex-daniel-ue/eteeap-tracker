import express from 'express';
import path from 'path';


export async function startServer(port: number): Promise<void> {
    const app = express();

    const rendererPath = path.join(__dirname, '../../out/renderer');
    app.use(express.static(rendererPath));
    
    // unnamed wildcards like '/', '/*' are no longer supported
    // using native JS regex instead
    app.get(/.*/, (_req, res) => {
        res.sendFile(path.join(rendererPath, 'index.html'));
    });
    
    app.listen(port, () => {
        // NOT the Vite dev server! This serves the built renderer (for production) 
        console.log(`Express server running at http://localhost:${port}`);
    });
}