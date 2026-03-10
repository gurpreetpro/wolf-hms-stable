import React, { useMemo, useState } from 'react';
import { Row, Col, Card, Badge, ButtonGroup, Button, Form } from 'react-bootstrap';
import BedCard from './BedCard';
import { LayoutGrid, Users, Activity, AlertTriangle, ArrowUpDown, Building2 } from 'lucide-react';

const DigitalWhiteboard = ({ admissions = [], allAdmissions = [], onPatientClick, wardFilter, setWardFilter }) => {
    const [sortMode, setSortMode] = useState('critical'); // 'critical', 'room', 'name'

    // Ensure arrays are always defined - memoized to prevent dependency issues
    const safeAdmissions = useMemo(() => admissions || [], [admissions]);
    const safeAllAdmissions = useMemo(() => allAdmissions || [], [allAdmissions]);

    // Get unique wards from allAdmissions
    const uniqueWards = useMemo(() => {
        const source = safeAllAdmissions.length > 0 ? safeAllAdmissions : safeAdmissions;
        if (!source || source.length === 0) return ['All'];
        const wards = [...new Set(source.map(a => a.ward).filter(Boolean))];
        return ['All', ...wards.sort()];
    }, [safeAllAdmissions, safeAdmissions]);

    // Sorted admissions (admissions prop is already refined by parent)
    const sortedAdmissions = useMemo(() => {
        const sorted = [...safeAdmissions];

        if (sortMode === 'critical') {
            // Sort by NEWS2 score descending (critical first)
            sorted.sort((a, b) => {
                const scoreA = a.news2Score ?? -1;
                const scoreB = b.news2Score ?? -1;
                return scoreB - scoreA;
            });
        } else if (sortMode === 'room') {
            // Sort by room/bed number
            sorted.sort((a, b) => a.bed_number.localeCompare(b.bed_number));
        } else if (sortMode === 'name') {
            sorted.sort((a, b) => a.patient_name.localeCompare(b.patient_name));
        }

        return sorted;
    }, [safeAdmissions, sortMode]);

    // Calculate Ward Stats using real NEWS2 data
    const totalPatients = safeAdmissions.length;
    const criticalPatients = safeAdmissions.filter(a => (a.news2Score ?? 0) >= 5).length;
    const sepsisPatients = safeAdmissions.filter(a => a.sepsisRisk).length;

    // Group by risk level for visual sections when in critical mode
    const riskGroups = useMemo(() => {
        if (sortMode !== 'critical') return null;

        return {
            critical: sortedAdmissions.filter(a => (a.news2Score ?? 0) >= 7 || a.sepsisRisk),
            medium: sortedAdmissions.filter(a => (a.news2Score ?? 0) >= 5 && (a.news2Score ?? 0) < 7 && !a.sepsisRisk),
            low: sortedAdmissions.filter(a => (a.news2Score ?? 0) < 5 && !a.sepsisRisk)
        };
    }, [sortedAdmissions, sortMode]);

    // Render a section of patients
    const renderPatientSection = (title, patients, bgColor, icon) => {
        if (patients.length === 0) return null;
        return (
            <div className="mb-4" key={title}>
                <h5 className={`fw-bold mb-3 pb-2 border-bottom d-flex align-items-center gap-2 text-${bgColor}`}>
                    {icon} {title}
                    <Badge bg={bgColor} className="ms-2">{patients.length}</Badge>
                </h5>
                <Row className="g-4">
                    {patients.map(patient => (
                        <Col key={patient.admission_id} xs={12} sm={6} md={4} lg={4} xl={3}>
                            <BedCard admission={patient} onClick={onPatientClick} />
                        </Col>
                    ))}
                </Row>
            </div>
        );
    };

    return (
        <div className="digital-whiteboard">
            {/* Stats Header */}
            <Row className="mb-4 g-3">
                <Col md={3}>
                    <Card className="border-0 shadow-sm bg-primary text-white h-100">
                        <Card.Body className="d-flex align-items-center justify-content-between py-4">
                            <div>
                                <h6 className="opacity-75 mb-1">Total Census</h6>
                                <h1 className="fw-bold mb-0" style={{ fontSize: '2.5rem' }}>{totalPatients}</h1>
                            </div>
                            <Users size={48} className="opacity-50" />
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm bg-danger text-white h-100">
                        <Card.Body className="d-flex align-items-center justify-content-between py-4">
                            <div>
                                <h6 className="opacity-75 mb-1">Critical / High NEWS2</h6>
                                <h1 className="fw-bold mb-0" style={{ fontSize: '2.5rem' }}>{criticalPatients}</h1>
                            </div>
                            <Activity size={48} className="opacity-50" />
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm bg-warning text-dark h-100">
                        <Card.Body className="d-flex align-items-center justify-content-between py-4">
                            <div>
                                <h6 className="opacity-75 mb-1">Sepsis Alerts</h6>
                                <h1 className="fw-bold mb-0" style={{ fontSize: '2.5rem' }}>{sepsisPatients}</h1>
                            </div>
                            <AlertTriangle size={48} className="opacity-50" />
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm bg-light h-100">
                        <Card.Body className="d-flex flex-column justify-content-center py-4">
                            <h6 className="text-muted mb-2"><ArrowUpDown size={16} className="me-1" /> Sort By</h6>
                            <ButtonGroup size="sm" className="w-100">
                                <Button
                                    variant={sortMode === 'critical' ? 'danger' : 'outline-danger'}
                                    onClick={() => setSortMode('critical')}
                                >
                                    🚨 Critical First
                                </Button>
                                <Button
                                    variant={sortMode === 'room' ? 'secondary' : 'outline-secondary'}
                                    onClick={() => setSortMode('room')}
                                >
                                    🛏️ By Room
                                </Button>
                            </ButtonGroup>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Ward Filter Pills */}
            <div className="mb-4 d-flex align-items-center gap-2 flex-wrap">
                <span className="text-muted me-2 d-flex align-items-center">
                    <Building2 size={18} className="me-1" /> Filter by Ward:
                </span>
                {uniqueWards.map(ward => (
                    <Button
                        key={ward}
                        size="sm"
                        variant={wardFilter === ward ? 'primary' : 'outline-primary'}
                        onClick={() => setWardFilter(ward)}
                        className="rounded-pill px-3"
                    >
                        {ward === 'All' ? '🏥 All Wards' : `🛏️ ${ward}`}
                        {ward !== 'All' && (
                            <Badge bg="light" text="dark" className="ms-2">
                            {(safeAllAdmissions.length > 0 ? safeAllAdmissions : safeAdmissions).filter(a => a.ward === ward).length}
                            </Badge>
                        )}
                    </Button>
                ))}
            </div>

            {/* Patient Grid - Priority Sorted */}
            {sortMode === 'critical' && riskGroups ? (
                <>
                    {renderPatientSection('🚨 CRITICAL - Immediate Attention', riskGroups.critical, 'danger', <AlertTriangle size={20} />)}
                    {renderPatientSection('⚠️ MEDIUM RISK - Monitor Closely', riskGroups.medium, 'warning', <Activity size={20} />)}
                    {renderPatientSection('✅ LOW RISK - Stable', riskGroups.low, 'success', <Users size={20} />)}
                </>
            ) : (
                <Row className="g-4">
                    {sortedAdmissions.map(patient => (
                        <Col key={patient.admission_id} xs={12} sm={6} md={4} lg={4} xl={3}>
                            <BedCard admission={patient} onClick={onPatientClick} />
                        </Col>
                    ))}
                </Row>
            )}

            {safeAdmissions.length === 0 && (
                <div className="text-center py-5 text-muted">
                    <h4>Ward is Empty</h4>
                    <p>No admitted patients found.</p>
                </div>
            )}
        </div>
    );
};

export default DigitalWhiteboard;
