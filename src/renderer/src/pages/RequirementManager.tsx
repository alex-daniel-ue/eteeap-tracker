import { useState, useEffect } from 'react';
import { Card, Form, Button, Modal } from 'react-bootstrap';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function RequirementManager() {
  const [requirements, setRequirements] = useState<any[]>([]);
  const [deletedRequirements, setDeletedRequirements] = useState<any[]>([]);
  const [newReq, setNewReq] = useState({ name: '', description: '' });
  
  const [editingReq, setEditingReq] = useState<any>(null);

  const fetchRequirements = () => {
    fetch('/api/requirements')
      .then(res => res.json())
      .then(data => setRequirements(data))
      .catch(console.error);

    fetch('/api/requirements?is_deleted=1')
      .then(res => res.json())
      .then(data => setDeletedRequirements(data))
      .catch(console.error);
  }

  useEffect(() => {
    fetchRequirements();
  }, []);

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(requirements);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setRequirements(items);
    
    await fetch('/api/requirements/reorder', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ order: items.map(i => i.id) })
    });
  };

  const handleCreate = async (e) => {
      e.preventDefault();
      await fetch('/api/requirements', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(newReq)
      });
      setNewReq({ name: '', description: '' });
      fetchRequirements();
  }

  const handleUpdate = async (e) => {
      e.preventDefault();
      if (!editingReq) return;
      await fetch(`/api/requirements/${editingReq.id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ name: editingReq.name, description: editingReq.description })
      });
      setEditingReq(null);
      fetchRequirements();
  }

  const handleDelete = async (id) => {
      if (!confirm("Are you sure? This will NOT remove from existing student templates, but will HIDE it for future use.")) return;
      await fetch(`/api/requirements/${id}`, { method: 'DELETE' });
      fetchRequirements();
  }

  const handleRestore = async (id) => {
      await fetch(`/api/requirements/${id}/restore`, { method: 'POST' });
      fetchRequirements();
  }

  const handlePermanentDelete = async (id) => {
      if (!confirm("Are you absolutely sure? This will PERMANENTLY wipe this requirement from ALL student records!")) return;
      await fetch(`/api/requirements/${id}/permanent`, { method: 'DELETE' });
      fetchRequirements();
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
          <h1 className="h4 fw-bold text-dark">Requirement Manager</h1>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-dark text-white py-3">
              <h5 className="mb-0 fw-bold fs-6">Requirement List</h5>
            </Card.Header>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="requirements-list">
                {(provided) => (
                  <div className="list-group list-group-flush h-100" {...provided.droppableProps} ref={provided.innerRef}>
                    {requirements.map((req, index) => (
                      <Draggable key={req.id.toString()} draggableId={req.id.toString()} index={index}>
                        {(provided) => (
                          <div 
                            className="list-group-item d-flex align-items-center justify-content-between p-3"
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                          >
                            <div className="d-flex align-items-center gap-3">
                              <div className="text-muted" {...provided.dragHandleProps} style={{ cursor: 'grab' }}>
                                <i className="bi bi-grip-vertical fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold text-dark">
                                  {index + 1}. {req.name}
                                </div>
                                <small className="text-muted">{req.description || '—'}</small>
                              </div>
                            </div>
                            <div className="d-flex align-items-center gap-3 pe-2">
                              <Button variant="outline-primary" size="sm" className="py-1 px-2" onClick={() => setEditingReq(req)}>Edit</Button>
                              <Button variant="outline-danger" size="sm" className="py-1 px-2" onClick={() => handleDelete(req.id)}>Delete</Button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {requirements.length === 0 && <div className="p-4 text-center text-muted h-100 d-flex align-items-center justify-content-center">No requirements yet.</div>}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </Card>

          {deletedRequirements.length > 0 && (
            <Card className="border-0 shadow-sm mt-4">
              <Card.Header className="bg-light text-muted py-3">
                <h5 className="mb-0 fw-bold fs-6">Hidden Requirements</h5>
              </Card.Header>
              <div className="list-group list-group-flush h-100">
                {deletedRequirements.map((req) => (
                  <div key={req.id} className="list-group-item d-flex align-items-center justify-content-between p-3 bg-light">
                    <div className="d-flex align-items-center gap-3 text-muted">
                      <div><i className="bi bi-eye-slash fs-5"></i></div>
                      <div style={{ textDecoration: 'line-through' }}>
                        <div className="fw-semibold">
                          {req.name}
                        </div>
                        <small>{req.description || 'No description'}</small>
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-2 pe-2">
                      <Button variant="outline-success" size="sm" className="py-1 px-2" onClick={() => handleRestore(req.id)}>Restore</Button>
                      <Button variant="danger" size="sm" className="py-1 px-2" onClick={() => handlePermanentDelete(req.id)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="col-lg-4">
          <Card className="border-0 shadow-sm sticky-top" style={{ top: '1rem' }}>
            <Card.Header className="bg-white py-3 border-bottom">
              <h5 className="mb-0 fw-bold fs-6 text-dark">Register New Requirement</h5>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleCreate}>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold">Name</Form.Label>
                  <Form.Control type="text" required value={newReq.name} onChange={e => setNewReq({...newReq, name: e.target.value})} />
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label className="small fw-bold">Details</Form.Label>
                  <Form.Control as="textarea" rows={3} value={newReq.description} onChange={e => setNewReq({...newReq, description: e.target.value})} />
                </Form.Group>
                <Button variant="dark" type="submit" className="w-100">Save Requirement</Button>
              </Form>
            </Card.Body>
          </Card>
        </div>
      </div>

      <Modal show={!!editingReq} onHide={() => setEditingReq(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 fw-bold">Edit Requirement</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdate}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Name</Form.Label>
              <Form.Control type="text" required value={editingReq?.name || ''} onChange={e => setEditingReq({...editingReq, name: e.target.value})} />
            </Form.Group>
            <Form.Group>
              <Form.Label className="small fw-bold">Details</Form.Label>
              <Form.Control as="textarea" rows={3} value={editingReq?.description || ''} onChange={e => setEditingReq({...editingReq, description: e.target.value})} />
            </Form.Group>
            <div className="mt-3 text-muted small">
                 <i className="bi bi-info-circle me-1"></i>
                 Renaming will preserve the previous names as aliases.
            </div>
            {editingReq?.aliases && editingReq.aliases.length > 0 && (
                <div className="mt-3">
                    <span className="small fw-bold">Previous aliases: </span>
                    {editingReq.aliases.map((alias, idx) => (
                        <span key={idx} className="badge bg-secondary me-1">{alias}</span>
                    ))}
                </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setEditingReq(null)}>Cancel</Button>
            <Button variant="dark" type="submit">Save Changes</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
