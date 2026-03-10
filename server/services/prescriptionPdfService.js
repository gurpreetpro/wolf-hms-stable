/**
 * prescriptionPdfService.js
 * 
 * Generates prescription PDFs server-side using pdfkit.
 * Layout mirrors client/src/components/PrescriptionPrint.jsx
 */
const PDFDocument = require('pdfkit');

// Color palette (matches HMS print styles)
const COLORS = {
    primary: '#1a365d',
    primaryLight: '#2b6cb0',
    text: '#333333',
    textMuted: '#666666',
    lightBg: '#f8f9fa',
    border: '#e2e8f0',
    tableBorder: '#dee2e6',
    white: '#ffffff'
};

/**
 * Generate a prescription PDF and return it as a Buffer.
 * 
 * @param {object} data
 * @param {object} data.prescription - { id, diagnosis, medications (array), created_at, notes }
 * @param {object} data.patient - { name, uhid, dob, gender }
 * @param {object} data.doctor - { name, reg_no }
 * @param {object} data.hospital - { name, tagline, address, phone, email, website, logo_url }
 * @param {object} [data.vitals] - { bp, heart_rate, temp, weight, spo2 }
 * @returns {Promise<Buffer>}
 */
async function generatePrescriptionPdf(data) {
    const { prescription, patient, doctor, hospital, vitals } = data;
    const medications = prescription.medications || [];

    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 40, bottom: 40, left: 50, right: 50 }
            });

            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

            // ─── HOSPITAL HEADER ───
            drawHospitalHeader(doc, hospital, pageWidth);

            // ─── TITLE BAR ───
            const titleY = doc.y;
            doc.rect(doc.page.margins.left, titleY, pageWidth, 28)
               .fill(COLORS.lightBg);
            doc.fontSize(11).font('Helvetica-Bold')
               .fillColor(COLORS.text)
               .text('PRESCRIPTION', doc.page.margins.left, titleY + 8, {
                   width: pageWidth, align: 'center'
               });
            doc.y = titleY + 36;

            // ─── PATIENT DETAILS ───
            drawPatientInfo(doc, patient, prescription, pageWidth);

            // ─── VITALS (if available) ───
            if (vitals) {
                drawVitals(doc, vitals, pageWidth);
            }

            // ─── DIAGNOSIS ───
            drawDiagnosis(doc, prescription.diagnosis, pageWidth);

            // ─── MEDICATIONS TABLE ───
            drawMedicationsTable(doc, medications, pageWidth);

            // ─── GENERAL INSTRUCTIONS ───
            drawInstructions(doc, pageWidth);

            // ─── DOCTOR SIGNATURE ───
            drawDoctorSignature(doc, doctor, pageWidth);

            // ─── FOOTER ───
            drawFooter(doc, pageWidth);

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

// ════════════════════════════════════════════════════════════════
// Drawing helpers
// ════════════════════════════════════════════════════════════════

function drawHospitalHeader(doc, hospital, pageWidth) {
    const startY = doc.y;
    
    // Hospital name
    doc.fontSize(18).font('Helvetica-Bold')
       .fillColor(COLORS.primary)
       .text(hospital?.name || 'Hospital', doc.page.margins.left, startY, {
           width: pageWidth, align: 'center'
       });

    // Tagline
    if (hospital?.tagline) {
        doc.fontSize(9).font('Helvetica-Oblique')
           .fillColor(COLORS.textMuted)
           .text(hospital.tagline, { width: pageWidth, align: 'center' });
    }

    // Address
    const addressParts = [];
    if (hospital?.address) addressParts.push(hospital.address);
    if (hospital?.city) addressParts.push(hospital.city);
    if (hospital?.state) addressParts.push(hospital.state);
    if (hospital?.pincode) addressParts.push(hospital.pincode);
    
    if (addressParts.length > 0) {
        doc.fontSize(8).font('Helvetica')
           .fillColor(COLORS.textMuted)
           .text(addressParts.join(', '), { width: pageWidth, align: 'center' });
    }

    // Contact (phone | email | website)
    const contactParts = [];
    if (hospital?.phone) contactParts.push(`Ph: ${hospital.phone}`);
    if (hospital?.email) contactParts.push(hospital.email);
    if (hospital?.website) contactParts.push(hospital.website);
    
    if (contactParts.length > 0) {
        doc.fontSize(8).font('Helvetica')
           .fillColor(COLORS.textMuted)
           .text(contactParts.join('  |  '), { width: pageWidth, align: 'center' });
    }

    doc.y += 5;

    // Divider line
    doc.moveTo(doc.page.margins.left, doc.y)
       .lineTo(doc.page.margins.left + pageWidth, doc.y)
       .strokeColor(COLORS.border)
       .lineWidth(1.5)
       .stroke();
    
    doc.y += 10;
}

