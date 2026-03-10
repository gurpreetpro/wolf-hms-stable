import React, { useMemo } from 'react';
import { Modal, Button, Row, Col, Table, Badge } from 'react-bootstrap';
import { Printer, X, Download, Store } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import useHospitalProfile from '../hooks/useHospitalProfile';
import '../styles/print.css';

const PharmacyReceiptPrint = ({ show, onHide, transaction }) => {
    const { hospitalProfile, getFormattedAddress, getContactString } = useHospitalProfile();

    const receiptData = useMemo(() => {
        if (!transaction) return null;
        const now = new Date();
        return {
            date: transaction.dispense_date ? new Date(transaction.dispense_date) : now,
            receiptNo: `PHARM-${transaction.id || Math.floor(now.getTime() / 1000)}`,
            items: [{
                name: transaction.medication || transaction.item_name || 'Medication',
                qty: transaction.quantity || 1,
                price: parseFloat(transaction.price_per_unit || 0),
                total: parseFloat(transaction.total_amount || (transaction.quantity * transaction.price_per_unit) || 0)
            }],
            patient: {
                name: transaction.patient_name || 'Walk-in Customer',
                phone: transaction.patient_phone || '',
                id: transaction.patient_id
            },
            doctor: transaction.doctor_name
        };
    }, [transaction]);

    if (!transaction || !receiptData) return null;

    const totalAmount = receiptData.items.reduce((sum, item) => sum + item.total, 0);

    const qrData = JSON.stringify({
        receipt: receiptData.receiptNo,
        amount: totalAmount,
        date: receiptData.date.toISOString(),
        hospital: hospitalProfile?.name
    });

    return (
        <Modal show={show} onHide={onHide} size="md" centered className="pharmacy-receipt-modal">
            <Modal.Header closeButton className="bg-primary text-white border-0 no-print">
                <Modal.Title className="d-flex align-items-center">
                    <Printer size={20} className="me-2" />
                    Pharmacy Receipt
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                <div className="receipt-content p-4" id="pharmacy-print-area">
                    {/* Compact Header for Thermal/Small Receipts */}
                    <div className="text-center border-bottom pb-3 mb-3">
                        <div className="d-flex align-items-center justify-content-center mb-2">
                             {hospitalProfile?.logo_url ? (
                                <img src={hospitalProfile.logo_url} alt="Logo" style={{ maxHeight: '40px' }} className="me-2" />
                            ) : (
                                <Store size={24} className="text-primary me-2" />
                            )}
                            <h4 className="fw-bold text-primary mb-0">{hospitalProfile?.name || 'Pharmacy'}</h4>
                        </div>
                        <p className="text-muted small mb-0">{getFormattedAddress()}</p>
                        <p className="text-muted small mb-0">{getContactString()}</p>
                        {hospitalProfile?.gstin && <small className="text-muted d-block">GSTIN: {hospitalProfile.gstin}</small>}
                    </div>

                    {/* Receipt Details */}
                    <div className="d-flex justify-content-between align-items-start mb-3 small">
                        <div>
                            <div><strong>Receipt No:</strong> {receiptData.receiptNo}</div>
                            <div><strong>Date:</strong> {receiptData.date.toLocaleString()}</div>
                            {receiptData.doctor && <div><strong>Dr:</strong> {receiptData.doctor}</div>}
                        </div>
                        <div className="text-end">
                             <div><strong>Patient:</strong> {receiptData.patient.name}</div>
                             {receiptData.patient.id && <div>ID: {receiptData.patient.id}</div>}
                        </div>
                    </div>

                    {/* Items Table */}
                    <Table size="sm" borderless className="mb-3 border-top border-bottom">
                        <thead>
                            <tr className="border-bottom">
                                <th>Item</th>
                                <th className="text-center">Qty</th>
                                <th className="text-end">Price</th>
                                <th className="text-end">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {receiptData.items.map((item, idx) => (
                                <tr key={idx}>
                                    <td>
                                        <div className="fw-bold">{item.name}</div>
                                    </td>
                                    <td className="text-center">{item.qty}</td>
                                    <td className="text-end">{item.price.toFixed(2)}</td>
                                    <td className="text-end fw-bold">{item.total.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="border-top">
                            <tr>
                                <td colSpan="3" className="text-end fw-bold">Grand Total:</td>
                                <td className="text-end fw-bold fs-5">₹{totalAmount.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </Table>

                    {/* Footer with QR */}
                    <div className="text-center mt-4">
                        <div className="d-inline-block bg-white p-2 rounded border mb-2">
                            <QRCodeSVG value={qrData} size={64} level="L" />
                        </div>
                        <p className="small text-muted mb-0">
                            Thank you regarding your health!<br/>
                            Non-returnable if seal broken.
                        </p>
                    </div>
                </div>
            </Modal.Body>
            <Modal.Footer className="bg-light no-print">
                <Button variant="outline-secondary" size="sm" onClick={onHide}>Close</Button>
                <Button variant="primary" size="sm" onClick={() => window.print()}>
                    <Printer size={16} className="me-1" /> Print
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default PharmacyReceiptPrint;
