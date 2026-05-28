import { Offcanvas, Form, Button, InputGroup, Toast, ToastContainer, ProgressBar } from 'react-bootstrap';
import { useState, useEffect } from 'react';

const TOAST_WAIT_DURATION: number = 1200
const ANOTHER_MAGIC_NUMBER: number = 4000

export default function StudentDrawer({ show, handleClose, student, onSave }) {
  const [formData, setFormData] = useState<any>({});
  const [requirements, setRequirements] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });
  const [reqFiles, setReqFiles] = useState<Record<number, any[]>>({});

  const refreshRequirements = async () => {
    try {
      if (student?.id) {
        const res = await fetch(`/api/students/${student.id}/requirements`);
        const data = await res.json();
        setRequirements(data);

        const fileData = {};
        for (const req of data) {
          const fRes = await fetch(`/api/uploads/students/${student.id}/requirements/${req.template_id}`);
          fileData[req.template_id] = await fRes.json();
        }
        setReqFiles(fileData);
      } else {
        const res = await fetch(`/api/requirements`);
        const data = await res.json();
        setRequirements(data.map((r: any) => ({
          template_id: r.id, name: r.name, description: r.description,
          status: 'pending'
        })));
      }
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    if (student) {
      setFormData(student);
      refreshRequirements();
    }
  }, [student]);

  if (!student) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRequirementChange = (templateId, newStatus) => {
    setRequirements(prev => prev.map(r => r.template_id === templateId ? { ...r, status: newStatus } : r));
  };

  const setAllStatus = (status) => {
    setRequirements(prev => prev.map(r => ({ ...r, status })));
  }

  const handleSaveInternal = async () => {
    setSaving(true);
    setToast({ show: false, message: '', variant: 'success' });

    try {
      if (!formData.name?.trim()) throw new Error("Student Name is required.");
      if (formData.status === 'enrolled' && !formData.enroll_date) {
        throw new Error("Enrollment date is required when enrolled.");
      }
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        throw new Error("Invalid email address format.");
      }

      let sid = student?.id;
      if (sid) {
        const res = await fetch(`/api/students/${sid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to update student');
      } else {
        const res = await fetch(`/api/students`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to create student');
        const created = await res.json();
        sid = created.id;
      }

      await fetch(`/api/students/${sid}/requirements`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirements: requirements.map(r => ({ template_id: r.template_id, status: r.status })) })
      });

      setToast({ show: true, message: 'Student data saved successfully.', variant: 'success' });

      setTimeout(() => {
        setSaving(false);
        onSave();
      }, TOAST_WAIT_DURATION);

    } catch (e: any) {
      setToast({ show: true, message: e.message, variant: 'danger' });
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm("Are you sure you want to archive this student?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/students/${formData.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to archive");
      setToast({ show: true, message: 'Student archived.', variant: 'success' });
      setTimeout(() => {
        setSaving(false);
        handleClose();
        onSave();
      }, TOAST_WAIT_DURATION);
    } catch (e: any) {
      setToast({ show: true, message: e.message, variant: 'danger' });
      setSaving(false);
    }
  };

  const handleFileUpload = async (templateId, file) => {
    if (!file || !student?.id) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/uploads/students/${student.id}/requirements/${templateId}`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        setToast({ show: true, message: 'File uploaded.', variant: 'success' });
        const fRes = await fetch(`/api/uploads/students/${student.id}/requirements/${templateId}`);
        const updatedList = await fRes.json();
        setReqFiles(prev => ({ ...prev, [templateId]: updatedList }));
      }
    } catch (e) {
      console.error(e);
      setToast({ show: true, message: 'Upload failed.', variant: 'danger' });
    }
  };

  const handleDeleteFile = async (templateId, fileName) => {
    if (!confirm("Remove this attachment?")) return;
    try {
      const res = await fetch(`/api/uploads/students/${student.id}/requirements/${templateId}/${fileName}`, { method: 'DELETE' });
      if (res.ok) {
        const fRes = await fetch(`/api/uploads/students/${student.id}/requirements/${templateId}`);
        const updatedList = await fRes.json();
        setReqFiles(prev => ({ ...prev, [templateId]: updatedList }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Offcanvas show={show} onHide={handleClose} placement="end" style={{ width: '50vw', minWidth: '520px', backgroundColor: '#fafafa' }}>
      <Offcanvas.Header closeButton closeVariant="white" className="bg-dark text-white p-3">
        <div>
          <h5 className="fw-bold mb-0">{formData.name || (formData.id ? '?' : 'New Student')}</h5>
          <span className="text-secondary small">ID: {formData.id || '—'}</span>
        </div>
      </Offcanvas.Header>

      {saving && <ProgressBar animated now={100} style={{ height: '4px', borderRadius: 0 }} />}

      <Offcanvas.Body className="p-4 position-relative">
        <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1060 }}>
          <Toast
            show={toast.show}
            onClose={() => setToast({ ...toast, show: false })}
            bg={toast.variant}
            delay={ANOTHER_MAGIC_NUMBER}
            autohide
          >
            <Toast.Body className="text-white fw-semibold">
              {toast.variant === 'success' && <i className="bi bi-check-circle-fill me-2"></i>}
              {toast.variant === 'danger' && <i className="bi bi-exclamation-triangle-fill me-2"></i>}
              {toast.message}
            </Toast.Body>
          </Toast>
        </ToastContainer>

        {/* Details */}
        <div className="mb-4">
          <h6 className="fw-bold text-uppercase text-muted border-bottom pb-2 mb-3" style={{ fontSize: '0.8rem', letterSpacing: '0.05em' }}>
            Student Details
          </h6>

          <div className="row g-3 mb-3">
            <div className="col-8">
              <Form.Label className="small fw-bold text-secondary mb-1">Name</Form.Label>
              <Form.Control name="name" value={formData.name || ''} onChange={handleChange} />
            </div>
            <div className="col-4">
              <Form.Label className="small fw-bold text-secondary mb-1">Campus</Form.Label>
              <InputGroup>
                <InputGroup.Text className="bg-light"><i className="bi bi-geo-alt text-muted"></i></InputGroup.Text>
                <Form.Select name="campus" value={formData.campus || 'Manila'} onChange={handleChange} className="fw-semibold">
                  <option value="Manila">Manila</option>
                  <option value="Caloocan">Caloocan</option>
                </Form.Select>
              </InputGroup>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-6">
              <Form.Label className="small fw-bold text-secondary mb-1">Program Status</Form.Label>
              <InputGroup>
                <InputGroup.Text className="bg-light"><i className="bi bi-mortarboard text-muted"></i></InputGroup.Text>
                <Form.Select name="status" value={formData.status || ''} onChange={handleChange}>
                  <option value="processing">Processing</option>
                  <option value="waiting">Waiting for Enrollment</option>
                  <option value="enrolled">Enrolled</option>
                </Form.Select>
              </InputGroup>
            </div>
            <div className="col-6">
              <Form.Label className="small fw-bold text-secondary mb-1">
                Enrollment Date {formData.status === 'enrolled' && <span className="text-danger">*</span>}
              </Form.Label>
              <Form.Control
                type="date"
                name="enroll_date"
                value={formData.enroll_date || ''}
                onChange={handleChange}
                required={formData.status === 'enrolled'}
                className={`border-${(!formData.enroll_date && formData.status === 'enrolled') ? 'danger' : 'light-subtle'}`}
              />
            </div>
          </div>

          <div className="row g-3">
            <div className="col-6">
              <Form.Label className="small fw-bold text-secondary mb-1">Email Address</Form.Label>
              <InputGroup>
                <InputGroup.Text className="bg-light"><i className="bi bi-envelope text-muted"></i></InputGroup.Text>
                <Form.Control type="email" name="email" value={formData.email || ''} onChange={handleChange} placeholder="username@email.com" />
              </InputGroup>
            </div>
            <div className="col-6">
              <Form.Label className="small fw-bold text-secondary mb-1">Contact Number</Form.Label>
              <InputGroup>
                <InputGroup.Text className="bg-light"><i className="bi bi-telephone text-muted"></i></InputGroup.Text>
                <Form.Control type="text" name="contact_number" value={formData.contact_number || ''} onChange={handleChange} />
              </InputGroup>
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
            <h6 className="fw-bold text-uppercase text-muted mb-0" style={{ fontSize: '0.8rem', letterSpacing: '0.05em' }}>
              Requirement Checklist
            </h6>
            <div className="d-flex gap-2">
              <Button variant="outline-success" size="sm" className="py-0 px-2" style={{ fontSize: '0.75rem' }} onClick={() => setAllStatus('done')}>Set all to Done</Button>
              <Button variant="outline-danger" size="sm" className="py-0 px-2" style={{ fontSize: '0.75rem' }} onClick={() => setAllStatus('pending')}>Set all to Pending</Button>
            </div>
          </div>

          <div className="list-group list-group-flush border rounded bg-white">
            {requirements.map((req, i) => (
              <div key={i} className="list-group-item p-3" style={{ fontSize: '0.85rem' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div className="pe-2" style={{ maxWidth: '55%' }}>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <span className="fw-bold text-dark d-block">{req.name}</span>
                      {student?.id && (
                        <>
                          <input
                            type="file"
                            id={`file-upload-${req.template_id}`}
                            className="d-none"
                            onChange={(e) => {
                              if (e.target.files?.[0]) handleFileUpload(req.template_id, e.target.files[0]);
                              e.target.value = '';
                            }}
                          />
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            style={{ padding: '0px 6px', fontSize: '0.75rem', lineHeight: '1.2' }}
                            title="Attach File"
                            onClick={() => document.getElementById(`file-upload-${req.template_id}`)?.click()}
                          >
                            <i className="bi bi-paperclip"></i> Attach
                          </Button>
                        </>
                      )}
                    </div>
                    <small className="text-muted">{req.description}</small>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <Form.Check inline type="radio" label={<span className="text-muted small">Not required</span>} name={`req-${req.template_id}`} checked={req.status === 'na'} onChange={() => handleRequirementChange(req.template_id, 'na')} />
                    <Form.Check inline type="radio" label={<span className="text-success fw-bold small">Done</span>} name={`req-${req.template_id}`} checked={req.status === 'done'} onChange={() => handleRequirementChange(req.template_id, 'done')} />
                    <Form.Check inline type="radio" label={<span className="text-danger fw-bold small">Pending</span>} name={`req-${req.template_id}`} checked={req.status === 'pending'} onChange={() => handleRequirementChange(req.template_id, 'pending')} />
                  </div>
                </div>

                {/* File attachments container - Only renders if there are files */}
                {student?.id && reqFiles[req.template_id] && reqFiles[req.template_id].length > 0 && (
                  <div className="bg-light p-2 mt-2 rounded border border-light-subtle d-flex align-items-center gap-2 flex-wrap">
                    {reqFiles[req.template_id].map((file, idx) => (
                      <span key={idx} className="badge bg-white text-dark border d-inline-flex align-items-center gap-1 p-1 px-2">
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-decoration-none text-dark"
                        >
                          <i className="bi bi-file-earmark-text me-1 text-primary"></i>
                          {file.name.length > 25 ? file.name.substring(0, 15) + '...' + file.name.split('.').pop() : file.name}
                        </a>
                        <i 
                          className="bi bi-x text-danger ms-1" 
                          style={{ cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }} 
                          title="Remove Attachment"
                          onClick={() => handleDeleteFile(req.template_id, file.name)}
                        ></i>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Comments */}
        <div>
          <h6 className="fw-bold text-uppercase text-muted border-bottom pb-2 mb-3" style={{ fontSize: '0.8rem', letterSpacing: '0.05em' }}>
            Remarks
          </h6>
          <Form.Control as="textarea" rows={6} className="bg-light" name="comments" value={formData.comments || ''} onChange={handleChange} placeholder="Notes, comments, remarks, details..." />
        </div>
      </Offcanvas.Body>

      <div className="bg-white border-top p-3 d-flex justify-content-end gap-2">
        <Button variant="light" className="border btn-sm me-auto" onClick={handleClose} disabled={saving}>Cancel</Button>
        <Button variant="outline-danger" className="btn-sm px-3" onClick={handleArchive} disabled={!formData.id || saving}>Archive</Button>
        <Button variant="dark" className="btn-sm px-4" onClick={handleSaveInternal} disabled={saving}>
          {saving ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
    </Offcanvas>
  );
}