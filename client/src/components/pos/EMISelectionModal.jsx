import React, { useState, useEffect } from 'react';
import { Modal, Button, Table, Badge, Spinner, Alert, Form } from 'react-bootstrap';
import { CreditCard, Percent, Calendar, IndianRupee, Check } from 'lucide-react';
import axios from 'axios';

/**
 * EMI Selection Modal
 * Displays available EMI offers for POS transactions
 */
const EMISelectionModal = ({ show, onHide, amount, deviceId, onSelect }) => {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedOffer, setSelectedOffer] = useState(null);
    const [cardBin, setCardBin] = useState('');

    useEffect(() => {
        if (show && amount >= 3000) {
            fetchEMIOffers();
        }
    }, [show, amount, cardBin]);

    const fetchEMIOffers = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                amount: amount.toString(),
                ...(deviceId && { deviceId }),
                ...(cardBin && cardBin.length >= 6 && { cardBin: cardBin.substring(0, 6) })
            });

            const response = await axios.get(`/api/pos/emi-offers?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setOffers(response.data.offers || []);
        } catch (err) {
            console.error('Failed to fetch EMI offers:', err);
            setError('Failed to load EMI offers. Please try again.');
            // Demo fallback
            setOffers([
                { tenure: 3, bank: 'HDFC', interestRate: 0, emiAmount: Math.round(amount / 3), processingFee: 0 },
                { tenure: 6, bank: 'ICICI', interestRate: 13, emiAmount: Math.round(amount / 6 * 1.065), processingFee: 199 },
                { tenure: 9, bank: 'SBI', interestRate: 14, emiAmount: Math.round(amount / 9 * 1.07), processingFee: 299 },
                { tenure: 12, bank: 'Axis', interestRate: 15, emiAmount: Math.round(amount / 12 * 1.075), processingFee: 499 }
            ]);
        }
        setLoading(false);
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(value || 0);
    };

    const handleConfirm = () => {
        if (selectedOffer) {
            onSelect({
                emi: true,
                emiTenure: selectedOffer.tenure,
                emiBank: selectedOffer.bank,
                emiInterestRate: selectedOffer.interestRate,
                emiAmount: selectedOffer.emiAmount,
                emiProcessingFee: selectedOffer.processingFee,
                emiPlanId: selectedOffer.planId
            });
            onHide();
        }
    };

    const handlePayFull = () => {
        onSelect({ emi: false });
        onHide();
    };

    if (amount < 3000) {
        return (
            <Modal show={show} onHide={onHide} centered>
                <Modal.Header closeButton>
                    <Modal.Title><CreditCard className="me-2" size={20} /> EMI Options</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Alert variant="info">
                        EMI is available for transactions of ₹3,000 or more.
                        Current amount: {formatCurrency(amount)}
                    </Alert>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={handlePayFull}>
                        Pay Full Amount
                    </Button>
                </Modal.Footer>
            </Modal>
        );
    }

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton className="bg-gradient text-white" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <Modal.Title>
                    <CreditCard className="me-2" size={24} />
                    EMI Options for {formatCurrency(amount)}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form.Group className="mb-3">
                    <Form.Label>Card Number (first 6 digits for bank-specific offers)</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Enter first 6 digits of card"
                        value={cardBin}
                        onChange={(e) => setCardBin(e.target.value.replace(/\D/g, '').substring(0, 6))}
                        maxLength={6}
                    />
                </Form.Group>

                {loading ? (
                    <div className="text-center py-4">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-2">Loading EMI offers...</p>
                    </div>
                ) : error ? (
                    <Alert variant="warning">{error}</Alert>
                ) : offers.length === 0 ? (
                    <Alert variant="info">No EMI offers available for this amount.</Alert>
                ) : (
                    <Table hover responsive className="mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th>Bank</th>
                                <th className="text-center"><Calendar size={14} /> Tenure</th>
                                <th className="text-center"><Percent size={14} /> Interest</th>
                                <th className="text-end"><IndianRupee size={14} /> EMI/Month</th>
                                <th className="text-end">Processing Fee</th>
                                <th className="text-center">Select</th>
                            </tr>
                        </thead>
                        <tbody>
                            {offers.map((offer, idx) => (
                                <tr
                                    key={idx}
                                    className={selectedOffer === offer ? 'table-primary' : ''}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => setSelectedOffer(offer)}
                                >
                                    <td>
                                        <strong>{offer.bank}</strong>
                                        {offer.interestRate === 0 && (
                                            <Badge bg="success" className="ms-2">No Cost</Badge>
                                        )}
                                    </td>
                                    <td className="text-center">{offer.tenure} months</td>
                                    <td className="text-center">
                                        {offer.interestRate === 0 ? (
                                            <span className="text-success fw-bold">0%</span>
                                        ) : (
                                            `${offer.interestRate}%`
                                        )}
                                    </td>
                                    <td className="text-end fw-bold">{formatCurrency(offer.emiAmount)}</td>
                                    <td className="text-end">
                                        {offer.processingFee > 0 ? formatCurrency(offer.processingFee) : 'Free'}
                                    </td>
                                    <td className="text-center">
                                        <Form.Check
                                            type="radio"
                                            name="emiOffer"
                                            checked={selectedOffer === offer}
                                            onChange={() => setSelectedOffer(offer)}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}

                {selectedOffer && (
                    <Alert variant="success" className="mt-3 mb-0">
                        <strong>Selected:</strong> {selectedOffer.bank} - {selectedOffer.tenure} months @ {formatCurrency(selectedOffer.emiAmount)}/month
                        {selectedOffer.interestRate === 0 && ' (No Cost EMI)'}
                    </Alert>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="outline-secondary" onClick={handlePayFull}>
                    Pay Full Amount
                </Button>
                <Button
                    variant="primary"
                    onClick={handleConfirm}
                    disabled={!selectedOffer}
                >
                    <Check size={16} className="me-1" />
                    Confirm EMI
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default EMISelectionModal;
