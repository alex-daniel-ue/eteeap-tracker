const WARNING_MONTHS = 18;
const OVERDUE_MONTHS = 24;

export function computeStudentFlags(student: any) {
	const flags = {
		isWarning: false,
		isOverdue: false
	};

	if (!student.enroll_date) {
		return { ...student, ...flags };
	}

	const enrollDate = new Date(student.enroll_date);
	if (isNaN(enrollDate.getTime())) {
		return { ...student, ...flags };
	}

	const now = new Date();
	const diffMonths =
		(now.getFullYear() - enrollDate.getFullYear()) * 12 +
		(now.getMonth() - enrollDate.getMonth());

	flags.isWarning = diffMonths >= WARNING_MONTHS && diffMonths < OVERDUE_MONTHS;
	flags.isOverdue = diffMonths >= OVERDUE_MONTHS;

	return { ...student, ...flags };
}