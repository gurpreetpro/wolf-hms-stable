import React, { useMemo } from 'react';
import { Modal, Button, Table, Row, Col, Badge } from 'react-bootstrap';
import { Printer, X, Receipt } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { HospitalPrintHeader, HospitalPrintFooter } from './print';
import useHospitalProfile from '../hooks/useHospitalProfile';
import '../styles/print.css';

/**
 * ReceiptPrint - Enhanced Payment Receipt with Configurable GST
 * 
 * GST Modes:
 * - 'included': GST is included in the displayed prices (default for many hospitals)
 * - 'excluded': GST is calculated and added on top of base prices
 * - 'exempt': Hospital is GST exempt (healthcare services under certain thresholds)
 * 
 * Props:
 * - data: Receipt data object with items array
 * - gstMode: 'included' | 'excluded' | 'exempt'
 * - gstRate: GST percentage (default 18% for healthcare services, 5% for medicines)
 */
const ReceiptPrint = ({ 
    show, 
    onHide, 
    data,
    gstMode = 'included', // 'included', 'excluded', 'exempt'
    gstRate = 18 // Default GST rate percentage
}) => {
    const { hospitalProfile, getFormattedAddress } = useHospitalProfile();

    // Calculate totals based on GST mode
    const calculations = useMemo(() => {
        if (!data) return null;

        // Support both single amount and multiple items
        // Use configurable default from hospital settings
        const defaultAmount = parseFloat(hospitalProfile?.default_consultation_fee) || 0;
        const items = data.items || [{ 
            description: data.description || 'OPD Consultation', 
            amount: parseFloat(data.amount) || defaultAmount,
            hsn_code: data.hsn_code || '9993',
            quantity: 1
        }];

        let subtotal = 0;
        let totalGst = 0;
        let grandTotal = 0;

        const processedItems = items.map(item => {
            const baseAmount = parseFloat(item.amount) || 0;
            const quantity = parseInt(item.quantity) || 1;
            const itemTotal = baseAmount * quantity;
            const itemGstRate = item.gst_rate !== undefined ? item.gst_rate : gstRate;

            let itemGst = 0;
            let displayAmount = itemTotal;
            let cgst = 0;
            let sgst = 0;

            if (gstMode === 'excluded') {
                // GST is calculated on top
                itemGst = (itemTotal * itemGstRate) / 100;
                cgst = itemGst / 2;
                sgst = itemGst / 2;
                displayAmount = itemTotal;
            } else if (gstMode === 'included') {
                // Price includes GST, we need to extract it
                // Formula: Base = Total / (1 + GST/100)
                const baseWithoutGst = itemTotal / (1 + itemGstRate / 100);
                itemGst = itemTotal - baseWithoutGst;
                cgst = itemGst / 2;
                sgst = itemGst / 2;
                displayAmount = itemTotal; // Show the full amount
            }
            // 'exempt' mode: no GST calculations

            subtotal += itemTotal;
            totalGst += (gstMode !== 'exempt') ? itemGst : 0;

            return {
                ...item,
                quantity,
                displayAmount,
                itemGst,
                cgst,
                sgst,
                itemGstRate
            };
        });

        if (gstMode === 'excluded') {
            grandTotal = subtotal + totalGst;
        } else {
            grandTotal = subtotal; // For 'included' or 'exempt', total is already the final amount
        }

        return {
            items: processedItems,
            subtotal,
            totalGst,
            cgst: totalGst / 2,
            sgst: totalGst / 2,
            grandTotal
        };
    }, [data, gstMode, gstRate, hospitalProfile?.default_consultation_fee]);

    if (!data || !calculations) return null;

    const handlePrint = () => window.print();

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount);
    };

    // Number to words for amount
    const numberToWords = (num) => {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
            'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        if (num === 0) return 'Zero';
        if (num < 20) return ones[num];
        if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
        if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
        if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
        if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
        return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '');
    };

    const receiptNumber = data.receipt_number || data.invoice_id || `RCP-${Date.now().toString().slice(-8)}`;

    const qrData = JSON.stringify({
        type: 'payment_receipt',
        receiptNo: receiptNumber,
        amount: calculations.grandTotal,
        date: new Date().toISOString(),
        hospital: hospitalProfile?.name
    });

    const getGstBadge = () => {
        switch (gstMode) {
            case 'included':
                return <Badge bg="info">GST Inclusive</Badge>;
            case 'excluded':
                return <Badge bg="warning" text="dark">GST Exclusive</Badge>;
            case 'exempt':
                return <Badge bg="secondary">GST Exempt</Badge>;
            default:
                return null;
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered className="receipt-modal print-modal">
            <Modal.Header closeButton className="bg-success text-white border-0 no-print">
                <Modal.Title className="d-flex align-items-center">
                    <Receipt size={24} className="me-2" />
                    Payment Receipt
                    <span className="ms-3">{getGstBadge()}</span>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                {/* Printable Content */}
                <div className="receipt-content p-4" id="receipt-print-area">
                    <HospitalPrintHeader title="PAYMENT RECEIPT" />

                    {/* Receipt Header Info */}
                    <Row className="mb-4">
                        <Col md={6}>
                            <div className="p-2 bg-light rounded">
                                <strong>Patient Details</strong>
                                <Table size="sm" borderless className="mb-0 mt-2">
                                    <tbody>
                                        <tr>
                                            <td width="40%">Name:</td>
                                            <td><strong>{data.patient_name}</strong></td>
                                        </tr>
                                        <tr>
                                            <td>Patient ID:</td>
                                            <td>{data.patient_id}</td>
                                        </tr>
                                        {data.phone && (
                                            <tr>
                                                <td>Phone:</td>
                                                <td>{data.phone}</td>
                                            </tr>
                                        )}
                                        {data.token_number && (
                                            <tr>
                                                <td>Token No:</td>
                                                <td>#{data.token_number}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                        </Col>
                        <Col md={6}>
                            <div className="p-2 bg-light rounded text-end">
                                <strong>Receipt Details</strong>
                                <Table size="sm" borderless className="mb-0 mt-2">
                                    <tbody>
                                        <tr>
                                            <td>Receipt No:</td>
                                            <td className="text-end"><strong>{receiptNumber}</strong></td>
                                        </tr>
                                        <tr>
                                            <td>Date:</td>
                                            <td className="text-end">{new Date().toLocaleDateString('en-IN')}</td>
                                        </tr>
                                        <tr>
                                            <td>Time:</td>
                                            <td className="text-end">{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                                        </tr>
                                        {data.payment_mode && (
                                            <tr>
                                                <td>Payment Mode:</td>
                                                <td className="text-end"><Badge bg="primary">{data.payment_mode}</Badge></td>
                                            </tr>
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                        </Col>
                    </Row>

                    {/* GST Number if applicable */}
                    {hospitalProfile?.gst_number && gstMode !== 'exempt' && (
                        <div className="mb-3 text-center">
                            <small className="text-muted">
                                <strong>GSTIN:</strong> {hospitalProfile.gst_number}
                            </small>
                        </div>
                    )}

                    {/* Items Table */}
                    <Table bordered hover size="sm" className="mb-3">
                        <thead className="table-light">
                            <tr>
                                <th width="5%">#</th>
                                <th width="35%">Description</th>
                                <th width="10%" className="text-center">HSN/SAC</th>
                                <th width="8%" className="text-center">Qty</th>
                                <th width="12%" className="text-end">Rate</th>
                                {gstMode !== 'exempt' && (
                                    <th width="10%" className="text-center">GST %</th>
                                )}
                                <th width="15%" className="text-end">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {calculations.items.map((item, index) => (
                                <tr key={index}>
                                    <td>{index + 1}</td>
                                    <td>{item.description}</td>
                                    <td className="text-center">
                                        <small>{item.hsn_code || '9993'}</small>
                                    </td>
                                    <td className="text-center">{item.quantity}</td>
                                    <td className="text-end">{formatCurrency(item.amount)}</td>
                                    {gstMode !== 'exempt' && (
                                        <td className="text-center">{item.itemGstRate}%</td>
                                    )}
                                    <td className="text-end">{formatCurrency(item.displayAmount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>

                    {/* Totals Section */}
                    <Row>
                        <Col md={6}>
                            {/* Amount in Words */}
                            <div className="p-2 bg-light rounded">
                                <small className="text-muted">Amount in Words:</small>
                                <div className="fw-bold">
                                    Rupees {numberToWords(Math.floor(calculations.grandTotal))} Only
                                </div>
                            </div>
                        </Col>
                        <Col md={6}>
                            <Table size="sm" borderless className="mb-0">
                                <tbody>
                                    <tr>
                                        <td className="text-end">Subtotal:</td>
                                        <td className="text-end" width="40%">{formatCurrency(calculations.subtotal)}</td>
                                    </tr>
                                    {gstMode !== 'exempt' && (
                                        <>
                                            {gstMode === 'excluded' && (
                                                <>
                                                    <tr>
                                                        <td className="text-end">CGST ({gstRate / 2}%):</td>
                                                        <td className="text-end">{formatCurrency(calculations.cgst)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="text-end">SGST ({gstRate / 2}%):</td>
                                                        <td className="text-end">{formatCurrency(calculations.sgst)}</td>
                                                    </tr>
                                                </>
                                            )}
                                            {gstMode === 'included' && calculations.totalGst > 0 && (
                                                <tr>
                                                    <td className="text-end text-muted">
                                                        <small>(Incl. GST @{gstRate}%: {formatCurrency(calculations.totalGst)})</small>
                                                    </td>
                                                    <td></td>
                                                </tr>
                                            )}
                                        </>
                                    )}
                                    <tr className="border-top">
                                        <td className="text-end fw-bold fs-5">Grand Total:</td>
                                        <td className="text-end fw-bold fs-5">{formatCurrency(calculations.grandTotal)}</td>
                                    </tr>
                                </tbody>
                            </Table>
                        </Col>
                    </Row>

                    {/* Transaction Info (if available) */}
                    {data.transaction_id && (
                        <div className="mt-3 p-2 border rounded text-center">
                            <small className="text-muted">
                                Transaction ID: <strong>{data.transaction_id}</strong>
                            </small>
                        </div>
                    )}

                    {/* Signatures */}
                    <Row className="mt-5 pt-4">
                        <Col xs={4} className="text-center">
                            <div className="border-top pt-2 mx-3">
                                <strong>Patient/Attendant</strong><br />
                                <small className="text-muted">Signature</small>
                            </div>
                        </Col>
                        <Col xs={4} className="text-center">
                            <QRCodeSVG value={qrData} size={70} />
                            <br />
                            <small className="text-muted">Scan to Verify</small>
                        </Col>
                        <Col xs={4} className="text-center">
                            <div className="border-top pt-2 mx-3">
                                <strong>Cashier</strong><br />
                                <small className="text-muted">Signature & Stamp</small>
                            </div>
                        </Col>
                    </Row>

                    <HospitalPrintFooter 
                        showTimestamp={true}
                        disclaimer={gstMode === 'exempt' 
                            ? "Healthcare services are exempt from GST under certain conditions. This is a computer-generated receipt."
                            : "This is a computer-generated receipt. No signature is required for amounts below ₹5,000."
                        }
                        showPageNumber={false}
                    />
                </div>
            </Modal.Body>
            <Modal.Footer className="bg-light no-print">
                <Button variant="outline-secondary" onClick={onHide}>
                    <X size={16} className="me-1" /> Close
                </Button>
                <Button variant="success" onClick={handlePrint}>
                    <Printer size={16} className="me-2" />
                    Print Receipt
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default ReceiptPrint;
