import fs from 'fs';
import path from 'path';
import { app } from 'electron';

let config = {
    email_reminder_interval_days: 14,
    just_enrolled_window_days: 30,
    warning_threshold_months: 18,
    overdue_threshold_months: 24,
    backup_retention_days: 30
};

const dataDir = path.join(app.getPath('userData'), 'data');
const configPath = path.join(dataDir, 'config.json');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

if (fs.existsSync(configPath)) {
    try {
        const fileData = fs.readFileSync(configPath, 'utf-8');
        config = { ...config, ...JSON.parse(fileData) };
    } catch(e) {
        console.error("Failed to parse config.json, using defaults.", e);
    }
} else {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function getConfig() {
    return config;
}