function drawPatientInfo(doc, patient, prescription, pageWidth) {
    const startY = doc.y;
    const colWidth = pageWidth / 3;
    const leftX = doc.page.margins.left;

    // Draw border box
    doc.rect(leftX, startY, pageWidth, 65)
       .strokeColor(COLORS.border).lineWidth(0.5).stroke();

    const pad = 8;
    let y = startY + pad;

    // Row 1: Patient Name | Patient ID | Rx No.
    drawLabelValue(doc, 'Patient Name', patient?.name || 'Unknown', leftX + pad, y, colWidth - pad);
    drawLabelValue(doc, 'Patient ID', patient?.uhid || 'N/A', leftX + colWidth + pad, y, colWidth - pad);
    
    // Rx number 
    const rxNumber = `RX-${formatDate(prescription.created_at, 'YYYYMMDD')}-${String(prescription.id).padStart(4, '0')}`;
    drawLabelValue(doc, 'Rx No.', rxNumber, leftX + colWidth * 2 + pad, y, colWidth - pad);

    y += 28;

    // Row 2: Age/Gender | Date | (empty or visit type)
    const age = patient?.dob ? calculateAge(patient.dob) : 'N/A';
    const gender = patient?.gender || 'N/A';
    drawLabelValue(doc, 'Age / Gender', `${age} yrs / ${gender}`, leftX + pad, y, colWidth - pad);
    drawLabelValue(doc, 'Date', formatDate(prescription.created_at, 'display'), leftX + colWidth + pad, y, colWidth - pad);

    doc.y = startY + 65 + 10;
}

function drawVitals(doc, vitals, pageWidth) {
    const startY = doc.y;
    const leftX = doc.page.margins.left;

    // Light background bar
    doc.rect(leftX, startY, pageWidth, 22)
       .fill('#f0f4f8');

    const items = [
        { label: 'BP', value: vitals.bp || 'N/A' },
        { label: 'Pulse', value: vitals.heart_rate ? `${vitals.heart_rate} bpm` : 'N/A' },
        { label: 'Temp', value: vitals.temp ? `${vitals.temp}°F` : 'N/A' },
        { label: 'Weight', value: vitals.weight ? `${vitals.weight} kg` : 'N/A' },
        { label: 'SpO2', value: vitals.spo2 ? `${vitals.spo2}%` : 'N/A' }
    ];

    const colW = pageWidth / items.length;
    items.forEach((item, i) => {
        const x = leftX + i * colW;
        doc.fontSize(7).font('Helvetica').fillColor(COLORS.textMuted)
           .text(item.label + ':', x, startY + 4, { width: colW, align: 'center' });
        doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.text)
           .text(item.value, x, startY + 13, { width: colW, align: 'center' });
    });

    doc.y = startY + 30;
}

function drawDiagnosis(doc, diagnosis, pageWidth) {
    const startY = doc.y;
    const leftX = doc.page.margins.left;

    doc.rect(leftX, startY, pageWidth, 35)
       .fill(COLORS.lightBg);

    doc.fontSize(8).font('Helvetica').fillColor(COLORS.textMuted)
       .text('Clinical Diagnosis', leftX + 10, startY + 5);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.text)
       .text(diagnosis || 'Under evaluation', leftX + 10, startY + 17, {
           width: pageWidth - 20
       });

    doc.y = startY + 40;
}

