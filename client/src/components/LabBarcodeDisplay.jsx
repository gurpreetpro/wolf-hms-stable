import React, { useState } from 'react';
import { Card, Button, Badge, Spinner } from 'react-bootstrap';
import { Copy, Printer, QrCode, Check } from 'lucide-react';

/**
 * LabBarcodeDisplay - Shows barcode/QR for lab sample
 * 
 * @param {string} barcode - The barcode string (e.g., 'LAB00000123')
 * @param {string} patientName - Patient name for label
 * @param {string} testName - Test name for label
 * @param {function} onPrint - Callback for print action
 */
const LabBarcodeDisplay = ({ barcode, patientName, testName, onPrint }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(barcode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePrint = () => {
        // Create print-friendly content
        const printContent = `
            <html>
            <head>
                <title>Lab Sample Label</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 10mm; }
                    .label { border: 2px solid #000; padding: 5mm; width: 50mm; }
                    .barcode { font-family: 'Libre Barcode 39', monospace; font-size: 48px; text-align: center; }
                    .barcode-text { font-size: 14px; text-align: center; font-weight: bold; letter-spacing: 2px; }
                    .info { font-size: 10px; margin-top: 2mm; }
                </style>
            </head>
            <body>
                <div class="label">
                    <div class="barcode">*${barcode}*</div>
                    <div class="barcode-text">${barcode}</div>
                    <div class="info">
                        <strong>${patientName || 'Patient'}</strong><br/>
                        ${testName || 'Lab Test'}<br/>
                        ${new Date().toLocaleDateString()}
                    </div>
                </div>
                <script>window.print(); window.close();</script>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();

        if (onPrint) onPrint();
    };

    if (!barcode) {
        return (
            <Badge bg="secondary" className="d-inline-flex align-items-center gap-1">
                <Spinner size="sm" animation="border" /> Generating...
            </Badge>
        );
    }

    return (
        <Card className="border-0 bg-light p-2" style={{ display: 'inline-block' }}>
            <div className="d-flex align-items-center gap-2">
                <QrCode size={20} className="text-primary" />
                <code className="bg-white px-2 py-1 rounded border" style={{ letterSpacing: '2px', fontWeight: 'bold' }}>
                    {barcode}
                </code>
                <Button
                    size="sm"
                    variant={copied ? 'success' : 'outline-secondary'}
                    onClick={handleCopy}
                    title="Copy barcode"
                >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                </Button>
                <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={handlePrint}
                    title="Print label"
                >
                    <Printer size={14} />
                </Button>
            </div>
        </Card>
    );
};

export default LabBarcodeDisplay;
