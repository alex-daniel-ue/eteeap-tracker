import { Router, Request, Response } from 'express';
import { getDb } from '../db';

const router = Router();

router.get('/', (req: Request, res: Response): any => {
	try {
		const db = getDb();
		const is_deleted = req.query.is_deleted === '1' ? 1 : 0;
		const templatesResult = db.prepare('SELECT id, name, description, is_optional, display_order FROM requirement_templates WHERE is_deleted = ? ORDER BY display_order ASC, id ASC').all(is_deleted) as any[];

		const templates = templatesResult.map(t => {
			const aliases = db.prepare('SELECT old_name, changed_at FROM requirement_aliases WHERE template_id = ? ORDER BY changed_at DESC').all(t.id);
			return {
				...t,
				aliases: aliases.map((a: any) => a.old_name)
			};
		});

		res.json(templates);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to fetch requirements' });
	}
});

router.post('/:id/restore', (req: Request, res: Response): any => {
	try {
		const db = getDb();
		const id = parseInt(req.params.id as string, 10);
		if (isNaN(id)) {
			return res.status(400).json({ error: 'Invalid template ID' });
		}

		db.prepare("UPDATE requirement_templates SET is_deleted = 0, updated_at = datetime('now') WHERE id = ?").run(id);
		res.json({ message: 'Template restored' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to restore template' });
	}
});

router.delete('/:id/permanent', (req: Request, res: Response): any => {
	try {
		const db = getDb();
		const id = parseInt(req.params.id as string, 10);
		if (isNaN(id)) {
			return res.status(400).json({ error: 'Invalid template ID' });
		}

		db.transaction(() => {
			db.prepare("DELETE FROM student_requirements WHERE template_id = ?").run(id);
			db.prepare("DELETE FROM requirement_aliases WHERE template_id = ?").run(id);
			db.prepare("DELETE FROM requirement_templates WHERE id = ?").run(id);
		})();
		res.json({ message: 'Template permanently deleted' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to delete template permanently' });
	}
});

router.put('/reorder', (req: Request, res: Response): any => {
	try {
		const db = getDb();
		const { order } = req.body;
		if (!Array.isArray(order)) {
			return res.status(400).json({ error: 'Invalid order data' });
		}

		db.transaction(() => {
			const stmt = db.prepare('UPDATE requirement_templates SET display_order = ? WHERE id = ?');
			order.forEach((id, index) => {
				stmt.run(index, id);
			});
		})();

		res.json({ message: 'Order updated' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to reorder templates' });
	}
});

router.post('/', (req: Request, res: Response): any => {
	try {
		const db = getDb();
		const { name, description, is_optional } = req.body;

		if (!name || !name.trim()) {
			return res.status(400).json({ error: 'Name is required' });
		}

		const maxOrderRow = db.prepare('SELECT MAX(display_order) as m FROM requirement_templates').get() as any;
		const nextOrder = (maxOrderRow.m || 0) + 1;

		const stmt = db.prepare(`
		    INSERT INTO requirement_templates (name, description, is_optional, display_order)
		    VALUES (?, ?, ?, ?)
	    `);

		const result = stmt.run(name.trim(), description || null, is_optional ? 1 : 0, nextOrder);
		const newTemplate = db.prepare('SELECT id, name, description, is_optional, display_order FROM requirement_templates WHERE id = ?').get(result.lastInsertRowid);

		res.status(201).json(newTemplate);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to create requirement template' });
	}
});

router.put('/:id', (req: Request, res: Response): any => {
	try {
		const db = getDb();
		const id = parseInt(req.params.id as string, 10);
		if (isNaN(id)) {
			return res.status(400).json({ error: 'Invalid template ID' });
		}

		const { name, description, is_optional } = req.body;
		const existing = db.prepare('SELECT * FROM requirement_templates WHERE id = ?').get(id) as any;
		if (!existing) {
			return res.status(404).json({ error: 'Template not found' });
		}

		const filters: string[] = [];
		const values: any[] = [];

		if (name !== undefined) {
			filters.push('name = ?');
			values.push(name.trim());
		}
		if (description !== undefined) {
			filters.push('description = ?');
			values.push(description);
		}
		if (is_optional !== undefined) {
			filters.push('is_optional = ?');
			values.push(is_optional ? 1 : 0);
		}

		if (filters.length > 0) {
			db.transaction(() => {
				if (name !== undefined && name.trim() !== existing.name) {
					const newName = name.trim();

					// If the new name is in aliases, pop it out
					const aliasCheck = db.prepare('SELECT id FROM requirement_aliases WHERE template_id = ? AND old_name = ?').get(id, newName);
					if (aliasCheck) {
						db.prepare('DELETE FROM requirement_aliases WHERE template_id = ? AND old_name = ?').run(id, newName);
					}

					// Insert the old name as a new alias
					db.prepare('INSERT INTO requirement_aliases (template_id, old_name) VALUES (?, ?)').run(id, existing.name);
				}

				filters.push("updated_at = datetime('now')");
				values.push(id);
				db.prepare(`UPDATE requirement_templates SET ${filters.join(', ')} WHERE id = ?`).run(...values);
			})();
		}

		const updated = db.prepare('SELECT id, name, description, is_optional, display_order FROM requirement_templates WHERE id = ?').get(id);
		res.json(updated);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to update template' });
	}
});

router.delete('/:id', (req: Request, res: Response): any => {
	try {
		const db = getDb();
		const id = parseInt(req.params.id as string, 10);
		if (isNaN(id)) {
			return res.status(400).json({ error: 'Invalid template ID' });
		}

		db.prepare("UPDATE requirement_templates SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?").run(id);
		res.json({ message: 'Template deleted' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to delete template' });
	}
});

export default router;