function drawMedicationsTable(doc, medications, pageWidth) {
    const leftX = doc.page.margins.left;
    
    // Rx symbol + heading
    doc.fontSize(20).font('Helvetica-Bold').fillColor(COLORS.primaryLight)
       .text('℞', leftX, doc.y);
    doc.fontSize(12).font('Helvetica-Bold').fillColor(COLORS.text)
       .text('Medications', leftX + 25, doc.y - 14);
    doc.y += 8;

    // Column widths
    const cols = [
        { label: '#', width: pageWidth * 0.06 },
        { label: 'Medicine', width: pageWidth * 0.30 },
        { label: 'Dosage', width: pageWidth * 0.15 },
        { label: 'Instructions', width: pageWidth * 0.34 },
        { label: 'Duration', width: pageWidth * 0.15 }
    ];

    const rowHeight = 24;
    const headerY = doc.y;

    // Header background
    doc.rect(leftX, headerY, pageWidth, rowHeight)
       .fill('#e8ecf1');

    // Header text
    let colX = leftX;
    cols.forEach(col => {
        doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.text)
           .text(col.label, colX + 4, headerY + 7, { width: col.width - 8 });
        colX += col.width;
    });

    // Header bottom border
    doc.moveTo(leftX, headerY + rowHeight)
       .lineTo(leftX + pageWidth, headerY + rowHeight)
       .strokeColor(COLORS.tableBorder).lineWidth(0.5).stroke();

    let currentY = headerY + rowHeight;

    // Data rows
    const validMeds = medications.filter(rx => rx.name?.trim());
    
    if (validMeds.length === 0) {
        doc.fontSize(9).font('Helvetica-Oblique').fillColor(COLORS.textMuted)
           .text('No medications prescribed', leftX + 4, currentY + 7, { width: pageWidth });
        currentY += rowHeight;
    } else {
        validMeds.forEach((rx, index) => {
            // Check page break
            if (currentY + rowHeight > doc.page.height - doc.page.margins.bottom - 120) {
                doc.addPage();
                currentY = doc.page.margins.top;
            }

            // Alternate row background
            if (index % 2 === 1) {
                doc.rect(leftX, currentY, pageWidth, rowHeight)
                   .fill('#fafbfc');
            }

            colX = leftX;
            const textY = currentY + 7;

            // #
            doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.text)
               .text(String(index + 1), colX + 4, textY, { width: cols[0].width - 8, align: 'center' });
            colX += cols[0].width;

            // Medicine name
            doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.text)
               .text(rx.name || '', colX + 4, textY, { width: cols[1].width - 8 });
            colX += cols[1].width;

            // Dosage
            doc.fontSize(9).font('Helvetica').fillColor(COLORS.text)
               .text(rx.dose || '-', colX + 4, textY, { width: cols[2].width - 8 });
            colX += cols[2].width;

            // Instructions (from frequency)
            const instructions = getMedicationSchedule(rx.freq);
            doc.fontSize(8).font('Helvetica').fillColor(COLORS.text)
               .text(instructions, colX + 4, textY, { width: cols[3].width - 8 });
            colX += cols[3].width;

            // Duration
            doc.fontSize(9).font('Helvetica').fillColor(COLORS.text)
               .text(rx.duration || '-', colX + 4, textY, { width: cols[4].width - 8 });

            // Row bottom border
            doc.moveTo(leftX, currentY + rowHeight)
               .lineTo(leftX + pageWidth, currentY + rowHeight)
               .strokeColor(COLORS.tableBorder).lineWidth(0.3).stroke();

            currentY += rowHeight;
        });
    }

    // Table outer border
    const tableHeight = currentY - headerY;
    doc.rect(leftX, headerY, pageWidth, tableHeight)
       .strokeColor(COLORS.tableBorder).lineWidth(0.5).stroke();

    // Vertical column lines
    colX = leftX;
    cols.forEach((col, i) => {
        if (i > 0) {
            doc.moveTo(colX, headerY)
               .lineTo(colX, headerY + tableHeight)
               .strokeColor(COLORS.tableBorder).lineWidth(0.3).stroke();
        }
        colX += col.width;
    });

    doc.y = currentY + 10;
}

