import { useEffect, useState } from 'react';
import { StudentCard } from './StudentCard';

interface Student {
  id: number;
  name: string;
  contact_number?: string;
  email?: string;
  enroll_date?: string;
  status: string;
  isWarning: boolean;
  isOverdue: boolean;
}

export function StudentTest() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const fetchStudents = async () => {
    const res = await fetch('/api/students');
    const data = await res.json();
    setStudents(data);
  };

  useEffect(() => { fetchStudents(); }, []);

  if (selectedId) {
    const student = students.find(s => s.id === selectedId);
    return (
      <StudentCard
        student={student!}
        onBack={() => setSelectedId(null)}
        onRefresh={() => { fetchStudents(); setSelectedId(null); }}
      />
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Student List</h1>
      <table>
        <thead>
          <tr>
            <th>ID</th><th>Name</th><th>Status</th><th>Enroll Date</th><th>Warn</th><th>Overdue</th>
          </tr>
        </thead>
        <tbody>
          {students.map(s => (
            <tr
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              style={{ cursor: 'pointer' }}
            >
              <td>{s.id}</td>
              <td>{s.name}</td>
              <td>{s.status}</td>
              <td>{s.enroll_date || ''}</td>
              <td style={{ color: s.isWarning ? 'orange' : 'inherit' }}>
                {s.isWarning ? '⚠️' : ''}
              </td>
              <td style={{ color: 'red' }}>{s.isOverdue ? '❗' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}