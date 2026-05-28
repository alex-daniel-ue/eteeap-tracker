import { useState, useEffect } from 'react';
import { Card, Table, Badge, ProgressBar } from 'react-bootstrap';
import StudentDrawer from '../components/StudentDrawer';

export default function Dashboard() {
  const [stats, setStats] = useState({ overdue: 0, processing: 0, waiting: 0, enrolled: 0, archived: 0 });
  const [attentionList, setAttentionList] = useState<any[]>([]);
  const [almostComplete, setAlmostComplete] = useState<any[]>([]);
  const [recentEnrollees, setRecentEnrollees] = useState<any[]>([]);

  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showDrawer, setShowDrawer] = useState(false);

  const fetchDashboard = () => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          console.error('Failed to fetch dashboard:', data.error);
          return;
        }
        setStats(data.stats || { overdue: 0, processing: 0, waiting: 0, enrolled: 0, archived: 0 });
        setAttentionList(data.attentionList || []);
        setAlmostComplete(data.almostComplete || []);
        setRecentEnrollees(data.recentEnrollees || []);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleRowClick = async (id: number) => {
    try {
      const res = await fetch(`/api/students/${id}`);
      const data = await res.json();
      if (data.id) {
        setSelectedStudent(data);
        setShowDrawer(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const closeDrawer = () => {
    setShowDrawer(false);
    setSelectedStudent(null);
    fetchDashboard();
  };

  return (
    <>
      <div className="mb-4">
        <h1 className="h4 fw-bold text-dark">ETEEAP Dashboard</h1>
      </div>

      {/* Attention required */}
      {attentionList.length > 0 && (
        <div className="row justify-content-center mb-5">
          <div className="col-xl-7 col-lg-9">
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-dark text-white py-3 text-center">
                <h5 className="mb-0 fw-bold fs-6"><i className="bi bi-exclamation-triangle-fill text-danger me-2"></i>ATTENTION REQUIRED!</h5>
              </Card.Header>
              <Table hover className="mb-0 text-center align-middle" style={{ fontSize: '0.9rem' }}>
                <thead className="table-light">
                  <tr><th>Student</th><th>Status</th><th>Timeline</th></tr>
                </thead>
                <tbody>
                  {attentionList.map(student => (
                    <tr key={student.id}
                      className={`clickable-row ${student.status === 'overdue' ? 'table-danger-subtle border-danger-subtle' : 'table-warning-subtle border-warning-subtle'}`}
                      onClick={() => handleRowClick(student.id)} >
                      <td className="fw-bold text-dark">{student.name}</td>
                      <td>
                        <Badge bg={student.status === 'overdue' ? 'danger' : 'warning'} text={student.status === 'warning' ? 'dark' : 'white'}>
                          {student.status === 'overdue' ? 'Overdue' : 'Warning'}
                        </Badge>
                      </td>
                      <td className={student.status === 'overdue' ? 'text-danger fw-semibold' : 'text-warning-emphasis fw-semibold'}>
                        {student.months} months elapsed
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          </div>
        </div>
      )}

      {/* Metrics grid */}
      <div className="row g-3 mb-5">
        <div className="col-md-6"><StatCard title="Overdue" val={stats.overdue} c="danger" /></div>
        <div className="col-md-6"><StatCard title="Processing" val={stats.processing} c="warning" textC="text-warning-emphasis" /></div>
        <div className="col-md-4"><StatCard title="Waiting for Enrollment" val={stats.waiting} c="primary" /></div>
        <div className="col-md-4"><StatCard title="Enrolled" val={stats.enrolled} c="success" /></div>
        <div className="col-md-4"><StatCard title="Archived" val={stats.archived} c="secondary" /></div>
      </div>

      {/* Almost finished */}
      <div className="mb-5">
        <h6 className="fw-bold mb-3 text-dark">Almost finished...</h6>
        <div className="row row-cols-1 row-cols-md-3 g-3">
          {almostComplete.length === 0 ? (
            <div className="col-12">
              <div className="text-muted text-center py-5 border rounded shadow-sm" style={{ backgroundColor: '#fdfdfd' }}>
                <i className="bi bi-inbox fs-2 d-block mb-2 text-black-50"></i>
                <span className="text-secondary fw-semibold">All finished...</span>
              </div>
            </div>
          ) : (
            almostComplete.map((student: any) => (
              <div className="col" key={student.id}>
                <Card className="border-0 shadow-sm h-100 clickable-card" style={{ cursor: 'pointer' }} onClick={() => handleRowClick(student.id)}>
                  <Card.Body className="py-3">
                    <div className="fw-bold text-dark mb-1">{student.name}</div>
                    <div className="text-muted small mb-3">
                      <div className="mb-1"><i className="bi bi-envelope me-1"></i> {student.email || '—'}</div>
                      <div><i className="bi bi-telephone me-1"></i> {student.phone || '—'}</div>
                    </div>
                    <div className="bg-light p-2 rounded small">
                      <div className="d-flex justify-content-between mb-1">
                        <span className="fw-bold text-dark">Requirement Progress</span>
                        <span className="text-muted fw-bold">{student.done_count} / {student.total_count}</span>
                      </div>
                      <ProgressBar
                        now={student.progress_pct}
                        variant={student.progress_pct < 50 ? 'danger' : student.progress_pct < 100 ? 'warning' : 'success'}
                        style={{ height: '8px' }}
                      />
                    </div>
                  </Card.Body>
                </Card>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recently enrolled */}
      <div className="mb-4">
        <h6 className="fw-bold text-dark mb-3">Check up on recently enrolled students....</h6>
        <div className="row g-3">
          {recentEnrollees.length === 0 ? (
            <div className="col-4">
              <div className="text-muted text-center py-5 border rounded shadow-sm" style={{ backgroundColor: '#fdfdfd' }}>
                <i className="bi bi-inbox fs-2 d-block mb-2 text-black-50"></i>
                <span className="text-secondary fw-semibold">No one enrolled recently...</span>
              </div>
            </div>
          ) : (
            recentEnrollees.map((student: any) => (
              <div className="col-md-4" key={student.id}>
                <Card className="border-0 shadow-sm bg-white h-100">
                  <Card.Body className="d-flex flex-column justify-content-between p-3">
                    <div>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h6 className="fw-bold mb-0 text-dark">{student.name}</h6>
                      </div>
                      <Badge bg="light" text="success" className="border border-success-subtle mb-3">Enrolled {student.daysAgo} days ago</Badge>
                      <div className="text-muted small">
                        <div className="mb-1"><i className="bi bi-envelope me-2"></i>{student.email || 'N/A'}</div>
                        <div><i className="bi bi-telephone me-2"></i>{student.phone || 'N/A'}</div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </div>
            ))
          )}
        </div>
      </div>

      {showDrawer && <StudentDrawer
        show={showDrawer}
        student={selectedStudent}
        handleClose={closeDrawer}
        onSave={() => { fetchDashboard(); closeDrawer(); }}
      />}
    </>
  );
}

function StatCard({ title, val, c, textC }: { title: string; val: number; c: string; textC?: string }) {
  const textColorClass = textC || `text-${c}-emphasis`;
  return (
    <Card className={`border-0 shadow-sm py-2 border-start border-${c} border-3 grad-${c} h-100`}>
      <Card.Body>
        <div className={`${textColorClass} small text-uppercase fw-bold`}>{title}</div>
        <div className={`fs-3 fw-bold ${c === 'danger' ? 'text-danger' : 'text-dark'}`}>{val === 0 ? '—' : val}</div>
      </Card.Body>
    </Card>
  );
}