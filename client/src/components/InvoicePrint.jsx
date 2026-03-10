import React, { useMemo } from 'react';
import { Modal, Button, Row, Col, Table, Badge } from 'react-bootstrap';
import { Printer, X, FileText, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { HospitalPrintHeader, HospitalPrintFooter } from './print';
import useHospitalProfile from '../hooks/useHospitalProfile';
import '../styles/print.css';

// Generate invoice number helper
const generateInvoiceNumber = (patientId) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const unique = patientId ? String(patientId).slice(-4).padStart(4, '0') : String(now.getTime()).slice(-4);
    return `INV-${year}${month}${day}-${unique}`;
};

// Helper function to convert number to words
const numberToWords = (num) => {
    if (num === 0) return 'Zero';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const convert = (n) => {
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
        if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
        if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
        return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    };
    return convert(num);
};

// Helper to safely convert to number
const toNum = (val) => parseFloat(val) || 0;

const InvoicePrint = ({ show, onHide, patient, admission, invoiceItems = [], invoiceNumber, paymentStatus = 'pending' }) => {
    // Need hospitalProfile for QR data and footer
    const { hospitalProfile } = useHospitalProfile();

    const generatedInvoiceNumber = useMemo(() => {
        if (invoiceNumber) return invoiceNumber;
        return generateInvoiceNumber(patient?.id || patient?.patient_number);
    }, [invoiceNumber, patient?.id, patient?.patient_number]);

    const currentDate = new Date();

    // Calculate subtotal using safe number conversion
    const subtotal = invoiceItems.length > 0
        ? invoiceItems.reduce((sum, item) => {
            const qty = toNum(item.quantity) || 1;
            const price = toNum(item.unit_price);
            return sum + (qty * price);
        }, 0)
        : 0; // No hardcoded fallback - show 0 if no items
    const grandTotal = subtotal * 1.18;

    const qrData = useMemo(() => JSON.stringify({
        invoiceNo: generatedInvoiceNumber,
        patientId: patient?.patient_number || patient?.id || 'N/A',
        amount: grandTotal.toFixed(2),
        hospital: hospitalProfile?.name || 'Hospital'
    }), [generatedInvoiceNumber, patient, grandTotal, hospitalProfile]);

    const handlePrint = () => window.print();

    const getStatusBadge = () => {
        const status = (paymentStatus || '').toLowerCase();
        if (status === 'paid') return <Badge bg="success" className="fs-6 px-3 py-2">✓ PAID</Badge>;
        if (status === 'partial') return <Badge bg="warning" className="fs-6 px-3 py-2">PARTIAL</Badge>;
        return <Badge bg="danger" className="fs-6 px-3 py-2">UNPAID</Badge>;
    };

    if (!patient) return null;

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton className="bg-primary text-white border-0">
                <Modal.Title><FileText size={24} className="me-2" />Invoice / Bill</Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                <div className="invoice-content p-4">
                    {/* Standardized Hospital Header */}
                    <HospitalPrintHeader title="" showContact={true} />
                    {hospitalProfile?.gstin && <p className="text-muted small text-center mb-3">GSTIN: {hospitalProfile.gstin}</p>}

                    <Row className="mb-4">
                        <Col md={8}>
                            <h4 className="fw-bold text-uppercase mb-3" style={{ letterSpacing: '3px' }}>TAX INVOICE</h4>
                            <Row>
                                <Col xs={6}>
                                    <small className="text-muted d-block">Invoice Number</small>
                                    <strong className="text-primary fs-5">{generatedInvoiceNumber}</strong>
                                </Col>
                                <Col xs={6}>
                                    <small className="text-muted d-block">Invoice Date</small>
                                    <strong>{currentDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                                </Col>
                            </Row>
                        </Col>
                        <Col md={4} className="text-end">{getStatusBadge()}</Col>
                    </Row>

                    <Row className="mb-4">
                        <Col md={6}>
                            <div className="border rounded p-3 h-100">
                                <h6 className="text-muted border-bottom pb-2 mb-2">Bill To</h6>
                                <p className="fw-bold mb-1">{patient.name || patient.full_name || patient.patient_name}</p>
                                <p className="text-muted small mb-1">Patient ID: {patient.patient_number || patient.id || 'N/A'}</p>
                                <p className="text-muted small mb-0">Phone: {patient.phone || 'N/A'}</p>
                            </div>
                        </Col>
                        <Col md={6}>
                            <div className="border rounded p-3 h-100">
                                <h6 className="text-muted border-bottom pb-2 mb-2">Visit Details</h6>
                                {admission ? (
                                    <>
                                        <p className="small mb-1"><span className="text-muted">Ward:</span> {admission.ward || 'General'}</p>
                                        <p className="small mb-0"><span className="text-muted">Bed:</span> {admission.bed_number || '—'}</p>
                                    </>
                                ) : (
                                    <p className="text-muted small mb-0">OPD Visit</p>
                                )}
                            </div>
                        </Col>
                    </Row>

                    <Table bordered hover responsive className="mb-4">
                        <thead className="table-dark">
                            <tr>
                                <th>#</th>
                                <th>Description</th>
                                <th className="text-center">HSN/SAC</th>
                                <th className="text-center">Qty</th>
                                <th className="text-end">Rate (₹)</th>
                                <th className="text-end">Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoiceItems.length > 0 ? invoiceItems.map((item, idx) => {
                                const qty = toNum(item.quantity) || 1;
                                const price = toNum(item.unit_price);
                                return (
                                    <tr key={idx}>
                                        <td>{idx + 1}</td>
                                        <td>{item.description || item.name}</td>
                                        <td className="text-center text-muted small">{item.hsn_code || '9993'}</td>
                                        <td className="text-center">{qty}</td>
                                        <td className="text-end">{price.toFixed(2)}</td>
                                        <td className="text-end fw-bold">{(qty * price).toFixed(2)}</td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="6" className="text-center text-muted py-3">
                                        <em>No invoice items to display</em>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </Table>

                    <Row>
                        <Col md={6}>
                            <div className="d-flex align-items-center mb-3">
                                <div className="bg-white p-2 rounded border me-3">
                                    <QRCodeSVG value={qrData} size={100} level="H" />
                                </div>
                                <div>
                                    <small className="text-muted d-block">Scan to verify</small>
                                    <small className="text-muted">{generatedInvoiceNumber}</small>
                                </div>
                            </div>
                            
                            {/* Bank Details - From Hospital Settings */}
                            {hospitalProfile?.bank_name && (
                                <div className="small text-muted border-top pt-2 mt-2">
                                    <strong>Bank Details:</strong><br/>
                                    Bank: {hospitalProfile.bank_name}{hospitalProfile.bank_branch ? ` (${hospitalProfile.bank_branch})` : ''}<br/>
                                    A/C: {hospitalProfile.bank_account || '—'}<br/>
                                    IFSC: {hospitalProfile.bank_ifsc || '—'}
                                </div>
                            )}
                        </Col>
                        <Col md={6}>
                            <Table borderless size="sm">
                                <tbody>
                                    <tr><td className="text-muted">Subtotal:</td><td className="text-end">₹ {subtotal.toFixed(2)}</td></tr>
                                    <tr><td className="text-muted">CGST (9%):</td><td className="text-end">₹ {(subtotal * 0.09).toFixed(2)}</td></tr>
                                    <tr><td className="text-muted">SGST (9%):</td><td className="text-end">₹ {(subtotal * 0.09).toFixed(2)}</td></tr>
                                    <tr className="border-top"><td className="fw-bold fs-5">Grand Total:</td><td className="text-end fw-bold fs-5 text-primary">₹ {grandTotal.toFixed(2)}</td></tr>
                                </tbody>
                            </Table>
                            <div className="text-end mt-4">
                                <div style={{ minHeight: '50px' }}></div>
                                <strong className="d-block">__________________________</strong>
                                <small className="text-muted">Authorized Signatory</small>
                            </div>
                        </Col>
                    </Row>

                    <div className="bg-light border rounded p-2 mt-3">
                        <small className="text-muted">Amount in Words: </small>
                        <strong>Rupees {numberToWords(Math.round(grandTotal))} Only</strong>
                    </div>

                    {/* Standardized Footer */}
                    <HospitalPrintFooter 
                        showTimestamp={true}
                        disclaimer={`Thank you for choosing ${hospitalProfile?.name || 'our hospital'} 🙏`}
                    />
                </div>
            </Modal.Body>
            <Modal.Footer className="bg-light">
                <Button variant="outline-secondary" onClick={onHide}><X size={16} className="me-1" />Close</Button>
                <Button variant="outline-primary"><Download size={16} className="me-1" />Download</Button>
                <Button variant="primary" onClick={handlePrint}><Printer size={16} className="me-1" />Print</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default InvoicePrint;
