import React from 'react';
import { Button, ButtonGroup, Dropdown, DropdownButton } from 'react-bootstrap';
import { FlaskConical, Stethoscope, Calendar, Zap, ChevronRight } from 'lucide-react';

/**
 * QuickActionsBar - Fast action buttons for common clinical tasks
 * Redesigned: Option 1 (Modern Round Chips)
 */
const QuickActionsBar = ({
    onOrderCBC,
    onOrderLFT,
    onOrderRFT,
    onReferPatient,
    onScheduleFollowup,
    departments = ['Cardiology', 'Orthopedics', 'Neurology', 'Gastro', 'Pulmonology'],
    doctors = []
}) => {
    return (
        <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
            <div className="d-flex align-items-center text-muted small me-2">
                <Zap size={14} className="me-1" /> Quick:
            </div>

            {/* Quick Labs - Primary Subtle */}
            <Dropdown as={ButtonGroup}>
                <Dropdown.Toggle 
                    variant="light" 
                    className="rounded-pill border shadow-sm px-3 text-primary bg-primary-subtle" 
                    style={{ fontSize: '0.9rem' }}
                >
                    <FlaskConical size={14} className="me-2" /> Quick Labs
                </Dropdown.Toggle>
                <Dropdown.Menu>
                    <Dropdown.Item onClick={onOrderCBC}>
                        🩸 CBC (Complete Blood Count)
                    </Dropdown.Item>
                    <Dropdown.Item onClick={onOrderLFT}>
                        🧪 LFT (Liver Function)
                    </Dropdown.Item>
                    <Dropdown.Item onClick={onOrderRFT}>
                        💧 RFT (Kidney Function)
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={() => onOrderCBC?.('Lipid Profile')}>
                        ❤️ Lipid Profile
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => onOrderCBC?.('HbA1c')}>
                        🍬 HbA1c (Diabetes)
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>

            {/* Refer Patient - Warning Subtle */}
            <Dropdown as={ButtonGroup}>
                <Dropdown.Toggle 
                    variant="light" 
                    className="rounded-pill border shadow-sm px-3 text-warning bg-warning-subtle" 
                    style={{ minWidth: '100px', fontSize: '0.9rem', color: '#855a00' }}
                >
                    <Stethoscope size={14} className="me-2" /> Refer
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {doctors && doctors.length > 0 ? (
                        doctors.map(doc => (
                            <Dropdown.Item key={doc.id} onClick={() => onReferPatient?.(doc)}>
                                <div className="d-flex flex-column">
                                    <span>Dr. {doc.username}</span>
                                    <small className="text-muted" style={{ fontSize: '0.75em' }}>{doc.department}</small>
                                </div>
                            </Dropdown.Item>
                        ))
                    ) : (
                        departments.map(dept => (
                            <Dropdown.Item key={dept} onClick={() => onReferPatient?.(dept)}>
                                → {dept}
                            </Dropdown.Item>
                        ))
                    )}
                </Dropdown.Menu>
            </Dropdown>

            {/* Follow-up - Success Subtle */}
            <Button 
                variant="light" 
                className="rounded-pill border shadow-sm px-3 text-success bg-success-subtle" 
                style={{ fontSize: '0.9rem' }}
                onClick={onScheduleFollowup}
            >
                <Calendar size={14} className="me-2" /> Follow-up
            </Button>
            
            <Button variant="link" className="text-muted text-decoration-none small ms-auto disabled" style={{ opacity: 0.5 }}>
                More <ChevronRight size={14} />
            </Button>

            <style>
                {`
                    .bg-primary-subtle { background-color: #e0f2fe !important; border-color: #bae6fd !important; }
                    .bg-warning-subtle { background-color: #fef9c3 !important; border-color: #fde047 !important; }
                    .bg-success-subtle { background-color: #dcfce7 !important; border-color: #86efac !important; }
                `}
            </style>
        </div>
    );
};

export default QuickActionsBar;
