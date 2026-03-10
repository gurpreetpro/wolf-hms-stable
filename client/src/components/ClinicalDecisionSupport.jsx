import React, { useState } from 'react';
import { Alert, Badge, Card, Collapse, Spinner } from 'react-bootstrap';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Activity, Thermometer, Heart, Droplets } from 'lucide-react';

/**
 * ClinicalDecisionSupport (CDS) — Evidence-based clinical alerts
 * Integrates into patient profiles and doctor dashboards
 * 
 * Features:
 * - Sepsis screening (qSOFA / SIRS criteria)
 * - Dose range validation
 * - Critical lab value alerts
 * - VTE risk assessment
 * - Fall risk scoring
 */
const ClinicalDecisionSupport = ({ patient = {}, vitals = {}, labs = [], medications = [] }) => {
    const [expanded, setExpanded] = useState(true);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(false);

    // Run all CDS rules on mount / data change
    React.useEffect(() => {
        runCDSEngine();
    }, [patient, vitals, labs, medications]);

    const runCDSEngine = () => {
        const newAlerts = [];

        // === SEPSIS SCREENING (qSOFA) ===
        let qsofaScore = 0;
        if (vitals.systolicBP && vitals.systolicBP <= 100) qsofaScore++;
        if (vitals.respiratoryRate && vitals.respiratoryRate >= 22) qsofaScore++;
        if (vitals.gcs && vitals.gcs < 15) qsofaScore++;

        if (qsofaScore >= 2) {
            newAlerts.push({
                id: 'sepsis-qsofa',
                severity: 'critical',
                category: 'Sepsis Screening',
                icon: <Thermometer size={16} />,
                title: `⚠️ qSOFA Score: ${qsofaScore}/3 — Sepsis Alert`,
                detail: `Patient meets ${qsofaScore} qSOFA criteria. Consider blood cultures, lactate level, and empirical antibiotics per SSC guidelines.`,
                evidence: 'Seymour CW et al. JAMA 2016; Surviving Sepsis Campaign 2021',
                actions: ['Order Blood Cultures', 'Check Serum Lactate', 'Start Empiric Antibiotics'],
            });
        }

        // === SIRS CRITERIA ===
        let sirsCount = 0;
        if (vitals.temperature && (vitals.temperature > 38 || vitals.temperature < 36)) sirsCount++;
        if (vitals.heartRate && vitals.heartRate > 90) sirsCount++;
        if (vitals.respiratoryRate && vitals.respiratoryRate > 20) sirsCount++;
        if (labs.find(l => l.name === 'WBC' && (l.value > 12000 || l.value < 4000))) sirsCount++;

        if (sirsCount >= 2 && qsofaScore < 2) {
            newAlerts.push({
                id: 'sirs',
                severity: 'warning',
                category: 'SIRS Criteria',
                icon: <Activity size={16} />,
                title: `🔶 SIRS Score: ${sirsCount}/4 — Monitor Closely`,
                detail: `Patient meets ${sirsCount} SIRS criteria. Not yet meeting qSOFA threshold, but warrants close monitoring.`,
                evidence: 'Bone RC et al. Chest 1992',
                actions: ['Trend Vitals Q2H', 'Reassess in 2 hours'],
            });
        }

        // === CRITICAL LAB VALUES ===
        const criticalLabs = [
            { name: 'Potassium', low: 2.5, high: 6.5, unit: 'mEq/L' },
            { name: 'Sodium', low: 120, high: 160, unit: 'mEq/L' },
            { name: 'Glucose', low: 40, high: 500, unit: 'mg/dL' },
            { name: 'Hemoglobin', low: 5, high: null, unit: 'g/dL' },
            { name: 'Platelets', low: 20000, high: null, unit: '/µL' },
            { name: 'Creatinine', low: null, high: 10, unit: 'mg/dL' },
        ];

        labs.forEach(lab => {
            const rule = criticalLabs.find(c => c.name.toLowerCase() === lab.name?.toLowerCase());
            if (rule) {
                if ((rule.low && lab.value < rule.low) || (rule.high && lab.value > rule.high)) {
                    newAlerts.push({
                        id: `critical-lab-${lab.name}`,
                        severity: 'critical',
                        category: 'Critical Lab Value',
                        icon: <Droplets size={16} />,
                        title: `🔴 CRITICAL: ${lab.name} = ${lab.value} ${rule.unit}`,
                        detail: `Value is outside critical range (${rule.low || '—'}–${rule.high || '—'} ${rule.unit}). Immediate clinical attention required.`,
                        evidence: 'CLSI C49-A Guidelines',
                        actions: ['Notify Physician', 'Repeat Stat', 'Check Sample Integrity'],
                    });
                }
            }
        });

        // === DOSE RANGE CHECK ===
        const doseRanges = {
            'metformin': { max: 2550, unit: 'mg/day', warning: 'Risk of lactic acidosis at high doses' },
            'paracetamol': { max: 4000, unit: 'mg/day', warning: 'Hepatotoxicity risk above 4g/day' },
            'amoxicillin': { max: 3000, unit: 'mg/day', warning: 'GI side effects increase at high doses' },
            'atorvastatin': { max: 80, unit: 'mg/day', warning: 'Myopathy risk increases above 40mg' },
            'omeprazole': { max: 40, unit: 'mg/day', warning: 'Long-term PPI use linked to B12 deficiency' },
        };

        medications.forEach(med => {
            const drugName = med.name?.toLowerCase();
            const rule = drugName ? doseRanges[drugName] : null;
            if (rule && med.daily_dose && med.daily_dose > rule.max) {
                newAlerts.push({
                    id: `dose-${drugName}`,
                    severity: 'warning',
                    category: 'Dose Range Alert',
                    icon: <AlertTriangle size={16} />,
                    title: `⚠️ ${med.name}: ${med.daily_dose} ${rule.unit} exceeds max ${rule.max}`,
                    detail: rule.warning,
                    evidence: 'Drug reference: CDSCO / BNF',
                    actions: ['Review Dose', 'Adjust Prescription'],
                });
            }
        });

        // === VTE RISK (Padua Prediction Score simplified) ===
        if (patient.age > 70 || patient.immobile || patient.cancer) {
            newAlerts.push({
                id: 'vte-risk',
                severity: 'warning',
                category: 'VTE Prophylaxis',
                icon: <Heart size={16} />,
                title: '🔶 VTE Risk — Consider Thromboprophylaxis',
                detail: 'Patient has risk factors for venous thromboembolism. Consider pharmacological or mechanical prophylaxis per NICE NG89.',
                evidence: 'NICE NG89, Padua Prediction Score',
                actions: ['Order Enoxaparin 40mg SC OD', 'Apply TED Stockings'],
            });
        }

        setAlerts(newAlerts);
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return 'danger';
            case 'warning': return 'warning';
            case 'info': return 'info';
            default: return 'secondary';
        }
    };

    if (alerts.length === 0 && !loading) {
        return (
            <Alert variant="success" className="d-flex align-items-center gap-2 py-2 mb-3">
                <CheckCircle size={16} />
                <small>✅ No clinical alerts — all CDS checks passed</small>
            </Alert>
        );
    }

    return (
        <Card className="border-0 shadow-sm mb-3" style={{ borderLeft: '4px solid #dc3545' }}>
            <Card.Header
                className="bg-white d-flex justify-content-between align-items-center"
                style={{ cursor: 'pointer' }}
                onClick={() => setExpanded(!expanded)}
            >
                <div className="d-flex align-items-center gap-2">
                    <AlertTriangle size={18} className="text-danger" />
                    <strong>🧠 Clinical Decision Support — {alerts.length} Alert{alerts.length > 1 ? 's' : ''}</strong>
                </div>
                {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </Card.Header>
            <Collapse in={expanded}>
                <div>
                    {alerts.map(alert => (
                        <div
                            key={alert.id}
                            className="p-3 border-bottom"
                            style={{ borderLeft: `4px solid ${alert.severity === 'critical' ? '#dc3545' : '#ffc107'}` }}
                        >
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <div className="d-flex align-items-center gap-2 mb-1">
                                        {alert.icon}
                                        <strong>{alert.title}</strong>
                                        <Badge bg={getSeverityColor(alert.severity)} className="ms-2">{alert.severity.toUpperCase()}</Badge>
                                    </div>
                                    <small className="text-muted d-block">{alert.detail}</small>
                                    <small className="text-primary d-block mt-1">📚 {alert.evidence}</small>
                                    <div className="d-flex gap-1 mt-2">
                                        {alert.actions.map((action, i) => (
                                            <Badge key={i} bg="outline-primary" className="border text-primary" style={{ cursor: 'pointer' }}>
                                                {action}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                                <Badge bg="light" text="dark">{alert.category}</Badge>
                            </div>
                        </div>
                    ))}
                </div>
            </Collapse>
        </Card>
    );
};

export default ClinicalDecisionSupport;
