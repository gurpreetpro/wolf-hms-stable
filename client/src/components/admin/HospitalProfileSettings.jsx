import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Form, Button, Alert, Spinner, Tabs, Tab } from 'react-bootstrap';
import { Building2, Phone, Mail, Globe, MapPin, Hash, Save, Image } from 'lucide-react';
import axios from 'axios';
import useHospitalProfile from '../../hooks/useHospitalProfile';
import IdSeriesSettings from './IdSeriesSettings';

const HospitalProfileSettings = () => {
    const { refreshProfile } = useHospitalProfile();
    
    const [profile, setProfile] = useState({
        name: '',
        tagline: '',
        registration_number: '',
        phone: '',
        phone_secondary: '',
        fax: '',
        email: '',
        website: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        logo_url: '',
        primary_color: '#0d6efd',
        secondary_color: '#6c757d',
        gstin: '',
        pan: '',
        cin: '',
        tan: '',
        lab_nabl_number: '',
        pharmacy_license: '',
        nabh_accreditation: ''
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState(null);

    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    // Handle logo file upload
    const handleLogoUpload = async (file) => {
        // Validate file type
        if (!['image/jpeg', 'image/png'].includes(file.type)) {
            setMessage({ type: 'danger', text: 'Only JPEG and PNG files are allowed' });
            return;
        }
        
        // Validate file size (2MB max)
        if (file.size > 2 * 1024 * 1024) {
            setMessage({ type: 'danger', text: 'File too large. Maximum size is 2MB.' });
            return;
        }
        
        setUploading(true);
        setMessage(null);
        
        try {
            const formData = new FormData();
            formData.append('logo', file);
            
            const res = await axios.post('/api/upload/logo', formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            // Update profile with the new logo URL
            const logoUrl = res.data.data?.url || res.data.url;
            handleChange('logo_url', logoUrl);
            setMessage({ type: 'success', text: '✅ Logo uploaded successfully!' });
        } catch (error) {
            setMessage({ type: 'danger', text: error.response?.data?.message || 'Logo upload failed' });
        } finally {
            setUploading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await axios.get('/api/settings/hospital-profile', config);
            // Handle wrapped response
            const profileData = res.data.data || res.data;
            setProfile(prev => ({ ...prev, ...profileData }));
        } catch (error) {
            console.error('Failed to fetch hospital profile:', error);
            setMessage({ type: 'warning', text: 'Could not load existing profile. You can create a new one.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await axios.put('/api/settings/hospital-profile', profile, config);
            setMessage({ type: 'success', text: '✅ Hospital profile saved successfully!' });
            // Refresh the cached profile so all components get the updated data
            refreshProfile();
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message || 'Failed to save profile';
            console.error('Save failed details:', error.response?.data);
            setMessage({ type: 'danger', text: `Save Failed: ${errorMsg} (Status: ${error.response?.status})` });
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field, value) => {
        setProfile(prev => ({ ...prev, [field]: value }));
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

            <Tabs defaultActiveKey="basic" className="mb-4">
                {/* Basic Information Tab */}
                <Tab eventKey="basic" title="Basic Info">
                    <Card className="border-0 shadow-sm mb-4">
                        <Card.Body className="p-4">
                            <div className="d-flex align-items-center gap-2 mb-4">
                                <Building2 size={20} className="text-primary" />
                                <h5 className="mb-0 fw-semibold">Hospital Information</h5>
                            </div>

                            <Row className="g-3">
                                <Col md={8}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">Hospital Name *</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="e.g., City General Hospital"
                                            value={profile.name || ''}
                                            onChange={(e) => handleChange('name', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">Registration No.</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="e.g., REG/2024/001"
                                            value={profile.registration_number || ''}
                                            onChange={(e) => handleChange('registration_number', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">Tagline/Slogan</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="e.g., Excellence in Healthcare"
                                            value={profile.tagline || ''}
                                            onChange={(e) => handleChange('tagline', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Tab>

                {/* Contact Tab */}
                <Tab eventKey="contact" title="Contact Details">
                    <Card className="border-0 shadow-sm mb-4">
                        <Card.Body className="p-4">
                            <div className="d-flex align-items-center gap-2 mb-4">
                                <Phone size={20} className="text-success" />
                                <h5 className="mb-0 fw-semibold">Contact Information</h5>
                            </div>

                            <Row className="g-3">
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">Primary Phone</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="+91 1234567890"
                                            value={profile.phone || ''}
                                            onChange={(e) => handleChange('phone', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">Emergency/Secondary Phone</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="+91 9876543210"
                                            value={profile.phone_secondary || ''}
                                            onChange={(e) => handleChange('phone_secondary', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">Fax</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="+91 1234567891"
                                            value={profile.fax || ''}
                                            onChange={(e) => handleChange('fax', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">Email</Form.Label>
                                        <Form.Control
                                            type="email"
                                            placeholder="info@hospital.com"
                                            value={profile.email || ''}
                                            onChange={(e) => handleChange('email', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">Website</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="www.hospital.com"
                                            value={profile.website || ''}
                                            onChange={(e) => handleChange('website', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    <Card className="border-0 shadow-sm mb-4">
                        <Card.Body className="p-4">
                            <div className="d-flex align-items-center gap-2 mb-4">
                                <MapPin size={20} className="text-danger" />
                                <h5 className="mb-0 fw-semibold">Address</h5>
                            </div>

                            <Row className="g-3">
                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">Address Line 1</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="Street, Building Name"
                                            value={profile.address_line1 || ''}
                                            onChange={(e) => handleChange('address_line1', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">Address Line 2</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="Area, Landmark"
                                            value={profile.address_line2 || ''}
                                            onChange={(e) => handleChange('address_line2', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">City</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="Mumbai"
                                            value={profile.city || ''}
                                            onChange={(e) => handleChange('city', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">State</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="Maharashtra"
                                            value={profile.state || ''}
                                            onChange={(e) => handleChange('state', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={2}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">PIN Code</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="400001"
                                            value={profile.pincode || ''}
                                            onChange={(e) => handleChange('pincode', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={2}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">Country</Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={profile.country || 'India'}
                                            onChange={(e) => handleChange('country', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Tab>

                {/* Legal/Tax Tab */}
                <Tab eventKey="legal" title="Legal & Tax">
                    <Card className="border-0 shadow-sm mb-4">
                        <Card.Body className="p-4">
                            <div className="d-flex align-items-center gap-2 mb-4">
                                <Hash size={20} className="text-info" />
                                <h5 className="mb-0 fw-semibold">Tax & Registration Details</h5>
                            </div>

                            <Row className="g-3">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">GSTIN</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="22AAAAA0000A1Z5"
                                            value={profile.gstin || ''}
                                            onChange={(e) => handleChange('gstin', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">PAN</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="AAAAA1234A"
                                            value={profile.pan || ''}
                                            onChange={(e) => handleChange('pan', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">CIN (Company ID)</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="U12345MH2024PTC123456"
                                            value={profile.cin || ''}
                                            onChange={(e) => handleChange('cin', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">TAN</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="MUMA12345A"
                                            value={profile.tan || ''}
                                            onChange={(e) => handleChange('tan', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    <Card className="border-0 shadow-sm mb-4">
                        <Card.Body className="p-4">
                            <div className="d-flex align-items-center gap-2 mb-4">
                                <Building2 size={20} className="text-warning" />
                                <h5 className="mb-0 fw-semibold">Accreditations & Licenses</h5>
                            </div>

                            <Row className="g-3">
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">NABH Accreditation</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="NABH Certificate No."
                                            value={profile.nabh_accreditation || ''}
                                            onChange={(e) => handleChange('nabh_accreditation', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">Lab NABL Number</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="NABL Certificate No."
                                            value={profile.lab_nabl_number || ''}
                                            onChange={(e) => handleChange('lab_nabl_number', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">Pharmacy License</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="Drug License No."
                                            value={profile.pharmacy_license || ''}
                                            onChange={(e) => handleChange('pharmacy_license', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Tab>

                {/* Branding Tab */}
                <Tab eventKey="branding" title="Branding">
                    <Card className="border-0 shadow-sm mb-4">
                        <Card.Body className="p-4">
                            <div className="d-flex align-items-center gap-2 mb-4">
                                <Image size={20} className="text-purple" />
                                <h5 className="mb-0 fw-semibold">Logo & Colors</h5>
                            </div>

                            <Row className="g-3">
                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">Hospital Logo</Form.Label>
                                        
                                        {/* File Upload Zone */}
                                        <div 
                                            className="border rounded p-4 text-center mb-3"
                                            style={{ 
                                                borderStyle: 'dashed', 
                                                borderColor: '#dee2e6',
                                                backgroundColor: '#f8f9fa',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => document.getElementById('logo-file-input').click()}
                                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.backgroundColor = '#e9ecef'; }}
                                            onDragLeave={(e) => { e.currentTarget.style.backgroundColor = '#f8f9fa'; }}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                e.currentTarget.style.backgroundColor = '#f8f9fa';
                                                const file = e.dataTransfer.files[0];
                                                if (file) handleLogoUpload(file);
                                            }}
                                        >
                                            {uploading ? (
                                                <div>
                                                    <Spinner size="sm" className="me-2" />
                                                    Uploading...
                                                </div>
                                            ) : (
                                                <>
                                                    <Image size={32} className="text-muted mb-2" />
                                                    <div className="text-muted">
                                                        Drag & drop logo here, or click to browse
                                                    </div>
                                                    <small className="text-muted">
                                                        JPEG or PNG, max 2MB, recommended 400x120px
                                                    </small>
                                                </>
                                            )}
                                        </div>
                                        
                                        <input
                                            type="file"
                                            id="logo-file-input"
                                            accept="image/jpeg,image/png"
                                            style={{ display: 'none' }}
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) handleLogoUpload(file);
                                            }}
                                        />
                                        
                                        {/* OR Manual URL */}
                                        <div className="d-flex align-items-center gap-2 mt-2">
                                            <span className="text-muted">OR enter URL:</span>
                                            <Form.Control
                                                type="text"
                                                placeholder="https://your-domain.com/logo.png"
                                                value={profile.logo_url || ''}
                                                onChange={(e) => handleChange('logo_url', e.target.value)}
                                                size="sm"
                                            />
                                        </div>
                                    </Form.Group>
                                </Col>

                                {profile.logo_url && (
                                    <Col md={12}>
                                        <div className="p-3 bg-light rounded text-center">
                                            <small className="text-muted d-block mb-2">Logo Preview</small>
                                            <img
                                                src={profile.logo_url}
                                                alt="Hospital Logo"
                                                style={{ maxHeight: '80px', maxWidth: '300px' }}
                                                onError={(e) => e.target.style.display = 'none'}
                                            />
                                        </div>
                                    </Col>
                                )}

                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">Primary Color</Form.Label>
                                        <div className="d-flex gap-2">
                                            <Form.Control
                                                type="color"
                                                value={profile.primary_color || '#0d6efd'}
                                                onChange={(e) => handleChange('primary_color', e.target.value)}
                                                style={{ width: '60px', height: '38px' }}
                                            />
                                            <Form.Control
                                                type="text"
                                                value={profile.primary_color || '#0d6efd'}
                                                onChange={(e) => handleChange('primary_color', e.target.value)}
                                            />
                                        </div>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">Secondary Color</Form.Label>
                                        <div className="d-flex gap-2">
                                            <Form.Control
                                                type="color"
                                                value={profile.secondary_color || '#6c757d'}
                                                onChange={(e) => handleChange('secondary_color', e.target.value)}
                                                style={{ width: '60px', height: '38px' }}
                                            />
                                            <Form.Control
                                                type="text"
                                                value={profile.secondary_color || '#6c757d'}
                                                onChange={(e) => handleChange('secondary_color', e.target.value)}
                                            />
                                        </div>
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Tab>

                {/* ID Series Tab */}
                <Tab eventKey="id-series" title="ID Series ⭐">
                    <IdSeriesSettings />
                </Tab>
            </Tabs>

            {/* Save Button */}
            <div className="d-flex justify-content-end">
                <Button
                    variant="primary"
                    size="lg"
                    onClick={handleSave}
                    disabled={saving || !profile.name}
                >
                    {saving ? (
                        <>
                            <Spinner size="sm" className="me-2" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save size={18} className="me-2" />
                            Save Hospital Profile
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};

export default HospitalProfileSettings;
