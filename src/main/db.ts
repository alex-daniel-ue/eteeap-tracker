import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { getConfig } from './config';

const dataDir = path.join(app.getPath('userData'), 'data');
if (!fs.existsSync(dataDir)) {
	fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.sqlite');
const db: DatabaseType = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact_number TEXT,
        email TEXT,
        campus TEXT DEFAULT 'Manila',
        enroll_date TEXT,
        status TEXT NOT NULL DEFAULT 'processing',
        is_archived INTEGER NOT NULL DEFAULT 0,
        comments TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS requirement_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        is_optional INTEGER NOT NULL DEFAULT 0,
        display_order INTEGER NOT NULL DEFAULT 0,
        is_deleted INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS requirement_aliases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL REFERENCES requirement_templates(id),
        old_name TEXT NOT NULL,
        changed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS student_requirements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL REFERENCES students(id),
        template_id INTEGER NOT NULL REFERENCES requirement_templates(id),
        status TEXT NOT NULL DEFAULT 'na'
            CHECK(status IN ('na','done','pending')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
`);

function performBackup() {
	try {
		const config = getConfig();
		const backupsDir = path.join(app.getPath('userData'), 'backups');

		if (!fs.existsSync(backupsDir)) {
			fs.mkdirSync(backupsDir, { recursive: true });
		}

		const today = new Date().toISOString().split('T')[0];
		const backupFile = path.join(backupsDir, `backup-${today}.eteeap.backup`);

		if (!fs.existsSync(backupFile)) {
			const dump: Record<string, any> = {};
			const tables = ['students', 'requirement_templates', 'requirement_aliases', 'student_requirements'];
			for (const table of tables) {
				dump[table] = db.prepare(`SELECT * FROM ${table}`).all();
			}
			fs.writeFileSync(backupFile, JSON.stringify(dump));

			// Keep only last N backups
			const retention = config.backup_retention_days || 30;
			const files = fs.readdirSync(backupsDir).filter(f => f.startsWith('backup-') && f.endsWith('.eteeap.backup')).sort();
			if (files.length > retention) {
				for (let i = 0; i < files.length - retention; i++) {
					fs.unlinkSync(path.join(backupsDir, files[i]));
				}
			}
		}
	} catch (err) {
		console.error("Backup failed:", err);
	}
}
performBackup();

export function getDb(): DatabaseType {
	return db;
}

export default db;