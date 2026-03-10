/**
 * LabQueueTab.jsx - Lab Queue Component (Refactored for Centralized Billing)
 * 
 * GOLD STANDARD: Payment collection removed. All charges go to centralized billing queue.
 * Lab staff can now collect samples without payment blocking - billing handles payments.
 */

import React, { useState } from 'react';
import { Card, Table, Badge, Button, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Upload, Beaker, IndianRupee, Clock } from 'lucide-react';
import LabBarcodeDisplay from '../LabBarcodeDisplay';
import api from '../../utils/axiosInstance';

const LabQueueTab = ({ queue, fetchQueue, fetchStats, onUploadClick }) => {
    const [error, setError] = useState(null);
    const [collectingId, setCollectingId] = useState(null);

    const handleCollectSample = async (requestId) => {
        try {
            setCollectingId(requestId);
            const token = localStorage.getItem('token');
            const res = await api.post(`/api/lab/collect/${requestId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(`✅ Sample collected! Barcode: ${res.data.barcode}`);
            fetchQueue(); // Refresh queue
            fetchStats();
        } catch (err) {
            console.error('Collect sample error:', err);
            // Check if it's a payment required error
            if (err.response?.status === 402) {
                setError('Payment required - Please ask patient to pay at billing counter.');
            } else {
                setError('Failed to collect sample');
            }
            setTimeout(() => setError(null), 5000);
        } finally {
            setCollectingId(null);
        }
    };

    // Get billing status badge
    const getBillingBadge = (req) => {
        const isIPD = !!req.admission_id;
        
        if (isIPD) {
            return (
                <Badge bg="info" className="d-flex align-items-center gap-1">
                    <IndianRupee size={12} /> IPD (Bill on Discharge)
                </Badge>
            );
        }
        
        if (req.payment_status === 'Paid') {
            return (
                <Badge bg="success" className="d-flex align-items-center gap-1">
                    <IndianRupee size={12} /> Paid
                </Badge>
            );
        }
        
        // OPD - Pending billing
        return (
            <OverlayTrigger
                placement="top"
                overlay={<Tooltip>Charge sent to billing queue</Tooltip>}
            >
                <Badge bg="warning" text="dark" className="d-flex align-items-center gap-1">
                    <Clock size={12} /> Pending Billing
                </Badge>
            </OverlayTrigger>
        );
    };

    return (
        <Card className="shadow-sm border-0">
            {error && (
                <Alert variant="danger" onClose={() => setError(null)} dismissible className="m-3">
                    {error}
                </Alert>
            )}
            <Table hover responsive className="mb-0 align-middle">
                <thead className="bg-light">
                    <tr>
                        <th>ID</th>
                        <th>Barcode</th>
                        <th>Patient</th>
                        <th>Type</th>
                        <th>Test</th>
                        <th>Billing</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {queue.map(req => {
                        const isIPD = !!req.admission_id;
                        const isCollected = req.status === 'Sample Collected' || req.sample_collected_at;
                        
                        return (
                            <tr key={req.id}>
                                <td>#{req.id}</td>
                                <td>
                                    {req.barcode ? (
                                        <LabBarcodeDisplay
                                            barcode={req.barcode}
                                            patientName={req.patient_name}
                                            testName={req.test_name}
                                        />
                                    ) : (
                                        <Badge bg="secondary" className="opacity-50">Pending</Badge>
                                    )}
                                </td>
                                <td>{req.patient_name}</td>
                                <td>
                                    <Badge bg={isIPD ? 'info' : 'primary'}>
                                        {isIPD ? 'IPD' : 'OPD'}
                                    </Badge>
                                </td>
                                <td>
                                    <div>{req.test_name}</div>
                                    {req.price && (
                                        <small className="text-muted">₹{req.price}</small>
                                    )}
                                </td>
                                <td>{getBillingBadge(req)}</td>
                                <td>
                                    <Badge bg={isCollected ? 'success' : 'warning'}>
                                        {req.status}
                                    </Badge>
                                </td>
                                <td>
                                    <div className="d-flex gap-1">
                                        {/* Collect Sample Button - Always available if not collected */}
                                        {!isCollected && (
                                            <Button
                                                size="sm"
                                                variant="outline-success"
                                                onClick={() => handleCollectSample(req.id)}
                                                disabled={collectingId === req.id}
                                                title="Collect Sample"
                                            >
                                                <Beaker size={14} className="me-1" />
                                                {collectingId === req.id ? 'Collecting...' : 'Collect'}
                                            </Button>
                                        )}
                                        
                                        {/* Upload Result Button - Available after sample collection */}
                                        {isCollected && (
                                            <Button 
                                                size="sm" 
                                                variant="outline-primary" 
                                                onClick={() => onUploadClick(req)}
                                            >
                                                <Upload size={14} className="me-1" /> Upload Result
                                            </Button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    {queue.length === 0 && (
                        <tr>
                            <td colSpan="8" className="text-center p-4 text-muted">
                                No pending requests
                            </td>
                        </tr>
                    )}
                </tbody>
            </Table>
            
            {/* Info Banner - Centralized Billing */}
            <div className="bg-light border-top p-2 text-center">
                <small className="text-muted">
                    <IndianRupee size={12} className="me-1" />
                    All payments are now handled at the <strong>Billing Counter</strong>. 
                    Lab staff can collect samples immediately.
                </small>
            </div>
        </Card>
    );
};

export default LabQueueTab;
