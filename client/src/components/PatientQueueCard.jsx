import React from 'react';
import { Badge, Button } from 'react-bootstrap';
import { Clock, AlertCircle, User, Video } from 'lucide-react';

/**
 * PatientQueueCard - Enhanced queue item for Doctor Dashboard
 * Shows patient info, complaint, priority, and waiting time
 */
const PatientQueueCard = ({ patient, isSelected, onClick, onVideoCall }) => {
    // Calculate waiting time
    const getWaitingTime = () => {
        if (!patient.visit_date && !patient.created_at) return null;
        const visitTime = new Date(patient.visit_date || patient.created_at);
        const now = new Date();
        const diffMs = now - visitTime;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min`;
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return `${hours}h ${mins}m`;
    };

    // Determine priority from complaint keywords
    const getPriority = () => {
        const complaint = (patient.complaint || '').toLowerCase();

        // Critical keywords
        if (complaint.includes('chest pain') || complaint.includes('breathing') ||
            complaint.includes('unconscious') || complaint.includes('accident')) {
            return { level: 'critical', color: 'danger', label: 'CRITICAL' };
        }

        // High priority
        if (complaint.includes('severe') || complaint.includes('high fever') ||
            complaint.includes('bleeding') || complaint.includes('fracture')) {
            return { level: 'high', color: 'warning', label: 'HIGH' };
        }

        // Normal
        return { level: 'normal', color: 'secondary', label: null };
    };

    const priority = getPriority();
    const waitTime = getWaitingTime();
    const age = patient.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : 'N/A';

    // Border color based on priority
    const borderStyle = priority.level === 'critical'
        ? 'border-start border-danger border-4'
        : priority.level === 'high'
            ? 'border-start border-warning border-3'
            : '';

    const handleVideoClick = (e) => {
        e.stopPropagation(); // Prevent card selection
        if (onVideoCall) onVideoCall(patient);
    };

    return (
        <button
            className={`list-group-item list-group-item-action ${isSelected ? 'active' : ''} ${borderStyle}`}
            onClick={onClick}
            style={{ transition: 'all 0.2s' }}
        >
            <div className="d-flex w-100 justify-content-between align-items-start mb-1">
                <div className="d-flex align-items-center gap-2">
                    {/* Avatar placeholder */}
                    <div
                        className="rounded-circle bg-light d-flex align-items-center justify-content-center"
                        style={{ width: 32, height: 32, flexShrink: 0 }}
                    >
                        <User size={16} className="text-secondary" />
                    </div>
                    <div>
                        <h6 className="mb-0 fw-bold">{patient.patient_name}</h6>
                        <small className={isSelected ? 'text-light' : 'text-muted'}>
                            {patient.gender}, {age} yrs
                        </small>
                    </div>
                </div>
                <div className="text-end">
                    <Badge bg="primary" className="mb-1">Token {patient.token_number}</Badge>
                    {priority.label && (
                        <div>
                            <Badge bg={priority.color} className="mt-1">
                                <AlertCircle size={10} className="me-1" />
                                {priority.label}
                            </Badge>
                        </div>
                    )}
                </div>
            </div>

            {/* Complaint Preview */}
            {patient.complaint && (
                <div
                    className={`small ${isSelected ? 'text-light' : 'text-muted'} text-truncate`}
                    style={{ maxWidth: '100%' }}
                    title={patient.complaint}
                >
                    💬 {patient.complaint.length > 50 ? patient.complaint.substring(0, 50) + '...' : patient.complaint}
                </div>
            )}

            {/* Waiting time and Video Call */}
            <div className="d-flex justify-content-between align-items-center mt-1">
                {waitTime && (
                    <div className={`small ${isSelected ? 'text-light' : 'text-muted'}`}>
                        <Clock size={12} className="me-1" />
                        Waiting: {waitTime}
                    </div>
                )}
                {/* Video button only for teleconsultation patients */}
                {onVideoCall && (patient.consultation_type === 'tele' || patient.consultation_type === 'teleconsultation') && (
                    <Button
                        variant={isSelected ? 'light' : 'outline-primary'}
                        size="sm"
                        onClick={handleVideoClick}
                        className="py-0 px-2"
                        title="Start Video Consultation"
                    >
                        <Video size={14} className="me-1" />
                        Video
                    </Button>
                )}
            </div>
        </button>
    );
};

export default PatientQueueCard;
