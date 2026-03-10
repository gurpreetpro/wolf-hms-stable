import React, { useState, useEffect } from 'react';
import { Form, Row, Col, Spinner, Button } from 'react-bootstrap';
import { CheckCircle } from 'lucide-react';
import { getTestDefinition } from '../../constants/labTestDefinitions';
import api from '../../utils/axiosInstance';

const LabEntryForm = ({ selectedRequest, onSave }) => {
    const [loadingParams, setLoadingParams] = useState(false);
    const [dbTestParams, setDbTestParams] = useState([]);
    const [formResults, setFormResults] = useState({});

    // Fetch parameters when request changes
    useEffect(() => {
        if (selectedRequest?.test_name) {
            fetchDbTestParams(selectedRequest.test_name);
        } else {
            setDbTestParams([]);
        }
        setFormResults({});
    }, [selectedRequest]);

     const fetchDbTestParams = async (testName) => {
        setLoadingParams(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/api/lab-params/parameters/${encodeURIComponent(testName)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Transform DB format to form field format
            const params = res.data.map(p => ({
                key: p.param_key,
                label: p.param_label + (p.unit ? ` (${p.unit})` : ''),
                type: p.param_type || 'number',
                placeholder: p.reference_min !== null ? `${p.reference_min} - ${p.reference_max}` : '',
                note: p.reference_text || (p.reference_min !== null ? `Normal: ${p.reference_min} - ${p.reference_max}` : ''),
                step: p.param_type === 'number' ? '0.1' : undefined
            }));
            setDbTestParams(params);
        } catch (err) {
            console.error('DB params fetch error:', err);
            setDbTestParams([]); // Fallback to hardcoded on error
        }
        setLoadingParams(false);
    };

    const handleSave = () => {
         // Form-based entry
         const filledFields = {};
         Object.keys(formResults).forEach(key => {
             if (formResults[key] !== '' && formResults[key] !== undefined) {
                 filledFields[key] = isNaN(formResults[key]) ? formResults[key] : parseFloat(formResults[key]);
             }
         });

         if (Object.keys(filledFields).length === 0) {
             alert('Please fill in at least one field.');
             return;
         }
         onSave(filledFields);
    };


    return (
        <div>
            <Form>
                {loadingParams && (
                    <div className="text-center py-3">
                        <Spinner animation="border" size="sm" className="me-2" />
                        Loading test parameters...
                    </div>
                )}
                <Row className="mb-3">
                    {(dbTestParams.length > 0 ? dbTestParams : getTestDefinition(selectedRequest?.test_name)).map((field) => (
                        <Col md={6} key={field.key} className="mb-3">
                            <Form.Group>
                                <Form.Label className="fw-bold">{field.label}</Form.Label>
                                <Form.Control
                                    type={field.type}
                                    step={field.step}
                                    placeholder={field.placeholder}
                                    value={formResults[field.key] || ''}
                                    onChange={e => setFormResults({ ...formResults, [field.key]: e.target.value })}
                                />
                                {field.note && <Form.Text className="text-muted">{field.note}</Form.Text>}
                            </Form.Group>
                        </Col>
                    ))}
                </Row>

                <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Impression / Notes</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={2}
                        placeholder="e.g., Normal findings, Mild anemia, etc."
                        value={formResults.impression || ''}
                        onChange={e => setFormResults({ ...formResults, impression: e.target.value })}
                    />
                </Form.Group>
            </Form>
            <div className="d-grid gap-2 mt-3">
                <Button variant="success" onClick={handleSave}>
                    <CheckCircle size={16} className="me-1" /> Save Results
                </Button>
            </div>
        </div>
    );
};

export default LabEntryForm;
