import React, { useState } from 'react';
import axios from 'axios';
import { Card, Button, Table, Form, ProgressBar, Alert, Row, Col } from 'react-bootstrap';
import { Upload, CheckCircle, AlertTriangle } from 'lucide-react';

const STEPS = ['Upload CSV', 'Map Columns', 'Validate Data', 'Commit Import'];

const TARGET_FIELDS = [
    { value: 'name', label: 'Patient Name (Required)' },
    { value: 'phone', label: 'Phone Number (Required)' },
    { value: 'gender', label: 'Gender' },
    { value: 'dob', label: 'Date of Birth (YYYY-MM-DD)' },
    { value: 'address', label: 'Address' },
    { value: 'email', label: 'Email' }
];

const MigratorWizard = () => {
    const [activeStep, setActiveStep] = useState(0);
    const [file, setFile] = useState(null);
    const [job, setJob] = useState(null);
    const [csvHeaders, setCsvHeaders] = useState([]);
    const [mapping, setMapping] = useState({});
    const [validationResult, setValidationResult] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [committing, setCommitting] = useState(false);

    // --- Step 1: Upload ---
    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post('/api/migration/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setJob(res.data.job);
            const text = await file.text();
            const firstLine = text.split('\n')[0];
            const headers = firstLine.split(',').map(h => h.trim());
            setCsvHeaders(headers);

            // Auto-Map
            const newMap = {};
            headers.forEach(h => {
                const lower = h.toLowerCase();
                if (lower.includes('name')) newMap.name = h;
                if (lower.includes('phone') || lower.includes('mobile')) newMap.phone = h;
                if (lower.includes('sex') || lower.includes('gender')) newMap.gender = h;
                if (lower.includes('dob') || lower.includes('birth')) newMap.dob = h;
            });
            setMapping(newMap);

            setActiveStep(1);
        } catch (err) {
            alert('Upload Failed: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    // --- Step 2: Mapping ---
    const handleMapChange = (target, source) => {
        setMapping(prev => ({ ...prev, [target]: source }));
    };

    const handleValidateTrigger = async () => {
        try {
            const res = await axios.post(`/api/migration/validations/${job.id}`, { mappingConfig: mapping });
            setJob(res.data.job);

            setTimeout(async () => {
                setValidationResult(res.data.job);
                setActiveStep(2);
            }, 1000);

        } catch (err) {
            alert('Validation Trigger Failed');
        }
    };

    // --- Step 4: Commit ---
    const handleCommit = async () => {
        setCommitting(true);
        try {
            await axios.post(`/api/migration/commit/${job.id}`);
            setActiveStep(3);
        } catch (err) {
            alert('Commit Failed: ' + err.message);
        } finally {
            setCommitting(false);
        }
    };

    const renderStep = () => {
        switch (activeStep) {
            case 0:
                return (
                    <div className="text-center p-4" style={{ border: '2px dashed #6c757d', borderRadius: 8 }}>
                        <Upload size={60} className="text-muted mb-2" />
                        <h5>One-Click Legacy Migration</h5>
                        <input type="file" accept=".csv" onChange={handleFileChange} className="form-control mt-3 mx-auto" style={{ maxWidth: 300 }} />
                        <div className="mt-3">
                            <Button
                                variant="primary"
                                onClick={handleUpload}
                                disabled={!file || uploading}
                            >
                                {uploading ? 'Streaming...' : 'Upload & Analyze'}
                            </Button>
                        </div>
                        {uploading && <ProgressBar animated now={100} className="mt-3" />}
                    </div>
                );
            case 1:
                return (
                    <div>
                        <h5 className="mb-3">Smart Map Columns</h5>
                        <Alert variant="info">
                            We auto-detected some columns. Please review.
                        </Alert>
                        <Table size="sm" bordered hover>
                            <thead>
                                <tr>
                                    <th>Wolf Field</th>
                                    <th>CSV Column</th>
                                </tr>
                            </thead>
                            <tbody>
                                {TARGET_FIELDS.map(field => (
                                    <tr key={field.value}>
                                        <td className="align-middle">{field.label}</td>
                                        <td>
                                            <Form.Select
                                                size="sm"
                                                value={mapping[field.value] || ''}
                                                onChange={(e) => handleMapChange(field.value, e.target.value)}
                                            >
                                                <option value="">-- Ignore --</option>
                                                {csvHeaders.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </Form.Select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                        <div className="d-flex justify-content-end mt-3">
                            <Button variant="primary" onClick={handleValidateTrigger}>
                                Run Dry Validation
                            </Button>
                        </div>
                    </div>
                );
            case 2:
                // Validation Results
                const isReady = validationResult && validationResult.status === 'VALIDATED';
                return (
                    <div>
                        <h5>Validation Report</h5>
                        {isReady ? (
                            <Card className="mt-3" style={{ backgroundColor: validationResult.error_rows > 0 ? '#fff4e5' : '#e8f5e9' }}>
                                <Card.Body>
                                    <h3 className="text-primary">
                                        {validationResult.valid_rows} / {validationResult.total_rows} Rows Valid
                                    </h3>
                                    <div className="text-danger mt-1">
                                        {validationResult.error_rows} Errors Found
                                    </div>
                                    {validationResult.error_rows > 0 && (
                                        <small className="text-muted">
                                            Errors are logged and will be skipped during import.
                                        </small>
                                    )}
                                </Card.Body>
                            </Card>
                        ) : (
                            <p>Validating...</p>
                        )}

                        <div className="d-flex justify-content-between mt-3">
                            <Button variant="outline-secondary" onClick={() => setActiveStep(1)}>Back</Button>
                            <Button
                                variant={validationResult?.error_rows > 0 ? 'warning' : 'success'}
                                onClick={handleCommit}
                                disabled={committing || !isReady}
                            >
                                {committing ? 'Migrating...' : 'Start Vampire Migration'}
                            </Button>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="text-center p-4">
                        <CheckCircle size={80} className="text-success mb-2" />
                        <h4>Migration Complete!</h4>
                        <p>Legacy data has been restored to Wolf HMS.</p>
                        <Button variant="outline-primary" className="mt-2" onClick={() => window.location.reload()}>
                            Migrate Another File
                        </Button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <Card className="p-4 mx-auto mt-4" style={{ maxWidth: 800 }}>
            <h3 className="mb-4">Wolf Migrator 🧛</h3>

            {/* Step Indicator */}
            <div className="d-flex align-items-center mb-4">
                {STEPS.map((label, index) => (
                    <React.Fragment key={label}>
                        <div className="d-flex align-items-center">
                            <div
                                className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                                style={{
                                    width: 32, height: 32,
                                    backgroundColor: index <= activeStep ? '#0d6efd' : '#6c757d',
                                    color: 'white',
                                    fontSize: 14
                                }}
                            >
                                {index < activeStep ? '✓' : index + 1}
                            </div>
                            <span className={`ms-2 small ${index <= activeStep ? 'text-primary fw-semibold' : 'text-muted'}`}>
                                {label}
                            </span>
                        </div>
                        {index < STEPS.length - 1 && (
                            <div className="flex-grow-1 mx-2" style={{ height: 2, backgroundColor: index < activeStep ? '#0d6efd' : '#dee2e6' }} />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {renderStep()}
        </Card>
    );
};

export default MigratorWizard;
