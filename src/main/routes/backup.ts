import { Router, Request, Response } from 'express';
import { getDb } from '../db';

const router = Router();

const tables = ['students', 'requirement_templates', 'requirement_aliases', 'student_requirements'];

router.get('/export', (_req: Request, res: Response) => {
    try {
        const db = getDb();
        const dump: Record<string, any> = {};
        
        for (const table of tables) {
            dump[table] = db.prepare(`SELECT * FROM ${table}`).all();
        }
        
        const today = new Date().toISOString().split('T')[0];
        const filename = `backup-${today}.eteeap.backup`;
        
        res.setHeader('Content-disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-type', 'application/json');
        res.send(JSON.stringify(dump));
    } catch (err) {
        console.error("Manual export failed:", err);
        res.status(500).json({ error: 'Export failed' });
    }
});

router.post('/import', (req: Request, res: Response): any => {
    try {
        const dump = req.body;
        if (!dump || typeof dump !== 'object') {
            return res.status(400).json({ error: 'Invalid backup content' });
        }
        
        const db = getDb();
        
        db.transaction(() => {
            for (const table of tables) {
                if (dump[table] && Array.isArray(dump[table])) {
                    db.prepare(`DELETE FROM ${table}`).run();
                    
                    if (dump[table].length > 0) {
                        const cols = Object.keys(dump[table][0]);
                        const placeholders = cols.map(() => '?').join(', ');
                        const insertStmt = db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`);
                        
                        for (const row of dump[table]) {
                            const values = cols.map(c => row[c]);
                            insertStmt.run(...values);
                        }
                    }
                }
            }
        })();

        res.json({ message: 'Database restored successfully from backup.' });
    } catch(err) {
        console.error("Manual import failed:", err);
        res.status(500).json({ error: 'Import failed' });
    }
});

export default router;