function drawInstructions(doc, pageWidth) {
    const leftX = doc.page.margins.left;
    const startY = doc.y;

    doc.rect(leftX, startY, pageWidth, 80)
       .fill(COLORS.lightBg)
       .strokeColor(COLORS.border).lineWidth(0.5).stroke();

    doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.text)
       .text('General Instructions', leftX + 10, startY + 8);

    const instructions = [
        'Take medicines as prescribed with water',
        'Complete the full course of medication',
        'Report any adverse reactions immediately',
        'Store medicines in a cool, dry place',
        'Follow-up if symptoms persist after completing the course'
    ];

    let instrY = startY + 22;
    instructions.forEach(instr => {
        doc.fontSize(8).font('Helvetica').fillColor(COLORS.text)
           .text(`•  ${instr}`, leftX + 14, instrY);
        instrY += 11;
    });

    doc.y = startY + 88;
}

function drawDoctorSignature(doc, doctor, pageWidth) {
    const leftX = doc.page.margins.left;

    // Check page break
    if (doc.y + 80 > doc.page.height - doc.page.margins.bottom - 40) {
        doc.addPage();
    }

    const sigY = doc.y + 10;

    // Left: Follow-up
    doc.moveTo(leftX, sigY).lineTo(leftX + pageWidth / 2 - 20, sigY)
       .strokeColor(COLORS.border).lineWidth(0.5).stroke();
    
    doc.fontSize(8).font('Helvetica').fillColor(COLORS.textMuted)
       .text('Next Visit / Follow-up', leftX, sigY + 4);
    doc.fontSize(9).font('Helvetica').fillColor(COLORS.text)
       .text('As advised', leftX, sigY + 16);

    // Right: Doctor signature
    const rightX = leftX + pageWidth / 2 + 20;
    const rightW = pageWidth / 2 - 20;
    doc.moveTo(rightX, sigY).lineTo(rightX + rightW, sigY)
       .strokeColor(COLORS.border).lineWidth(0.5).stroke();

    // Signature space
    doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.text)
       .text(doctor?.name || 'Consulting Physician', rightX, sigY + 30, {
           width: rightW, align: 'right'
       });
    
    const regNo = doctor?.reg_no ? `Reg. No: ${doctor.reg_no}` : 'Reg. No: _________________';
    doc.fontSize(8).font('Helvetica').fillColor(COLORS.textMuted)
       .text(regNo, rightX, sigY + 44, { width: rightW, align: 'right' });
    doc.text('Signature & Stamp', rightX, sigY + 55, { width: rightW, align: 'right' });

    doc.y = sigY + 70;
}

function drawFooter(doc, pageWidth) {
    const leftX = doc.page.margins.left;

    // Divider
    doc.moveTo(leftX, doc.y)
       .lineTo(leftX + pageWidth, doc.y)
       .strokeColor(COLORS.border).lineWidth(1).stroke();
    doc.y += 6;

    // Disclaimer
    doc.fontSize(7).font('Helvetica-Oblique').fillColor(COLORS.textMuted)
       .text('This is a computer-generated prescription. Valid for 7 days from date of issue.', leftX, doc.y, {
           width: pageWidth, align: 'center'
       });

    // Timestamp
    doc.y += 10;
    doc.fontSize(7).font('Helvetica').fillColor(COLORS.textMuted)
       .text(`Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, leftX, doc.y, {
           width: pageWidth, align: 'center'
       });
}

// ════════════════════════════════════════════════════════════════
// Utility helpers
// ════════════════════════════════════════════════════════════════

function drawLabelValue(doc, label, value, x, y, maxWidth) {
    doc.fontSize(7).font('Helvetica').fillColor(COLORS.textMuted)
       .text(label, x, y, { width: maxWidth });
    doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.text)
       .text(value, x, y + 10, { width: maxWidth });
}

function getMedicationSchedule(freq) {
    switch (freq) {
        case 'OD': return 'Once daily (Morning)';
        case 'BD/BID': return 'Twice daily (Morning & Night)';
        case 'TID': return 'Three times daily (Morning, Afternoon, Night)';
        case 'QID': return 'Four times daily';
        case 'PRN': return 'As needed';
        default: return freq || '-';
    }
}

function calculateAge(dob) {
    if (!dob) return 'N/A';
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

function formatDate(dateStr, format) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (format === 'YYYYMMDD') {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}${m}${dd}`;
    }
    // Display format: 13 Feb 2026
    return d.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
}

module.exports = { generatePrescriptionPdf };
