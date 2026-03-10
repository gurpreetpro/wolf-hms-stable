import React, { useState, useEffect } from 'react';
import { Modal, Button, Table, Badge, Spinner, Alert, Card } from 'react-bootstrap';
import { formatCurrency } from '../../utils/currency';
import api from '../../utils/axiosInstance';
import { FileText, CreditCard, ArrowRight, Wallet, Receipt, IndianRupee } from 'lucide-react';

const PatientLedger = ({ show, onHide, patient, onPayInvoice }) => {
    const [ledger, setLedger] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Quick Pay State
    const [quickPayAmount, setQuickPayAmount] = useState('');
    const [processingPay, setProcessingPay] = useState(false);

    useEffect(() => {
        if (show && patient?.patient_id) {
            setQuickPayAmount(patient.current_balance || ''); // Default to full amount
            fetchLedger();
        }
    }, [show, patient]);

    const fetchLedger = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/api/finance/ledger/${patient.patient_id}`);
            setLedger(res.data?.data || []);
        } catch (err) {
            console.error("Failed to fetch ledger", err);
            setError("Could not load financial history.");
        } finally {
            setLoading(false);
        }
    };
    
    const handleQuickPay = async () => {
        if (!quickPayAmount || parseFloat(quickPayAmount) <= 0) return;
        
        // Show confirmation with payment method options
        const paymentMethods = ['Cash', 'Card', 'UPI', 'Net Banking', 'Cheque'];
        const selectedMethod = await new Promise((resolve) => {
            // Create a simple modal-like prompt
            const modal = document.createElement('div');
            modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999';
            modal.innerHTML = `
                <div style="background:white;padding:24px;border-radius:12px;min-width:350px;max-width:90vw">
                    <h5 style="margin-bottom:16px;color:#198754">💳 Confirm Payment</h5>
                    <div style="margin-bottom:16px">
                        <strong>Amount:</strong> ₹${parseFloat(quickPayAmount).toLocaleString('en-IN')}
                    </div>
                    <div style="margin-bottom:16px">
                        <label style="display:block;margin-bottom:8px;font-weight:500">Payment Method:</label>
                        <select id="payMethod" style="width:100%;padding:8px;border:1px solid #dee2e6;border-radius:6px">
                            ${paymentMethods.map(m => `<option value="${m}">${m}</option>`).join('')}
                        </select>
                    </div>
                    <div style="margin-bottom:16px">
                        <label style="display:block;margin-bottom:8px;font-weight:500">Reference Number (optional):</label>
                        <input id="payRef" type="text" placeholder="Transaction ID / Cheque No" style="width:100%;padding:8px;border:1px solid #dee2e6;border-radius:6px"/>
                    </div>
                    <div style="display:flex;gap:12px;justify-content:flex-end">
                        <button id="cancelPay" style="padding:8px 16px;border:1px solid #dee2e6;background:white;border-radius:6px;cursor:pointer">Cancel</button>
                        <button id="confirmPay" style="padding:8px 16px;border:none;background:#198754;color:white;border-radius:6px;cursor:pointer">Confirm Payment</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            modal.querySelector('#cancelPay').onclick = () => { document.body.removeChild(modal); resolve(null); };
            modal.querySelector('#confirmPay').onclick = () => {
                const method = modal.querySelector('#payMethod').value;
                const ref = modal.querySelector('#payRef').value;
                document.body.removeChild(modal);
                resolve({ method, ref });
            };
        });
        
        if (!selectedMethod) return; // User cancelled
        
        setProcessingPay(true);
        try {
            await api.post('/api/finance/payment/patient', {
                patient_id: patient.patient_id,
                amount: parseFloat(quickPayAmount),
                payment_mode: selectedMethod.method,
                reference_number: selectedMethod.ref,
                notes: 'Smart FIFO Payment'
            });
            alert('Payment Successful!');
            setQuickPayAmount('');
            fetchLedger(); // Refresh timeline
            // Also need to refresh parent component? 
            // We can add an 'onRefresh' prop but for now locally updating is good feedback.
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || 'Payment failed');
        } finally {
            setProcessingPay(false);
        }
    };

    const getStatusVariant = (status) => {
        switch (status) {
            case 'Paid': return 'success';
            case 'Pending': return 'warning';
            case 'Partial': return 'info';
            case 'Overdue': return 'danger';
            case 'Success': return 'success';
            case 'Applied': return 'primary'; // For Adjustments
            default: return 'secondary';
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered scrollable>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title>
                    <Wallet size={20} className="me-2 text-primary" />
                    Financial Profile: <span className="fw-bold">{patient?.patient_name}</span>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                {/* Patient Summary Header */}
                <div className="bg-primary bg-opacity-10 p-4 border-bottom">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <div className="text-muted small text-uppercase fw-bold">Current Balance Due</div>
                            <div className="display-6 fw-bold text-danger">
                                {formatCurrency(patient?.current_balance || 0)}
                            </div>
                            <div className="text-muted small mt-1">
                                UHID: <span className="fw-bold text-dark">{patient?.patient_uhid || 'N/A'}</span> • 
                                Phone: <span className="fw-bold text-dark">{patient?.patient_phone || 'N/A'}</span>
                            </div>
                        </div>
                        <div className="text-end">
                             <div className="mb-2">
                                <Badge bg="white" text="dark" className="border">
                                    Total Billed: {formatCurrency(patient?.total_billed || 0)}
                                </Badge>
                             </div>
                             <div>
                                <Badge bg="success">
                                    Total Paid: {formatCurrency(patient?.total_paid || 0)}
                                </Badge>
                             </div>
                        </div>
                    </div>

                    {/* Quick Pay Section */}
                     {patient?.current_balance > 0 && (
                        <Card className="border-success bg-white shadow-sm">
                            <Card.Body className="p-3">
                                <h6 className="fw-bold text-success mb-2"><IndianRupee size={16}/> Quick Pay (FIFO)</h6>
                                <p className="small text-muted mb-2">
                                    Pay a lump sum to automatically clear oldest invoices first.
                                </p>
                                <div className="d-flex gap-2">
                                    <div className="flex-grow-1">
                                        <div className="input-group input-group-sm">
                                            <span className="input-group-text">₹</span>
                                            <input 
                                                type="number" 
                                                className="form-control" 
                                                value={quickPayAmount}
                                                onChange={(e) => setQuickPayAmount(e.target.value)}
                                                placeholder="Enter amount" 
                                            />
                                        </div>
                                    </div>
                                    <Button 
                                        variant="success" 
                                        size="sm"
                                        disabled={processingPay || !quickPayAmount}
                                        onClick={handleQuickPay}
                                    >
                                        {processingPay ? <Spinner size="sm" /> : 'Pay Now'}
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    )}
                </div>

                {/* Ledger Timeline */}
                <div className="p-3">
                    <h6 className="fw-bold text-muted mb-3">Transaction History</h6>
                    
                    {error && <Alert variant="danger">{error}</Alert>}
                    
                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                        </div>
                    ) : ledger.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <Receipt size={48} className="mb-3 opacity-50" />
                            <p>No financial history found for this patient.</p>
                        </div>
                    ) : (
                        <Table hover responsive className="align-middle">
                            <thead className="bg-light small text-muted">
                                <tr>
                                    <th>Date</th>
                                    <th>Ref ID</th>
                                    <th>Description</th>
                                    <th className="text-end">Amount</th>
                                    <th className="text-end">Balance</th>
                                    <th className="text-center">Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ledger.map((item, idx) => (
                                    <tr key={`${item.type}-${item.reference_id}-${idx}`} className={
                                        item.type === 'PAYMENT' ? 'table-success bg-opacity-10' : 
                                        item.type === 'ADJUSTMENT' ? 'table-info bg-opacity-10' : ''
                                    }>
                                        <td className="small text-muted" style={{ minWidth: '100px' }}>
                                            {new Date(item.date).toLocaleDateString()}
                                            <div style={{ fontSize: '10px' }}>{new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </td>
                                        <td>
                                            <Badge bg="light" text="dark" className="border fw-normal">
                                                {item.type === 'INVOICE' ? 'INV' : 'RCT'}-{item.reference_id}
                                            </Badge>
                                        </td>
                                        <td>
                                            <div className="d-flex align-items-center">
                                                {item.type === 'INVOICE' ? 
                                                    <FileText size={16} className="text-primary me-2" /> : 
                                                 item.type === 'PAYMENT' ?
                                                    <CreditCard size={16} className="text-success me-2" /> :
                                                    <Info size={16} className="text-info me-2" />
                                                }
                                                <div>
                                                    <div className="fw-bold text-dark">{item.description}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className={`text-end fw-bold ${item.type === 'PAYMENT' ? 'text-success' : 'text-dark'}`}>
                                            {formatCurrency(Math.abs(item.amount))}
                                        </td>
                                        <td className="text-end text-muted small">
                                            {item.type === 'INVOICE' && parseFloat(item.balance) > 0 ? (
                                                <span className="text-danger fw-bold">{formatCurrency(item.balance)}</span>
                                            ) : '-'}
                                        </td>
                                        <td className="text-center">
                                            <Badge bg={getStatusVariant(item.status)} pill>
                                                {item.status}
                                            </Badge>
                                        </td>
                                        <td>
                                            {item.type === 'INVOICE' && item.status !== 'Paid' && (
                                                <Button 
                                                    size="sm" 
                                                    variant="outline-success" 
                                                    className="py-0 px-2 small"
                                                    onClick={() => {
                                                        onHide(); // Close ledger mostly to focus on payment? Or keep open?
                                                        // Actually better to keep ledger open but overlay payment modal.
                                                        // But parent handles payment modal. Let's just pass event.
                                                        onPayInvoice({
                                                            id: item.reference_id,
                                                            patient_name: patient.patient_name,
                                                            total_amount: item.amount, // Or balance? The API expects total_amount usually for display
                                                            // We need to fetch full invoice details for the payment modal usually
                                                            // But handlePayClick in dashboard does that.
                                                            ...item
                                                        });
                                                    }}
                                                >
                                                    Pay <ArrowRight size={12} />
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Close</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default PatientLedger;
