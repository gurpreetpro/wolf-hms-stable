import React, { useState } from 'react';
import { Card, Form, Table, Button, Modal, Row, Col, Badge, Alert } from 'react-bootstrap';
import { Printer, FileText } from 'lucide-react';
import LabReportPrint from '../LabReportPrint';

const LabHistoryTab = ({ labHistory, fetchHistory }) => {
    const [historySearch, setHistorySearch] = useState('');
    const [showResultViewer, setShowResultViewer] = useState(false);
    const [resultToView, setResultToView] = useState(null);
    const [showReportPrint, setShowReportPrint] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);

    return (
        <Card className="shadow-sm border-0">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                <span className="fw-bold">Completed Tests</span>
                <Form.Control
                    type="text"
                    placeholder="Search by patient or test..."
                    className="w-auto"
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                />
            </Card.Header>
            <Table hover responsive>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Patient</th>
                        <th>Test</th>
                        <th>Date</th>
                        <th>Result</th>
                    </tr>
                </thead>
                <tbody>
                    {labHistory
                        .filter(h =>
                            (h.patient_name || '').toLowerCase().includes(historySearch.toLowerCase()) ||
                            (h.test_name || '').toLowerCase().includes(historySearch.toLowerCase())
                        )
                        .map(h => (
                            <tr key={h.id}>
                                <td>#{h.id}</td>
                                <td>{h.patient_name}</td>
                                <td>{h.test_name}</td>
                                <td>{new Date(h.updated_at).toLocaleDateString()}</td>
                                <td>
                                    <Button size="sm" variant="outline-primary" className="me-1" onClick={() => { setResultToView(h); setShowResultViewer(true); }}>
                                        View
                                    </Button>
                                    <Button size="sm" variant="outline-success" onClick={() => { setSelectedReport(h); setShowReportPrint(true); }}>
                                        <Printer size={14} className="me-1" />Print
                                    </Button>
                                </td>
                            </tr>
                        ))
                    }
                    {labHistory.length === 0 && (
                        <tr>
                            <td colSpan="5" className="text-center text-muted p-4">No completed tests found</td>
                        </tr>
                    )}
                </tbody>
            </Table>

            {/* Lab Report Print Modal */}
            {selectedReport && (
                <LabReportPrint
                    show={showReportPrint}
                    onHide={() => { setShowReportPrint(false); setSelectedReport(null); }}
                    labResult={selectedReport.result_json}
                    patientName={selectedReport.patient_name}
                    testName={selectedReport.test_name}
                    testDate={selectedReport.updated_at}
                />
            )}

            {/* Result Viewer Modal */}
            <Modal show={showResultViewer} onHide={() => { setShowResultViewer(false); setResultToView(null); }} size="lg">
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title>
                        <FileText size={20} className="me-2" />
                        Test Result Details
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {resultToView && (
                        <>
                            <Row className="mb-3">
                                <Col md={6}>
                                    <strong>Patient:</strong> {resultToView.patient_name}
                                </Col>
                                <Col md={6}>
                                    <strong>Test:</strong> {resultToView.test_name}
                                </Col>
                            </Row>
                            <Row className="mb-3">
                                <Col md={6}>
                                    <strong>Date:</strong> {new Date(resultToView.updated_at).toLocaleString()}
                                </Col>
                                <Col md={6}>
                                    <strong>Status:</strong> <Badge bg="success">Completed</Badge>
                                </Col>
                            </Row>
                            <hr />
                            <h6 className="mb-3">Result Data</h6>
                            {resultToView.result_json ? (
                                <Table size="sm" bordered>
                                    <thead className="bg-light">
                                        <tr>
                                            <th>Parameter</th>
                                            <th>Value</th>
                                            <th>Unit</th>
                                            <th>Reference Range</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(resultToView.result_json).map(([key, val], idx) => (
                                            <tr key={idx}>
                                                <td>{key}</td>
                                                <td className="fw-bold">{typeof val === 'object' ? val.value : val}</td>
                                                <td>{typeof val === 'object' ? val.unit : '-'}</td>
                                                <td className="text-muted">{typeof val === 'object' ? val.range : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            ) : (
                                <Alert variant="info">No result data available</Alert>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowResultViewer(false)}>Close</Button>
                    <Button variant="success" onClick={() => { setSelectedReport(resultToView); setShowReportPrint(true); setShowResultViewer(false); }}>
                        <Printer size={14} className="me-1" /> Print Report
                    </Button>
                </Modal.Footer>
            </Modal>
        </Card>
    );
};

export default LabHistoryTab;
