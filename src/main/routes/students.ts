import { Router, Request, Response } from 'express';
import { computeWarningFlags } from '../utils/studentFlags';
import { getDb } from '../db';

const router = Router();

export const VALID_STATUSES = [
    'processing',
    'waiting',
    'enrolled',
] as const;

router.post('/', (req: Request, res: Response): any => {
    try {
        const db = getDb();
        const { name, contact_number, email, campus, enroll_date, status, comments } = req.body;

        const trimmed = (name || '').trim();
        if (!trimmed) return res.status(400).json({ error: 'Name is required' });

        let finalStatus = 'processing';
        if (status && typeof status === 'string' && (VALID_STATUSES as readonly string[]).includes(status)) {
            finalStatus = status;
        }
		
        const stmt = db.prepare(`
            INSERT INTO students (name, contact_number, email, campus, enroll_date, status, comments)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            trimmed,
            contact_number || null,
            email || null,
            campus || 'Manila',
            enroll_date || null,
            finalStatus,
            (comments || '').trim()
        );

        const newStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(computeWarningFlags(newStudent));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create student' });
    }
});

router.get('/', (req: Request, res: Response) => {
    try {
        const db = getDb();
        const { is_archived, status } = req.query;

        let sql = 'SELECT * FROM students WHERE 1=1';
        const filters: any[] = [];

        sql += is_archived === '1' ? ' AND is_archived = 1' : ' AND is_archived = 0';

        if (status && typeof status === 'string' && (VALID_STATUSES as readonly string[]).includes(status)) {
            sql += ' AND status = ?';
            filters.push(status);
        }

        sql += ' ORDER BY enroll_date ASC, name ASC';

        const students = db.prepare(sql).all(...filters).map((s: any) => {
            const student = computeWarningFlags(s);
            const stats = db.prepare(`
                SELECT
                    SUM(CASE WHEN COALESCE(sr.status, 'pending') = 'done' THEN 1 ELSE 0 END) as done_count,
                    SUM(CASE WHEN COALESCE(sr.status, 'pending') = 'pending' THEN 1 ELSE 0 END) as pending_docs,
                    SUM(CASE WHEN COALESCE(sr.status, 'pending') != 'na' THEN 1 ELSE 0 END) as total_docs
                FROM requirement_templates rt
                LEFT JOIN student_requirements sr ON rt.id = sr.template_id AND sr.student_id = ?
                WHERE rt.is_deleted = 0
            `).get(student.id) as { done_count: number, pending_docs: number, total_docs: number };

            return {
                ...student,
                done_count: stats.done_count || 0,
                pending_docs: stats.pending_docs || 0,
                total_docs: stats.total_docs || 0
            };
        });
        res.json(students);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

router.get('/:id', (req: Request, res: Response): any => {
    try {
        const db = getDb();
        const id = parseInt(req.params.id as string, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid student ID' });

        const student = db.prepare('SELECT * FROM students WHERE id = ?').get(id) as any;
        if (!student) return res.status(404).json({ error: 'Student not found' });

        res.json(computeWarningFlags(student));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch student' });
    }
});

router.put('/:id', (req: Request, res: Response): any => {
    try {
        const db = getDb();
        const id = parseInt(req.params.id as string, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid student ID' });

        const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(id) as any;
        if (!existing) return res.status(404).json({ error: 'Student not found' });

        const { name, contact_number, email, campus, enroll_date, status, comments } = req.body;
        const filters: string[] = [];
        const values: any[] = [];

        if (name !== undefined && typeof name === 'string' && name.trim() !== '') {
            filters.push('name = ?');
            values.push(name.trim());
        }
        if (contact_number !== undefined) {
            filters.push('contact_number = ?');
            values.push(contact_number || null);
        }
        if (email !== undefined) {
            filters.push('email = ?');
            values.push(email || null);
        }
		if (campus !== undefined) {
			filters.push('campus = ?');
            values.push(campus);
		}
        if (enroll_date !== undefined) {
            filters.push('enroll_date = ?');
            values.push(enroll_date || null);
        }
        if (status !== undefined && typeof status === 'string') {
            if (!(VALID_STATUSES as readonly string[]).includes(status)) {
                return res.status(400).json({ error: `Invalid status. Valid values: ${VALID_STATUSES.join(', ')}` });
            }
            filters.push('status = ?');
            values.push(status);
        }
        if (comments !== undefined && typeof comments === 'string') {
            filters.push('comments = ?');
            values.push(comments.trim());
        }

        db.transaction(() => {
            if (filters.length > 0) {
                filters.push("updated_at = datetime('now')");
                const sql = `UPDATE students SET ${filters.join(', ')} WHERE id = ?`;
                values.push(id);
                db.prepare(sql).run(...values);
            }
        })();

        const updated = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
        res.json(computeWarningFlags(updated));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update student' });
    }
});

router.delete('/:id', (req: Request, res: Response): any => {
    try {
        const db = getDb();
        const id = parseInt(req.params.id as string, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid student ID' });

        db.prepare("UPDATE students SET is_archived = 1, updated_at = datetime('now') WHERE id = ?").run(id);
        const archived = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
        res.json({ message: 'Student archived', student: computeWarningFlags(archived) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to archive student' });
    }
});

router.post('/:id/unarchive', (req: Request, res: Response): any => {
    try {
        const db = getDb();
        const id = parseInt(req.params.id as string, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid student ID' });

        db.prepare("UPDATE students SET is_archived = 0, updated_at = datetime('now') WHERE id = ?").run(id);
        res.json({ message: 'Student unarchived' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to unarchive student' });
    }
});

router.delete('/:id/permanent', (req: Request, res: Response): any => {
    try {
        const db = getDb();
        const id = parseInt(req.params.id as string, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid student ID' });

        db.transaction(() => {
            db.prepare('DELETE FROM student_requirements WHERE student_id = ?').run(id);
            db.prepare('DELETE FROM students WHERE id = ?').run(id);
        })();
        res.json({ message: 'Student permanently deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to permanently delete student' });
    }
});

router.get('/:id/requirements', (req: Request, res: Response): any => {
    try {
        const db = getDb();
        const id = parseInt(req.params.id as string, 10);
        
        const rows = db.prepare(`
            SELECT rt.id as template_id, rt.name, rt.description,
                   COALESCE(sr.status, 'pending') as status
            FROM requirement_templates rt
            LEFT JOIN student_requirements sr ON rt.id = sr.template_id AND sr.student_id = ?
            WHERE rt.is_deleted = 0
            ORDER BY rt.display_order ASC, rt.id ASC
        `).all(id);
        
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch requirements' });
    }
});

router.put('/:id/requirements', (req: Request, res: Response): any => {
    try {
        const db = getDb();
        const id = parseInt(req.params.id as string, 10);
        const { requirements } = req.body;

        db.transaction(() => {
            for (const req of requirements) {
                db.prepare('DELETE FROM student_requirements WHERE student_id = ? AND template_id = ?').run(id, req.template_id);
                db.prepare('INSERT INTO student_requirements (student_id, template_id, status) VALUES (?, ?, ?)').run(id, req.template_id, req.status);
            }
        })();
        
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update requirements' });
    }
});

export default router;