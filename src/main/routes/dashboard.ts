import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { computeWarningFlags } from '../utils/studentFlags';
import { getConfig } from '../config';

const router = Router();

router.get('/', (_req: Request, res: Response): any => {
    try {
        const db = getDb();
        const config = getConfig();

        // 1. Stats
        const statsRow = db.prepare(`
            SELECT 
                SUM(CASE WHEN is_archived = 0 AND status = 'processing' THEN 1 ELSE 0 END) as processing,
                SUM(CASE WHEN is_archived = 0 AND status = 'waiting' THEN 1 ELSE 0 END) as waiting,
                SUM(CASE WHEN is_archived = 0 AND status = 'enrolled' THEN 1 ELSE 0 END) as enrolled,
                SUM(CASE WHEN is_archived = 1 THEN 1 ELSE 0 END) as archived
            FROM students
        `).get() as any;

        // Compute Overdue via code for simplicity
        const activeStudents = db.prepare("SELECT * FROM students WHERE is_archived = 0").all();
        const activeFlags = activeStudents.map(computeWarningFlags);

        const overdueCount = activeFlags.filter(f => f.isOverdue).length;

        const stats = {
            overdue: overdueCount,
            processing: statsRow.processing || 0,
            waiting: statsRow.waiting || 0,
            enrolled: statsRow.enrolled || 0,
            archived: statsRow.archived || 0
        };

        // 2. Attention Required
        const attentionList = activeFlags
            .filter(f => f.isWarning || f.isOverdue)
            .map(f => ({
                id: f.id,
                name: f.name,
                status: f.isOverdue ? 'overdue' : 'warning',
                months: f.months_elapsed
            }))
            .sort((a, b) => b.months - a.months);

        // 3. Closest to be finished
        const closestRaw = db.prepare(`
            SELECT s.id, s.name, s.email, s.contact_number as phone,
                SUM(CASE WHEN COALESCE(sr.status, 'pending') = 'done' THEN 1 ELSE 0 END) as done_count,
                SUM(CASE WHEN COALESCE(sr.status, 'pending') = 'pending' THEN 1 ELSE 0 END) as pending_count
            FROM students s
            CROSS JOIN requirement_templates rt ON rt.is_deleted = 0
            LEFT JOIN student_requirements sr ON s.id = sr.student_id AND sr.template_id = rt.id
            WHERE s.is_archived = 0 
            GROUP BY s.id
            HAVING pending_count > 0
            ORDER BY (CAST(done_count AS FLOAT) / (done_count + pending_count)) DESC
            LIMIT 6
        `).all() as any[];

        const almostComplete = closestRaw.map(r => ({
            id: r.id, name: r.name, email: r.email, phone: r.phone,
            done_count: r.done_count, pending_count: r.pending_count,
            total_count: r.done_count + r.pending_count,
            progress_pct: Math.round((r.done_count / (r.done_count + r.pending_count)) * 100)
        }));

        // 4. Recent Enrollees
        const recentEnrolleesRaw = db.prepare(`
            SELECT id, name, email, contact_number as phone, enroll_date 
            FROM students 
            WHERE is_archived = 0 AND status = 'enrolled' AND enroll_date IS NOT NULL
        `).all() as any[];

        const now = new Date();
        const recentEnrollees = recentEnrolleesRaw.map(r => {
            const ed = new Date(r.enroll_date);
            const daysAgo = Math.floor((now.getTime() - ed.getTime()) / (1000 * 3600 * 24));
            return {
                ...r,
                daysAgo,
                enroll_date_parsed: ed
            };
        }).filter(r => r.daysAgo <= config.just_enrolled_window_days && r.daysAgo >= 0)
            .map(r => ({ id: r.id, name: r.name, email: r.email, phone: r.phone, daysAgo: r.daysAgo }));

        const shuffledRecent = recentEnrollees.sort(() => 0.5 - Math.random()).slice(0, 3);

        res.json({
            stats,
            attentionList,
            almostComplete,
            recentEnrollees: shuffledRecent
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

export default router;
