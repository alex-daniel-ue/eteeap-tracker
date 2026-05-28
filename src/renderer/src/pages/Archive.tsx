import { useState, useEffect, useMemo } from 'react';
import { Card, Table, Form, Button, InputGroup, Pagination } from 'react-bootstrap';
import Fuse from 'fuse.js';

export default function Archive() {
  const [archivedStudents, setArchivedStudents] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchArchive = () => {
    fetch('/api/students?is_archived=1')
      .then(res => res.json())
      .then(data => setArchivedStudents(data))
      .catch(console.error);
  }

  useEffect(() => {
    fetchArchive();
  }, []);

  const filteredStudents = useMemo(() => {
    let result = archivedStudents;

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
  }, [archivedStudents, searchQuery, filterStatus, sortBy]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleUnarchive = async (id) => {
    await fetch(`/api/students/${id}/unarchive`, { method: 'POST' });
    fetchArchive();
  }

  const handlePermanentDelete = async (id) => {
    if (!confirm("WARNING: This will permanently delete this student, their requirements, and their comments. Are you entirely sure?")) return;
    if (!confirm("Double confirmation: Delete PERMANENTLY?")) return;
    await fetch(`/api/students/${id}/permanent`, { method: 'DELETE' });
    fetchArchive();
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
        <h1 className="h4 fw-bold text-dark mb-1">Student Archive</h1>
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

      <Card className="border-0 shadow-sm bg-white">
        <div className="table-responsive">
          <Table hover className="mb-0 align-middle text-secondary" style={{ fontSize: '0.9rem' }}>
            <thead className="table-secondary text-uppercase text-muted" style={{ fontSize: '0.75rem' }}>
              <tr>
                <th className="ps-3" style={{ width: '20%' }}>Student</th>
                <th style={{ width: '10%' }}>Contact No</th>
                <th style={{ width: '10%' }}>Campus</th>
                <th style={{ width: '20%' }}>Duration Active</th>
                <th style={{ width: '10%' }}>Last Status</th>
                <th className="text-end pe-3" style={{ width: '30%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.map(student => (
                <tr key={student.id} className="muted-table-row">
                  <td className="ps-3 text-secondary">
                    <div className="fw-bold text-muted">{student.name}</div>
                    <span className="text-muted small">{student.email || '—'}</span>
                  </td>
                  <td><small>{student.contact_number || '—'}</small></td>
                  <td><small className="fw-semibold">{student.campus || 'Manila'}</small></td>
                  <td>
                    {student.enroll_date ? (
                      <>
                        <div className="text-muted fw-semibold">{student.months_elapsed} months active</div>
                        <small className="text-muted">Enrolled on {student.enroll_date}</small>
                      </>
                    ) : <span className="text-muted small fst-italic">—</span>}
                  </td>
                  <td><span className="text-muted small text-capitalize">{student.status}</span></td>
                  <td className="text-end pe-3">
                    <div className="d-inline-flex gap-1">
                      <Button variant="outline-secondary" size="sm" onClick={() => handleUnarchive(student.id)}>Unarchive</Button>
                      <Button variant="danger" size="sm" className="text-white" onClick={() => handlePermanentDelete(student.id)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedStudents.length === 0 && (
                <tr><td colSpan={6} className="text-center py-4 text-muted">No archived students.</td></tr>
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
    </>
  );
}
