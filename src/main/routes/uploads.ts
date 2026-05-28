// src\main\routes\uploads.ts
import { Router, Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/students/:studentId/requirements/:reqId', upload.single('file'), (req: Request, res: Response): any => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file provided' });

        const { studentId, reqId } = req.params;
        const fileBuffer = req.file.buffer;

        const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        const ext = path.extname(req.file.originalname);
        const baseName = path.basename(req.file.originalname, ext);
        const shortHash = hash.substring(0, 8);
        const newFileName = `${baseName}_${shortHash}${ext}`;

        const uploadDir = path.join(app.getPath('userData'), 'data', 'uploads', 'students', studentId as string, reqId as string);

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const existingFiles = fs.readdirSync(uploadDir);
        const hashMatch = existingFiles.find(f => f.includes(`_${shortHash}${ext}`));

        if (hashMatch) {
            if (hashMatch !== newFileName) {
                fs.renameSync(path.join(uploadDir, hashMatch), path.join(uploadDir, newFileName));
            }
        } else {
            fs.writeFileSync(path.join(uploadDir, newFileName), fileBuffer);
        }

        res.json({ message: 'File uploaded successfully', fileName: newFileName, url: `/uploads/students/${studentId}/${reqId}/${newFileName}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'File upload failed' });
    }
});

router.get('/students/:studentId/requirements/:reqId', (req: Request, res: Response): any => {
    try {
        const { studentId, reqId } = req.params;
        const uploadDir = path.join(app.getPath('userData'), 'data', 'uploads', 'students', studentId as string, reqId as string);

        if (!fs.existsSync(uploadDir)) {
            return res.json([]);
        }

        // Only return files that are not hidden
        const files = fs.readdirSync(uploadDir)
            .filter(file => !file.startsWith('.hidden.'))
            .map(file => ({
                name: file,
                url: `/uploads/students/${studentId}/${reqId}/${file}`
            }));

        res.json(files);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch files' });
    }
});

router.delete('/students/:studentId/requirements/:reqId/:fileName', (req: Request, res: Response): any => {
    try {
        const { studentId, reqId, fileName } = req.params;
        const uploadDir = path.join(app.getPath('userData'), 'data', 'uploads', 'students', studentId as string, reqId as string);
        const filePath = path.join(uploadDir, fileName as string);

        if (fs.existsSync(filePath)) {
            const hiddenPath = path.join(uploadDir, `.hidden.${fileName}`);
            fs.renameSync(filePath, hiddenPath);
            return res.json({ success: true, message: 'File hidden' });
        }

        res.status(404).json({ error: 'File not found' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to hide file' });
    }
});

export default router;