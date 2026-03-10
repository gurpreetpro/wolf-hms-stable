/**
 * PMJAY Package Selector
 * AI-assisted package selection for doctors
 * 
 * Features:
 * - Specialty-based filtering
 * - Diagnosis-based AI suggestions
 * - Package details with tier rates
 * - Pre-auth requirements display
 * 
 * WOLF HMS
 */

import React, { useState, useEffect } from 'react';
import { 
    Modal, Form, Button, Badge, Alert, ListGroup, 
    InputGroup, Spinner, ProgressBar, Row, Col, Card 
} from 'react-bootstrap';
import { 
    Search, Package, Shield, Clock, Stethoscope, 
    CheckCircle, AlertTriangle, Star, IndianRupee, Info, Heart 
} from 'lucide-react';
import api from '../../utils/axiosInstance';

const PMJAYPackageSelector = ({ 
    show, 
    onHide, 
    onSelect, 
    patientData = {},
    diagnosis = '',
    isDark = false 
}) => {
    // State
    const [step, setStep] = useState('specialty'); // specialty, search, details
    const [specialties, setSpecialties] = useState([]);
    const [selectedSpecialty, setSelectedSpecialty] = useState(null);
    const [packages, setPackages] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [cityTier, setCityTier] = useState('T2');

    // Fetch specialties on mount
    useEffect(() => {
        if (show) {
            fetchSpecialties();
            if (diagnosis) {
                fetchSuggestions(diagnosis);
            }
        }
    }, [show, diagnosis]);

    // Fetch specialties
    const fetchSpecialties = async () => {
        try {
            const res = await api.get('/pmjay/hbp/specialties');
            if (res.data.success) {
                setSpecialties(res.data.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch specialties:', err);
            // Fallback data
            setSpecialties([
                { code: 'MG', name: 'General Medicine', procedure_count: 150 },
                { code: 'GS', name: 'General Surgery', procedure_count: 120 },
                { code: 'OG', name: 'Obstetrics & Gynaecology', procedure_count: 85 },
                { code: 'OR', name: 'Orthopedics', procedure_count: 90 },
                { code: 'OP', name: 'Ophthalmology', procedure_count: 40 },
                { code: 'MC', name: 'Cardiology', procedure_count: 45 },
                { code: 'NE', name: 'Nephrology', procedure_count: 25 }
            ]);
        }
    };

    // Fetch packages by specialty
    const fetchPackages = async (specialtyCode) => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/pmjay/hbp/packages?specialty=${specialtyCode}`);
            if (res.data.success) {
                setPackages(res.data.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch packages:', err);
            setError('Failed to load packages');
        } finally {
            setLoading(false);
        }
    };

    // Search packages
    const searchPackages = async (query) => {
        if (query.length < 2) return;
        
        setLoading(true);
        try {
            const res = await api.get(`/pmjay/hbp/packages?search=${encodeURIComponent(query)}`);
            if (res.data.success) {
                setPackages(res.data.data || []);
            }
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setLoading(false);
        }
    };

    // AI suggestions based on diagnosis
    const fetchSuggestions = async (diagnosisText) => {
        try {
            const res = await api.post('/pmjay/hbp/suggest-package', { diagnosis: diagnosisText });
            if (res.data.success) {
                setSuggestions(res.data.data || []);
            }
        } catch (err) {
            console.error('Suggestions failed:', err);
        }
    };

    // Fetch package details
    const fetchPackageDetails = async (packageCode) => {
        setLoading(true);
        try {
            const res = await api.get(`/pmjay/hbp/packages/${packageCode}?tier=${cityTier}`);
            if (res.data.success) {
                setSelectedPackage(res.data.data);
                setStep('details');
            }
        } catch (err) {
            console.error('Package details failed:', err);
            setError('Failed to load package details');
        } finally {
            setLoading(false);
        }
    };

    // Handle specialty selection
    const handleSpecialtySelect = (specialty) => {
        setSelectedSpecialty(specialty);
        fetchPackages(specialty.code);
        setStep('search');
    };

    // Handle package selection confirmation
    const handleConfirm = () => {
        if (onSelect && selectedPackage) {
            onSelect({
                packageCode: selectedPackage.packageCode,
                packageName: selectedPackage.packageName,
                rate: selectedPackage.appliedRate,
                baseRate: selectedPackage.baseRate,
                cityTier: selectedPackage.cityTier,
                requiresPreauth: selectedPackage.requiresPreauth,
                expectedLOS: selectedPackage.expectedLOS,
                procedures: selectedPackage.procedures || []
            });
        }
        handleClose();
    };

    // Reset and close
    const handleClose = () => {
        setStep('specialty');
        setSelectedSpecialty(null);
        setPackages([]);
        setSelectedPackage(null);
        setSearchQuery('');
        setError(null);
        onHide();
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', { 
            style: 'currency', 
            currency: 'INR',
            maximumFractionDigits: 0 
        }).format(amount);
    };

    // Glass style
    const glassStyle = {
        background: isDark 
            ? 'rgba(30, 30, 46, 0.95)' 
            : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        border: isDark 
            ? '1px solid rgba(139, 92, 246, 0.2)' 
            : '1px solid rgba(52, 211, 153, 0.2)',
        borderRadius: '16px'
    };

    return (
        <Modal 
            show={show} 
            onHide={handleClose} 
            size="xl" 
            centered
            contentClassName="border-0"
        >
            <div style={glassStyle}>
                {/* Header */}
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="d-flex align-items-center gap-2">
                        <div 
                            className="d-flex align-items-center justify-content-center rounded-circle"
                            style={{ 
                                width: 40, 
                                height: 40, 
                                background: 'linear-gradient(135deg, #059669 0%, #34d399 100%)' 
                            }}
                        >
                            <Package size={20} color="white" />
                        </div>
                        <div>
                            <span>Select PMJAY Package</span>
                            {patientData.name && (
                                <div className="small text-muted">
                                    Patient: {patientData.name}
                                </div>
                            )}
                        </div>
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    {/* Progress Steps */}
                    <div className="d-flex justify-content-between mb-4 px-4">
                        {['specialty', 'search', 'details'].map((s, i) => (
                            <div 
                                key={s} 
                                className="d-flex flex-column align-items-center"
                                style={{ flex: 1 }}
                            >
                                <div 
                                    className="rounded-circle d-flex align-items-center justify-content-center mb-1"
                                    style={{
                                        width: 32,
                                        height: 32,
                                        background: step === s || ['specialty', 'search', 'details'].indexOf(step) > i
                                            ? 'linear-gradient(135deg, #059669 0%, #34d399 100%)'
                                            : isDark ? '#374151' : '#e5e7eb',
                                        color: step === s || ['specialty', 'search', 'details'].indexOf(step) > i
                                            ? 'white'
                                            : isDark ? '#9ca3af' : '#6b7280'
                                    }}
                                >
                                    {i + 1}
                                </div>
                                <small className="text-muted text-capitalize">
                                    {s === 'specialty' ? 'Specialty' : s === 'search' ? 'Package' : 'Confirm'}
                                </small>
                            </div>
                        ))}
                    </div>

                    {/* City Tier Selector */}
                    <div className="mb-3 text-end">
                        <small className="text-muted me-2">City Tier:</small>
                        {['T1', 'T2', 'T3'].map(tier => (
                            <Button
                                key={tier}
                                size="sm"
                                variant={cityTier === tier ? 'success' : 'outline-secondary'}
                                className="mx-1"
                                onClick={() => setCityTier(tier)}
                            >
                                {tier}
                            </Button>
                        ))}
                    </div>

                    {error && (
                        <Alert variant="danger" className="d-flex align-items-center gap-2">
                            <AlertTriangle size={18} />
                            {error}
                        </Alert>
                    )}

                    {/* AI Suggestions */}
                    {suggestions.length > 0 && step === 'specialty' && (
                        <Alert variant="info" className="mb-4">
                            <div className="d-flex align-items-center gap-2 mb-2">
                                <Star size={18} className="text-warning" />
                                <strong>AI Suggested Packages</strong>
                                <small className="text-muted">(Based on diagnosis)</small>
                            </div>
                            <div className="d-flex flex-wrap gap-2">
                                {suggestions.slice(0, 5).map(pkg => (
                                    <Button
                                        key={pkg.code}
                                        size="sm"
                                        variant="outline-primary"
                                        onClick={() => fetchPackageDetails(pkg.code)}
                                        className="d-flex align-items-center gap-1"
                                    >
                                        {pkg.name}
                                        <Badge bg="success">{formatCurrency(pkg.base_rate)}</Badge>
                                    </Button>
                                ))}
                            </div>
                        </Alert>
                    )}

                    {/* Step 1: Specialty Selection */}
                    {step === 'specialty' && (
                        <Row className="g-3">
                            {specialties.map(spec => (
                                <Col key={spec.code} xs={6} md={4} lg={3}>
                                    <Card 
                                        className={`h-100 border-0 shadow-sm cursor-pointer ${isDark ? 'bg-dark text-white' : ''}`}
                                        style={{ 
                                            cursor: 'pointer',
                                            transition: 'transform 0.2s',
                                            border: '1px solid transparent'
                                        }}
                                        onClick={() => handleSpecialtySelect(spec)}
                                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        <Card.Body className="text-center p-3">
                                            <div 
                                                className="d-inline-flex align-items-center justify-content-center rounded-circle mb-2"
                                                style={{ 
                                                    width: 48, 
                                                    height: 48,
                                                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                                                }}
                                            >
                                                <Stethoscope size={24} color="white" />
                                            </div>
                                            <h6 className="mb-1">{spec.name}</h6>
                                            <small className="text-muted">
                                                {spec.procedure_count} procedures
                                            </small>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    )}

                    {/* Step 2: Package Search & List */}
                    {step === 'search' && (
                        <div>
                            {/* Search Bar */}
                            <InputGroup className="mb-4">
                                <InputGroup.Text className="bg-transparent border-end-0">
                                    <Search size={18} />
                                </InputGroup.Text>
                                <Form.Control
                                    type="text"
                                    placeholder={`Search in ${selectedSpecialty?.name || 'packages'}...`}
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        if (e.target.value.length >= 2) {
                                            searchPackages(e.target.value);
                                        }
                                    }}
                                    className="border-start-0"
                                />
                                <Button 
                                    variant="outline-secondary"
                                    onClick={() => setStep('specialty')}
                                >
                                    Change Specialty
                                </Button>
                            </InputGroup>

                            {loading ? (
                                <div className="text-center py-5">
                                    <Spinner animation="border" variant="success" />
                                    <div className="mt-2 text-muted">Loading packages...</div>
                                </div>
                            ) : (
                                <ListGroup variant="flush">
                                    {packages.map(pkg => (
                                        <ListGroup.Item
                                            key={pkg.code}
                                            action
                                            onClick={() => fetchPackageDetails(pkg.code)}
                                            className={`d-flex justify-content-between align-items-center py-3 ${isDark ? 'bg-dark text-white border-secondary' : ''}`}
                                        >
                                            <div>
                                                <h6 className="mb-1 d-flex align-items-center gap-2">
                                                    {pkg.name}
                                                    {pkg.requires_preauth && (
                                                        <Badge bg="warning" text="dark" className="ms-2">
                                                            <Shield size={10} className="me-1" />
                                                            Pre-Auth
                                                        </Badge>
                                                    )}
                                                    {pkg.is_surgical && (
                                                        <Badge bg="info">Surgical</Badge>
                                                    )}
                                                </h6>
                                                <small className="text-muted">
                                                    Code: {pkg.code} | {pkg.specialty_name || selectedSpecialty?.name}
                                                </small>
                                            </div>
                                            <div className="text-end">
                                                <div className="h5 mb-0 text-success">
                                                    {formatCurrency(pkg.base_rate)}
                                                </div>
                                                <small className="text-muted">
                                                    {pkg.expected_los ? `${pkg.expected_los} days LOS` : ''}
                                                </small>
                                            </div>
                                        </ListGroup.Item>
                                    ))}
                                    {packages.length === 0 && !loading && (
                                        <div className="text-center py-5 text-muted">
                                            <Package size={48} className="mb-3 opacity-50" />
                                            <p>No packages found. Try searching or select a specialty.</p>
                                        </div>
                                    )}
                                </ListGroup>
                            )}
                        </div>
                    )}

                    {/* Step 3: Package Details & Confirm */}
                    {step === 'details' && selectedPackage && (
                        <div>
                            <div 
                                className="p-4 rounded-3 mb-4"
                                style={{
                                    background: isDark 
                                        ? 'linear-gradient(135deg, rgba(5, 150, 105, 0.2) 0%, rgba(52, 211, 153, 0.1) 100%)'
                                        : 'linear-gradient(135deg, rgba(5, 150, 105, 0.1) 0%, rgba(52, 211, 153, 0.05) 100%)',
                                    border: '1px solid rgba(52, 211, 153, 0.3)'
                                }}
                            >
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                    <div>
                                        <h4 className="mb-1">{selectedPackage.packageName}</h4>
                                        <div className="text-muted">
                                            Code: <code>{selectedPackage.packageCode}</code>
                                        </div>
                                    </div>
                                    <div className="text-end">
                                        <div className="h3 mb-0 text-success">
                                            {formatCurrency(selectedPackage.appliedRate)}
                                        </div>
                                        <small className="text-muted">
                                            Tier {selectedPackage.cityTier} Rate
                                        </small>
                                    </div>
                                </div>

                                <Row className="g-3 mb-3">
                                    <Col md={4}>
                                        <div className="p-3 rounded bg-white bg-opacity-10">
                                            <small className="text-muted d-block">Base Rate</small>
                                            <strong>{formatCurrency(selectedPackage.baseRate)}</strong>
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="p-3 rounded bg-white bg-opacity-10">
                                            <small className="text-muted d-block">Expected LOS</small>
                                            <strong>{selectedPackage.expectedLOS || 3} days</strong>
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="p-3 rounded bg-white bg-opacity-10">
                                            <small className="text-muted d-block">Pre-Authorization</small>
                                            <strong>
                                                {selectedPackage.requiresPreauth ? (
                                                    <span className="text-warning">
                                                        <Shield size={14} className="me-1" />
                                                        Required
                                                    </span>
                                                ) : (
                                                    <span className="text-success">
                                                        <CheckCircle size={14} className="me-1" />
                                                        Not Required
                                                    </span>
                                                )}
                                            </strong>
                                        </div>
                                    </Col>
                                </Row>

                                {/* Included Procedures */}
                                {selectedPackage.procedures?.length > 0 && (
                                    <div>
                                        <h6 className="mb-2">Included Procedures</h6>
                                        <ListGroup variant="flush" className="rounded">
                                            {selectedPackage.procedures.map(proc => (
                                                <ListGroup.Item 
                                                    key={proc.code}
                                                    className={`d-flex justify-content-between py-2 ${isDark ? 'bg-transparent text-white border-secondary' : ''}`}
                                                >
                                                    <span>
                                                        <code className="me-2">{proc.code}</code>
                                                        {proc.name}
                                                    </span>
                                                    <span className="text-success">
                                                        {formatCurrency(proc.rate)}
                                                    </span>
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                    </div>
                                )}
                            </div>

                            {/* Inclusions Info */}
                            <Alert variant="info" className="d-flex gap-2">
                                <Info size={18} />
                                <div>
                                    <strong>Package Includes:</strong> Medicines, Consumables, Diagnostics, 
                                    Bed Charges, Nursing, Doctor Consultation (3 days pre + 15 days post hospitalization)
                                </div>
                            </Alert>
                        </div>
                    )}
                </Modal.Body>

                <Modal.Footer className="border-0 pt-0">
                    <Button variant="outline-secondary" onClick={handleClose}>
                        Cancel
                    </Button>
                    
                    {step === 'search' && (
                        <Button 
                            variant="outline-secondary" 
                            onClick={() => setStep('specialty')}
                        >
                            Back to Specialties
                        </Button>
                    )}
                    
                    {step === 'details' && (
                        <>
                            <Button 
                                variant="outline-secondary" 
                                onClick={() => setStep('search')}
                            >
                                Back to Packages
                            </Button>
                            <Button 
                                variant="success" 
                                onClick={handleConfirm}
                                className="px-4"
                            >
                                <CheckCircle size={18} className="me-2" />
                                Select Package
                            </Button>
                        </>
                    )}
                </Modal.Footer>
            </div>
        </Modal>
    );
};

export default PMJAYPackageSelector;
