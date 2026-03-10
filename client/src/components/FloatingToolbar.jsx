import React, { useState } from 'react';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import {
    Brain, FileText, Heart, Baby, Users, Video, Calendar,
    ChevronLeft, ChevronRight, Sparkles, Stethoscope
} from 'lucide-react';

/**
 * FloatingToolbar - Quick access toolbar for Doctor Dashboard
 * Provides fast access to specialty tools and features
 */
const FloatingToolbar = ({
    onAIClick,
    onChatClick,
    onSOAPClick,
    onCardiologyClick,
    onPediatricsClick,
    onReferralClick,
    onVideoClick,
    onScheduleClick,
    showPediatrics = false,
    showCardiology = true,
    patientSelected = false
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const tools = [
        {
            id: 'ai',
            icon: <Brain size={18} />,
            label: 'AI Assist',
            color: '#6f42c1',
            onClick: onAIClick,
            show: true
        },
        {
            id: 'chat',
            icon: <Sparkles size={18} />,
            label: 'AI Chat Bot',
            color: '#0dcaf0',
            onClick: onChatClick, // Correct prop
            show: true
        },
        {
            id: 'soap',
            icon: <FileText size={18} />,
            label: 'SOAP Notes',
            color: '#0d6efd',
            onClick: onSOAPClick,
            show: true
        },
        {
            id: 'cardio',
            icon: <Heart size={18} />,
            label: 'Cardiology',
            color: '#dc3545',
            onClick: onCardiologyClick,
            show: showCardiology
        },
        {
            id: 'peds',
            icon: <Baby size={18} />,
            label: 'Pediatrics',
            color: '#17a2b8',
            onClick: onPediatricsClick,
            show: showPediatrics
        },
        {
            id: 'referral',
            icon: <Users size={18} />,
            label: 'Referral',
            color: '#6f42c1',
            onClick: onReferralClick,
            show: true
        },
        {
            id: 'video',
            icon: <Video size={18} />,
            label: 'Video Call',
            color: '#198754',
            onClick: onVideoClick,
            show: true
        },
        {
            id: 'schedule',
            icon: <Calendar size={18} />,
            label: 'Schedule',
            color: '#343a40',
            onClick: onScheduleClick,
            show: true
        }
    ].filter(tool => tool.show);

    return (
        <div
            style={{
                position: 'fixed',
                right: isCollapsed ? 0 : 10,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                gap: 4
            }}
        >
            {/* Collapse Toggle */}
            <Button
                variant="dark"
                size="sm"
                className="rounded-circle p-1"
                onClick={() => setIsCollapsed(!isCollapsed)}
                style={{ width: 28, height: 28 }}
            >
                {isCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </Button>

            {/* Toolbar */}
            {!isCollapsed && (
                <div
                    className="d-flex flex-column gap-2 p-2 rounded shadow-lg"
                    style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(0,0,0,0.1)'
                    }}
                >
                    {tools.map(tool => (
                        <OverlayTrigger
                            key={tool.id}
                            placement="left"
                            overlay={<Tooltip>{tool.label}</Tooltip>}
                        >
                            <Button
                                variant="light"
                                size="sm"
                                className="rounded-circle p-2 d-flex align-items-center justify-content-center"
                                style={{
                                    width: 42,
                                    height: 42,
                                    color: tool.color,
                                    border: `2px solid ${tool.color}`,
                                    opacity: (patientSelected || ['schedule', 'chat'].includes(tool.id)) ? 1 : 0.5
                                }}
                                onClick={tool.onClick}
                                disabled={!patientSelected && !['schedule', 'chat'].includes(tool.id)}
                            >
                                {tool.icon}
                            </Button>
                        </OverlayTrigger>
                    ))}
                </div>
            )}

            {/* Styles */}
            <style>{`
                .floating-toolbar-btn:hover {
                    transform: scale(1.1);
                    transition: transform 0.2s ease;
                }
            `}</style>
        </div>
    );
};

export default FloatingToolbar;
