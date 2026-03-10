import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Form, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { Hash, Save, RefreshCw } from 'lucide-react';
import axios from 'axios';

const IdSeriesSettings = () => {
    const [settings, setSettings] = useState({
        hospital_code: '',
        uhid_format: {
            prefix: '',
            separator: '-',
            suffix: 'YEAR',
            length: 4,
            start_sequence: 1
        },
        ipd_format: {
            prefix: 'IP',
            length: 5,
            start_sequence: 1
        }
    });
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/settings/id-series', config);
            const data = res.data.data || res.data;
            setSettings(data);
        } catch (error) {
            console.error('Failed to fetch ID settings:', error);
            setMessage({ type: 'warning', text: 'Could not load ID settings. Using defaults.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await axios.put('/api/settings/id-series', {
                uhid_format: settings.uhid_format,
                ipd_format: settings.ipd_format
            }, config);
            setMessage({ type: 'success', text: '✅ ID series settings saved successfully!' });
        } catch (error) {
            setMessage({ type: 'danger', text: error.response?.data?.message || 'Failed to save settings' });
        } finally {
            setSaving(false);
        }
    };

    const handleUhidChange = (field, value) => {
        setSettings(prev => ({
            ...prev,
            uhid_format: { ...prev.uhid_format, [field]: value }
        }));
    };

    const handleIpdChange = (field, value) => {
        setSettings(prev => ({
            ...prev,
            ipd_format: { ...prev.ipd_format, [field]: value }
        }));
    };

    // Generate preview
    const getUhidPreview = () => {
        const { prefix, separator, suffix, length, start_sequence } = settings.uhid_format;
        const year = new Date().getFullYear();
        const seq = String(start_sequence).padStart(parseInt(length) || 4, '0');
        const suf = suffix === 'YEAR' ? `/${year}` : '';
        return `${prefix || settings.hospital_code}${separator}${seq}${suf}`;
    };

    const getIpdPreview = () => {
        const { prefix, length, start_sequence } = settings.ipd_format;
        const yearShort = new Date().getFullYear().toString().slice(-2);
        const seq = String(start_sequence).padStart(parseInt(length) || 5, '0');
        return `${prefix}-${yearShort}-${seq}`;
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center py-5">
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    return (
        <div>
            {message && (
                <Alert variant={message.type} dismissible onClose={() => setMessage(null)} className="mb-4">
                    {message.text}
                </Alert>
            )}

            {/* UHID Settings */}
            <Card className="border-0 shadow-sm mb-4">
                <Card.Body className="p-4">
                    <div className="d-flex align-items-center justify-content-between mb-4">
                        <div className="d-flex align-items-center gap-2">
                            <Hash size={20} className="text-primary" />
                            <h5 className="mb-0 fw-semibold">UHID (Patient ID) Format</h5>
                        </div>
                        <Badge bg="info" className="fs-6">Preview: {getUhidPreview()}</Badge>
                    </div>

                    <Row className="g-3">
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">Prefix</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder={settings.hospital_code || 'HMS'}
                                    value={settings.uhid_format.prefix || ''}
                                    onChange={(e) => handleUhidChange('prefix', e.target.value.toUpperCase())}
                                />
                                <Form.Text className="text-muted">Default: {settings.hospital_code}</Form.Text>
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">Separator</Form.Label>
                                <Form.Select
                                    value={settings.uhid_format.separator || '-'}
                                    onChange={(e) => handleUhidChange('separator', e.target.value)}
                                >
                                    <option value="-">Hyphen (-)</option>
                                    <option value="/">Slash (/)</option>
                                    <option value=".">Dot (.)</option>
                                    <option value="">None</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">Suffix</Form.Label>
                                <Form.Select
                                    value={settings.uhid_format.suffix || 'YEAR'}
                                    onChange={(e) => handleUhidChange('suffix', e.target.value)}
                                >
                                    <option value="YEAR">Year (/2026)</option>
                                    <option value="NONE">None</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">Digits</Form.Label>
                                <Form.Select
                                    value={settings.uhid_format.length || 4}
                                    onChange={(e) => handleUhidChange('length', parseInt(e.target.value))}
                                >
                                    <option value={3}>3 (001)</option>
                                    <option value={4}>4 (0001)</option>
                                    <option value={5}>5 (00001)</option>
                                    <option value={6}>6 (000001)</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="fw-semibold text-success">Starting Number ⭐</Form.Label>
                                <Form.Control
                                    type="number"
                                    min={1}
                                    placeholder="1"
                                    value={settings.uhid_format.start_sequence || 1}
                                    onChange={(e) => handleUhidChange('start_sequence', parseInt(e.target.value) || 1)}
                                />
                                <Form.Text className="text-muted">Next UHID starts from this</Form.Text>
                            </Form.Group>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* IPD Settings */}
            <Card className="border-0 shadow-sm mb-4">
                <Card.Body className="p-4">
                    <div className="d-flex align-items-center justify-content-between mb-4">
                        <div className="d-flex align-items-center gap-2">
                            <Hash size={20} className="text-warning" />
                            <h5 className="mb-0 fw-semibold">IPD Number Format</h5>
                        </div>
                        <Badge bg="warning" text="dark" className="fs-6">Preview: {getIpdPreview()}</Badge>
                    </div>

                    <Row className="g-3">
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">Prefix</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="IP"
                                    value={settings.ipd_format.prefix || ''}
                                    onChange={(e) => handleIpdChange('prefix', e.target.value.toUpperCase())}
                                />
                                <Form.Text className="text-muted">Default: IP</Form.Text>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">Digits</Form.Label>
                                <Form.Select
                                    value={settings.ipd_format.length || 5}
                                    onChange={(e) => handleIpdChange('length', parseInt(e.target.value))}
                                >
                                    <option value={3}>3 (001)</option>
                                    <option value={4}>4 (0001)</option>
                                    <option value={5}>5 (00001)</option>
                                    <option value={6}>6 (000001)</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="fw-semibold text-success">Starting Number ⭐</Form.Label>
                                <Form.Control
                                    type="number"
                                    min={1}
                                    placeholder="1"
                                    value={settings.ipd_format.start_sequence || 1}
                                    onChange={(e) => handleIpdChange('start_sequence', parseInt(e.target.value) || 1)}
                                />
                                <Form.Text className="text-muted">Next IPD starts from this</Form.Text>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="fw-semibold text-muted">Format</Form.Label>
                                <Form.Control
                                    type="text"
                                    value="PREFIX-YY-XXXXX"
                                    disabled
                                />
                                <Form.Text className="text-muted">Year auto-included</Form.Text>
                            </Form.Group>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Info Alert */}
            <Alert variant="info" className="mb-4">
                <strong>💡 Note:</strong> Changing the starting number will only affect <strong>new</strong> patients/admissions. 
                Existing IDs will remain unchanged. If you've had 100 patients and set starting number to 5000, 
                the next patient will get UHID with sequence 5000.
            </Alert>

            {/* Save Button */}
            <div className="d-flex justify-content-end gap-2">
                <Button variant="outline-secondary" onClick={fetchSettings} disabled={saving}>
                    <RefreshCw size={18} className="me-2" />
                    Reset
                </Button>
                <Button variant="primary" size="lg" onClick={handleSave} disabled={saving}>
                    {saving ? (
                        <>
                            <Spinner size="sm" className="me-2" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save size={18} className="me-2" />
                            Save ID Settings
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};

export default IdSeriesSettings;
