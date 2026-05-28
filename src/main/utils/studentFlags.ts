import { getConfig } from '../config';

export function computeWarningFlags(student: any) {
    const flags = {
        isWarning: false,
        isOverdue: false,
        months_elapsed: 0
    };

    if (!student?.enroll_date || student.status !== 'enrolled') {
        return { ...student, ...flags };
    }

    const enrollDate = new Date(student.enroll_date);
    
    if (isNaN(enrollDate.getTime())) {
        return { ...student, ...flags };
    }

    const now = new Date();
    const monthDifference =
        (now.getFullYear() - enrollDate.getFullYear()) * 12 +
        (now.getMonth() - enrollDate.getMonth());

    const config = getConfig();
    flags.isWarning = monthDifference >= config.warning_threshold_months && monthDifference < config.overdue_threshold_months;
    flags.isOverdue = monthDifference >= config.overdue_threshold_months;
    flags.months_elapsed = monthDifference;

    return { ...student, ...flags };
}