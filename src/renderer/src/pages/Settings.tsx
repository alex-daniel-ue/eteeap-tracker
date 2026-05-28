import { useState } from 'react';
import { Card, Button, Alert } from 'react-bootstrap';

export default function Settings() {
    const [importStatus, setImportStatus] = useState<string | null>(null);

    const handleExport = () => {
        window.open('/api/backup/export', '_blank');
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const content = event.target?.result as string;
                const json = JSON.parse(content);
                
                const res = await fetch('/api/backup/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(json)
                });
                
                if (res.ok) {
                    setImportStatus('success');
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    setImportStatus('error');
                }
            } catch (err) {
                setImportStatus('error');
                console.error(err);
            }
        };
        reader.readAsText(file);
    };

    return (
        <>
            <h1 className="h4 mb-4 fw-bold">Settings</h1>
            <Card className="border-0 shadow-sm mb-4">
                <Card.Header className="bg-white border-bottom-0 pt-4 pb-2">
                    <h5 className="mb-0 fw-bold">Data Management</h5>
                </Card.Header>
                <Card.Body>
                    
                    {importStatus === 'success' && <Alert variant="success">Database restored successfully! Reloading...</Alert>}
                    {importStatus === 'error' && <Alert variant="danger">Failed to restore database. Ensure the file is valid.</Alert>}
                    
                    <div className="d-flex gap-3 align-items-center">
                        <Button variant="dark" onClick={handleExport}>
                            <i className="bi bi-download me-2"></i>Export Backup
                        </Button>
                        
                        <div>
                            <input 
                                type="file" 
                                id="import-file" 
                                className="d-none" 
                                accept=".backup,.json" 
                                onChange={handleImport} 
                            />
                            <Button variant="outline-dark" onClick={() => document.getElementById('import-file')?.click()}>
                                <i className="bi bi-upload me-2"></i>Import Backup
                            </Button>
                        </div>
                    </div>
                </Card.Body>
            </Card>
        </>
    );
}
