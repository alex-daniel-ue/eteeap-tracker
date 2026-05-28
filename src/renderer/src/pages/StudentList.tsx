import { useState, useEffect, useMemo } from 'react';
import { Card, Table, Badge, Form, InputGroup, Button, ProgressBar, Pagination } from 'react-bootstrap';
import StudentDrawer from '../components/StudentDrawer';
import Fuse from 'fuse.js';

export default function StudentList() {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showDrawer, setShowDrawer] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchStudents = () => {
    fetch('/api/students?is_archived=0')
      .then(res => res.json())
      .then(data => setStudents(data))
      .catch(console.error);
  }

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    let result = students;

    if (filterStatus) {
      result = result.filter(s => s.status === filterStatus);
    }

    let searchActive = false;
    if (searchQuery.trim()) {
      searchActive = true;
      const fuse = new Fuse(result, {
        keys: ['name', 'email', 'contact_number'],
        threshold: 0.3,
      });
      result = fuse.search(searchQuery).map(r => r.item);
    }

    if (sortBy !== 'relevance' || !searchActive) {
      result = [...result].sort((a, b) => {
        if (sortBy === 'enroll_date_asc' || sortBy === 'relevance') {
          if (!a.enroll_date && b.enroll_date) return 1;
          if (a.enroll_date && !b.enroll_date) return -1;
          if (a.enroll_date === b.enroll_date) return a.name.localeCompare(b.name);
          return new Date(a.enroll_date).getTime() - new Date(b.enroll_date).getTime();
        } else if (sortBy === 'enroll_date_desc') {
          if (!a.enroll_date && b.enroll_date) return 1;
          if (a.enroll_date && !b.enroll_date) return -1;
          if (a.enroll_date === b.enroll_date) return a.name.localeCompare(b.name);
          return new Date(b.enroll_date).getTime() - new Date(a.enroll_date).getTime();
        } else if (sortBy === 'name_asc') {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });
    }

    return result;
  }, [students, searchQuery, filterStatus, sortBy]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleRowClick = (student) => {
    fetch(`/api/students/${student.id}`)
      .then(res => res.json())
      .then(data => {
        setSelectedStudent(data);
        setShowDrawer(true);
      })
      .catch(console.error);
  };

  const handleNewRegistration = () => {
    setSelectedStudent({ name: '', status: 'processing', comments: '' });
    setShowDrawer(true);
  }

  const handleSaveStudent = () => {
    setShowDrawer(false);
    fetchStudents();
  };

  const handleArchive = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to archive this student?")) return;
    await fetch(`/api/students/${id}`, { method: 'DELETE' });
    fetchStudents();
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
        <div>
          <h1 className="h4 fw-bold text-dark mb-1">Student Directory</h1>
        </div>
        <Button variant="dark" onClick={handleNewRegistration}>Register Student</Button>
      </div>

      <div className="row justify-content-center">
        <div className="col-12" style={{ width: '80%' }}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="py-3">
              <div className="row g-2 align-items-center">
                <div className="col-md-5">
                  <InputGroup>
                    <InputGroup.Text className="bg-white border-end-0 text-muted"><i className="bi bi-search"></i></InputGroup.Text>
                    <Form.Control className="border-start-0" placeholder="Search by name, email, phone..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
                  </InputGroup>
                </div>
                <div className="col-md-3">
                  <InputGroup>
                    <InputGroup.Text className="bg-light text-muted small">Filter by...</InputGroup.Text>
                    <Form.Select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}>
                      <option value="">All statuses</option>
                      <option value="processing">Processing</option>
                      <option value="waiting">Waiting for Enrollment</option>
                      <option value="enrolled">Enrolled</option>
                    </Form.Select>
                  </InputGroup>
                </div>
                <div className="col-md-4">
                  <InputGroup>
                    <InputGroup.Text className="bg-light text-muted small">Sort by...</InputGroup.Text>
                    <Form.Select value={sortBy} onChange={e => { setSortBy(e.target.value); setCurrentPage(1); }}>
                      <option value="relevance">Relevance</option>
                      <option value="enroll_date_asc">Enroll date (earliest first)</option>
                      <option value="enroll_date_desc">Enroll date (latest first)</option>
                      <option value="name_asc">Name (A-Z)</option>
                    </Form.Select>
                  </InputGroup>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <div className="table-responsive">
          <Table hover className="mb-0 align-middle" style={{ fontSize: '0.9rem' }}>
            <thead className="table-light text-uppercase" style={{ fontSize: '0.75rem' }}>
              <tr>
                <th className="ps-3" style={{ width: '20%' }}>Student</th>
                <th style={{ width: '10%' }}>Contact No</th>
                <th style={{ width: '10%' }}>Campus</th>
                <th style={{ width: '15%' }}>Enroll Date</th>
                <th style={{ width: '15%' }}>Program Status</th>
                <th style={{ width: '15%' }}>Requirement Status</th>
                <th className="text-end pe-3" style={{ width: '15%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.map(student => (
                <tr key={student.id} onClick={() => handleRowClick(student)} className="clickable-row">
                  <td className="ps-3">
                    <div className="d-flex align-items-center gap-2">
                      <div className="fw-bold text-dark">{student.name}</div>
                      {student.isOverdue && <Badge bg="danger">Overdue</Badge>}
                      {student.isWarning && <Badge bg="warning" text="dark">Warning</Badge>}
                    </div>
                    <span className="text-muted small">{student.email || '—'}</span>
                  </td>
                  <td><small className="text-dark fw-semibold">{student.contact_number || '—'}</small></td>
                  <td><small className="text-dark fw-semibold">{student.campus || 'Manila'}</small></td>
                  <td>
                    {student.enroll_date ? (
                      <>
                        <div className="text-dark">{student.enroll_date}</div>
                        <small className="text-muted">{student.months_elapsed} months elapsed</small>
                      </>
                    ) : (
                      <div className="text-muted fst-italic">—</div>
                    )}
                  </td>
                  <td>
                    {student.status === 'enrolled' && student.isOverdue ? (
                      <span className="text-danger fw-bold">Overdue</span>
                    ) : student.status === 'waiting' ? (
                      <span className="text-dark fw-semibold">Waiting for Enrollment</span>
                    ) : (
                      <span className="text-dark fw-semibold text-capitalize">{student.status}</span>
                    )}
                  </td>
                  <td>
                    {student.pending_docs > 0 ? (
                      <div className="d-flex align-items-center gap-2">
                        <ProgressBar variant="warning" now={student.total_docs > 0 ? (student.done_count / student.total_docs * 100) : 0} style={{ height: '6px', width: '80px' }} />
                        <small className="text-muted text-nowrap">{student.pending_docs} pending</small>
                      </div>
                    ) : (
                      <span className="text-success small fw-semibold"><i className="bi bi-check-circle-fill"></i> Complete</span>
                    )}
                  </td>
                  <td className="text-end pe-3" onClick={(e) => e.stopPropagation()}>
                    <div className="d-inline-flex gap-1">
                      <Button variant="outline-dark" size="sm" onClick={() => handleRowClick(student)}>Manage</Button>
                      <Button variant="outline-secondary" size="sm" onClick={(e) => handleArchive(student.id, e)}>Archive</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedStudents.length === 0 && (
                <tr><td colSpan={7} className="text-center py-4 text-muted">No students found.</td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-4">
          <Pagination>
            <Pagination.Prev disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} />
            {[...Array(totalPages)].map((_, idx) => (
              <Pagination.Item key={idx + 1} active={idx + 1 === currentPage} onClick={() => setCurrentPage(idx + 1)}>
                {idx + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} />
          </Pagination>
        </div>
      )}

      {showDrawer && <StudentDrawer
        show={showDrawer}
        handleClose={() => setShowDrawer(false)}
        student={selectedStudent}
        onSave={handleSaveStudent}
      />}
    </>
  );
}
