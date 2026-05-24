import { useState } from 'react';
import { VALID_STATUSES } from './utils/Constants';

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

interface Props {
    student: Student;
    onBack: () => void;
    onRefresh: () => void;
}


export function StudentCard({ student, onBack, onRefresh }: Props) {
    const [edit, setEdit] = useState({
        name: student.name,
        contact_number: student.contact_number || '',
        email: student.email || '',
        enroll_date: student.enroll_date || '',
        status: student.status,
    }); 
    const [message, setMessage] = useState('');

    const handleSave = async () => {
        const res = await fetch(`/api/students/${student.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: edit.name,
                contact_number: edit.contact_number || null,
                email: edit.email || null,
                enroll_date: edit.enroll_date || null,
                status: edit.status,
            }),
        });
        const data = await res.json();
        if (res.ok) {
            setMessage('Student updated!');
            onRefresh();
        } else {
            setMessage('Error: ' + (data.error || 'Unknown'));
        }
    };

    const handleArchive = async () => {
        if (!confirm('Archive this student?')) return;
        const res = await fetch(`/api/students/${student.id}`, { method: 'DELETE' });
        if (res.ok) {
            onRefresh();
        } else {
            const data = await res.json();
            alert('Error: ' + data.error);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '500px', margin: '0 auto' }}>
            <button onClick={onBack}>← Back</button>

            <h2>
                {edit.name || '(no name)'}
                {student.isWarning && <span style={{ color: 'orange' }}> ⚠️</span>}
                {student.isOverdue && <span style={{ color: 'red' }}> ❗</span>}
            </h2>

            <div style={{ marginBottom: '1rem' }}>
                <label>Name</label>
                <input
                    value={edit.name}
                    onChange={e => setEdit({ ...edit, name: e.target.value })}
                    placeholder="Name"
                    style={{ width: '100%' }}
                />
            </div>
            <div style={{ marginBottom: '1rem' }}>
                <label>Contact Number</label>
                <input
                    value={edit.contact_number}
                    onChange={e => setEdit({ ...edit, contact_number: e.target.value })}
                    placeholder="Contact"
                    style={{ width: '100%' }}
                />
            </div>
            <div style={{ marginBottom: '1rem' }}>
                <label>Email</label>
                <input
                    value={edit.email}
                    onChange={e => setEdit({ ...edit, email: e.target.value })}
                    placeholder="Email"
                    style={{ width: '100%' }}
                />
            </div>
            <div style={{ marginBottom: '1rem' }}>
                <label>Enroll Date</label>
                <input
                    type="date"
                    value={edit.enroll_date}
                    onChange={e => setEdit({ ...edit, enroll_date: e.target.value })}
                    style={{ width: '100%' }}
                />
            </div>
            <div style={{ marginBottom: '1rem' }}>
                <label>Status</label>
                <select
                    value={edit.status}
                    onChange={e => setEdit({ ...edit, status: e.target.value })}
                    style={{ width: '100%' }}
                >
                    {VALID_STATUSES.map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
            </div>

            <div style={{ marginTop: '1rem' }}>
                <button onClick={handleSave}>Save Changes</button>
                <button onClick={handleArchive} style={{ marginLeft: '1rem', background: '#eee' }}>
                    Archive
                </button>
            </div>

            {message && <p style={{ marginTop: '1rem', color: 'green' }}>{message}</p>}
        </div>
    );
}