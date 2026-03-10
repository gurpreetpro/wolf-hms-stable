/**
 * PMJAY Admission Card
 * Shows PMJAY package and claim status for admitted patients
 * 
 * Used in: WardDashboard, NurseDashboard, PatientProfile
 * 
 * WOLF HMS
 */

import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, ProgressBar, Collapse, ListGroup, Alert } from 'react-bootstrap';
import { 
    Shield, Package, Clock, CheckCircle, AlertTriangle, 
    ChevronDown, ChevronUp, FileText, IndianRupee, Heart
} from 'lucide-react';
import api from '../../utils/axiosInstance';

const PMJAYAdmissionCard = ({ 
    admissionId,
    patientId,
    pmjayData = null,
    compact = false,
    onPreAuthRequest,
    onViewClaim,
    isDark = false
}) => {
    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [packageDetails, setPackageDetails] = useState(null);
    const [claimStatus, setClaimStatus] = useState(null);

    // Fetch package details on mount
    useEffect(() => {
        if (pmjayData?.packageCode) {
            fetchPackageDetails(pmjayData.packageCode);
        }
        if (pmjayData?.claimId) {
            fetchClaimStatus(pmjayData.claimId);
        }
    }, [pmjayData]);

    const fetchPackageDetails = async (packageCode) => {
        try {
            const res = await api.get(`/pmjay/hbp/packages/${packageCode}?tier=${pmjayData?.cityTier || 'T2'}`);
            if (res.data.success) {
                setPackageDetails(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch package:', err);
        }
    };

    const fetchClaimStatus = async (claimId) => {
        try {
            const res = await api.get(`/tpa/pmjay/claims/${claimId}/status`);
            if (res.data.success) {
                setClaimStatus(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch claim:', err);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', { 
            style: 'currency', 
            currency: 'INR',
            maximumFractionDigits: 0 
        }).format(amount);
    };

    const getStatusBadge = (status) => {
        const styles = {
            'pending': { bg: 'warning', text: 'Pending Pre-Auth' },
            'approved': { bg: 'success', text: 'Pre-Auth Approved' },
            'rejected': { bg: 'danger', text: 'Pre-Auth Rejected' },
            'claim_submitted': { bg: 'info', text: 'Claim Submitted' },
            'claim_approved': { bg: 'success', text: 'Claim Approved' },
            'settled': { bg: 'success', text: 'Payment Settled' }
        };
        const style = styles[status] || { bg: 'secondary', text: status };
        return <Badge bg={style.bg}>{style.text}</Badge>;
    };

    // No PMJAY data
    if (!pmjayData) {
        return null;
    }

    // Compact mode for lists
    if (compact) {
        return (
            <div 
                className={`d-flex align-items-center gap-2 p-2 rounded-3 ${isDark ? 'bg-success bg-opacity-10' : 'bg-success bg-opacity-10'}`}
                style={{ border: '1px solid rgba(52, 211, 153, 0.3)' }}
            >
                <Shield size={16} className="text-success" />
                <span className="fw-medium small">PMJAY</span>
                <code className="small">{pmjayData.packageCode}</code>
                {getStatusBadge(pmjayData.status)}
                <span className="ms-auto text-success fw-bold small">
                    {formatCurrency(pmjayData.packageRate || 0)}
                </span>
            </div>
        );
    }

    // Full card
    return (
        <Card 
            className={`border-0 shadow-sm mb-3 ${isDark ? 'bg-dark text-white' : ''}`}
            style={{ 
                background: isDark 
                    ? 'linear-gradient(135deg, rgba(5, 150, 105, 0.15) 0%, rgba(52, 211, 153, 0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(5, 150, 105, 0.08) 0%, rgba(52, 211, 153, 0.05) 100%)',
                border: '1px solid rgba(52, 211, 153, 0.3)'
            }}
        >
            <Card.Header 
                className="bg-transparent border-0 d-flex justify-content-between align-items-center py-3"
                style={{ cursor: 'pointer' }}
                onClick={() => setExpanded(!expanded)}
            >
                <div className="d-flex align-items-center gap-2">
                    <div 
                        className="d-flex align-items-center justify-content-center rounded-circle"
                        style={{ 
                            width: 36, 
                            height: 36, 
                            background: 'linear-gradient(135deg, #059669 0%, #34d399 100%)' 
                        }}
                    >
                        <Heart size={18} color="white" />
                    </div>
                    <div>
                        <h6 className="mb-0 fw-bold">Ayushman Bharat - PMJAY</h6>
                        <small className="text-muted">
                            ID: <code>{pmjayData.beneficiaryId || pmjayData.pmjayId}</code>
                        </small>
                    </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                    {getStatusBadge(pmjayData.status)}
                    {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
            </Card.Header>

            <Collapse in={expanded}>
                <div>
                    <Card.Body className="pt-0">
                        {/* Package Info */}
                        <div className="p-3 rounded-3 mb-3 bg-white bg-opacity-10">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                    <small className="text-muted d-block">Package</small>
                                    <strong>{pmjayData.packageName || packageDetails?.packageName}</strong>
                                    <div className="text-muted small">
                                        Code: <code>{pmjayData.packageCode}</code>
                                    </div>
                                </div>
                                <div className="text-end">
                                    <small className="text-muted d-block">Package Rate</small>
                                    <h4 className="mb-0 text-success">
                                        {formatCurrency(pmjayData.packageRate || packageDetails?.appliedRate || 0)}
                                    </h4>
                                </div>
                            </div>

                            {packageDetails?.expectedLOS && (
                                <div className="d-flex gap-3 mt-2">
                                    <Badge bg="secondary">
                                        <Clock size={10} className="me-1" />
                                        {packageDetails.expectedLOS} days LOS
                                    </Badge>
                                    {packageDetails.requiresPreauth && (
                                        <Badge bg="warning" text="dark">
                                            <Shield size={10} className="me-1" />
                                            Pre-Auth Required
                                        </Badge>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Pre-Auth Status */}
                        {pmjayData.preauthId && (
                            <div className="p-3 rounded-3 mb-3 bg-white bg-opacity-10">
                                <small className="text-muted d-block mb-1">Pre-Authorization</small>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <code>{pmjayData.preauthId}</code>
                                        <div className="small text-muted">
                                            Approved: {pmjayData.preauthDate ? new Date(pmjayData.preauthDate).toLocaleDateString() : 'N/A'}
                                        </div>
                                    </div>
                                    <Badge bg="success" className="px-3 py-2">
                                        <CheckCircle size={12} className="me-1" />
                                        Approved
                                    </Badge>
                                </div>
                            </div>
                        )}

                        {/* Billing Note */}
                        <Alert variant="info" className="d-flex gap-2 mb-3">
                            <Shield size={18} />
                            <div>
                                <strong>Zero Billing Mode</strong>
                                <div className="small">
                                    All covered items (labs, medicines, procedures) will be tracked 
                                    under the package and not billed to patient.
                                </div>
                            </div>
                        </Alert>

                        {/* Actions */}
                        <div className="d-flex gap-2">
                            {!pmjayData.preauthId && pmjayData.requiresPreauth && (
                                <Button 
                                    variant="warning" 
                                    size="sm"
                                    onClick={onPreAuthRequest}
                                >
                                    <Shield size={14} className="me-1" />
                                    Request Pre-Auth
                                </Button>
                            )}
                            <Button 
                                variant="outline-success" 
                                size="sm"
                                onClick={onViewClaim}
                            >
                                <FileText size={14} className="me-1" />
                                View Claim
                            </Button>
                        </div>
                    </Card.Body>
                </div>
            </Collapse>
        </Card>
    );
};

export default PMJAYAdmissionCard;
