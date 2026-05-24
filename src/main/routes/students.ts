import { Router, Request, Response } from 'express';
import db from '../db';
import { computeStudentFlags } from '../utils/studentFlags';

const router = Router();

const VALID_STATUSES = [
	'processing',
	'ongoing',
	'enrolled',
	'graduating',
	'archived',
  ] as const;


/** GET /api/students */
async function listStudents(req: Request, res: Response) {
	try {
		const { archived, status } = req.query;

		let sql = 'SELECT * FROM students WHERE 1=1';
		const params: any[] = [];

		sql += archived === '1' ? ' AND is_archived = 1' : ' AND is_archived = 0';

		// Avoid null, non-string (can be string[] | undefined), and invalid status values
		if (status && typeof status === 'string' && (VALID_STATUSES as readonly string[]).includes(status)) {
			sql += ' AND status = ?';
			params.push(status);
		}

		sql += ' ORDER BY name ASC';

		const students = db.prepare(sql).all(...params).map(computeStudentFlags);
		res.json(students);
	
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to fetch students' });
	}
}

/** GET /api/students/:id */
async function getStudent(req: Request, res: Response) {
	try {
		const id = parseInt(req.params.id, 10);
		if (isNaN(id)) {
			return res.status(400).json({ error: 'Invalid student ID' });
		}

		const student = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
		if (!student) {
			return res.status(404).json({ error: 'Student not found' });
		}

		res.json(computeStudentFlags(student));
	
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to fetch student' });
	}
}


/** POST /api/students */
async function createStudent(req: Request, res: Response) {
	try {
		const { name, contact_number, email, enroll_date, status } = req.body;

		// Validate name
		const trimmmed: string = (name || '').trim()
		if (!trimmmed && typeof name !== 'string') {
			return res.status(400).json({ error: 'Name is required' });
		}

		// Determine final status (default: processing)
		let finalStatus = 'processing';
		if (status && typeof status === 'string' && (VALID_STATUSES as readonly string[]).includes(status)) {
			finalStatus = status;
		}

		// If enrolling now, enroll_date is required
		// if (finalStatus === 'enrolled') {
		// 	if (!enroll_date || typeof enroll_date !== 'string') {
		// 		res.status(400).json({ error: 'enroll_date is required when status is "enrolled"' });
		// 		return;
		// 	}
		// 	// Basic ISO date check
		// 	if (isNaN(Date.parse(enroll_date))) {
		// 		res.status(400).json({ error: 'enroll_date must be a valid date' });
		// 		return;
		// 	}
		// }

		const stmt = db.prepare(`
		INSERT INTO students (name, contact_number, email, enroll_date, status)
		VALUES (?, ?, ?, ?, ?)
	  `);

		const result = stmt.run(
			name.trim(),
			contact_number || null,
			email || null,
			enroll_date || null,
			finalStatus
		);

		const newStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(result.lastInsertRowid);
		res.status(201).json(computeStudentFlags(newStudent));
	
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to create student' });
	}
}

/** PUT /api/students/:id */
async function updateStudent(req: Request, res: Response) {
	try {
		const id = parseInt(req.params.id, 10); // Parse integer in base 10
		if (isNaN(id)) {
			return res.status(400).json({ error: 'Invalid student ID' });
		}

		const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(id) as any;
		if (!existing) {
			return res.status(404).json({ error: 'Student not found' });
		}

		const { name, contact_number, email, enroll_date, status } = req.body;
		const updates: string[] = [];
		const params: any[] = [];

		// Name
		if (name !== undefined && typeof name === 'string' && name.trim() !== '') {
			updates.push('name = ?');
			params.push(name.trim());
		}
		// Contact number
		if (contact_number !== undefined) {
			updates.push('contact_number = ?');
			params.push(contact_number || null);
		}
		// Email
		if (email !== undefined) {
			updates.push('email = ?');
			params.push(email || null);
		}
		// Enroll date
		if (enroll_date !== undefined) {
			// if (enroll_date && isNaN(Date.parse(enroll_date))) {
			// 	res.status(400).json({ error: 'enroll_date must be a valid date' });
			// 	return;
			// }
			updates.push('enroll_date = ?');
			params.push(enroll_date || null);
		}
		// Status
		if (status !== undefined && typeof status === 'string') {
			if (!(VALID_STATUSES as readonly string[]).includes(status)) {
				return res.status(400).json({ error: `Invalid status. Valid values: ${VALID_STATUSES.join(', ')}` });
			}

			// if (status === 'enrolled') {
			// 	const effectiveEnrollDate = enroll_date ?? existing.enroll_date;
			// 	if (!effectiveEnrollDate) {
			// 		return res.status(400).json({ error: 'enroll_date is required to set status to "enrolled"' });
			// 	}
			// }
			
			updates.push('status = ?');
			params.push(status);
		}

		if (updates.length === 0) {
			return res.status(400).json({ error: 'No valid fields provided' });
		}

		// Always update timestamp
		updates.push("updated_at = datetime('now')");

		const sql = `UPDATE students SET ${updates.join(', ')} WHERE id = ?`;
		params.push(id);

		db.prepare(sql).run(...params);

		const updated = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
		res.json(computeStudentFlags(updated));
	
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to update student' });
	}
}

/** DELETE /api/students/:id (archive) */
async function archiveStudent(req: Request, res: Response) {
	try {
		const id = parseInt(req.params.id, 10); // Parse integer in base 10
		if (isNaN(id)) {
			return res.status(400).json({ error: 'Invalid student ID' });
		}

		const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(id) as any;
		if (!existing) {
			return res.status(404).json({ error: 'Student not found' });
		}

		db.prepare("UPDATE students SET is_archived = 1, updated_at = datetime('now') WHERE id = ?").run(id);

		const archived = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
		res.json({ message: 'Student archived', student: computeStudentFlags(archived) });
		
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to archive student' });
	}
}


router.get('/', listStudents);
router.get('/:id', getStudent);
router.post('/', createStudent);
router.put('/:id', updateStudent);
router.delete('/:id', archiveStudent);




export default router;