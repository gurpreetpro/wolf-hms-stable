import React from 'react';
import { Button, Tooltip, OverlayTrigger } from 'react-bootstrap';
import { Shield, Brain, Mic, MessageCircle, MoreVertical, Brush, Utensils } from 'lucide-react'; // Added Utensils

const QuickActionDock = ({ 
    onEmergencyClick, 
    onAIClick, 
    onVoiceClick, 
    onChatClick,
    onCleaningClick,
    onDietaryClick // New Prop
}) => {


    const dockStyle = {
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1040,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        borderRadius: '24px',
        padding: '0.5rem 1rem',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
    };



    return (
        <div style={dockStyle} className="d-print-none">
            
            {/* Emergency - Highlighted */}
            <ActionButton 
                icon={Shield} 
                onClick={onEmergencyClick} 
                color="danger" 
                tooltip="Emergency Protocols"
            />
            
            <div style={{ width: '1px', height: '24px', backgroundColor: '#dee2e6' }}></div>

             {/* Housekeeping - Phase 2 */}
             <ActionButton 
                icon={Brush} 
                onClick={onCleaningClick} 
                color="info" 
                tooltip="Request Cleaning"
            />
            
            <ActionButton 
                icon={Utensils} 
                onClick={onDietaryClick} 
                color="warning" 
                tooltip="Order Meal"
            />

            <div style={{ width: '1px', height: '24px', backgroundColor: '#dee2e6' }}></div>

            {/* Clinical Tools */}
            <ActionButton 
                icon={Brain} 
                onClick={onAIClick} 
                color="purple" 
                tooltip="Clinical AI Support"
            />

            <ActionButton 
                icon={Mic} 
                onClick={onVoiceClick} // This will be intercepted by VoiceCommandButton wrapper
                color="primary" 
                tooltip="Voice Commands"
            />

            {/* Chat/Other */}
            <ActionButton 
                icon={MessageCircle} 
                onClick={onChatClick} 
                color="primary" 
                tooltip="Hospital Assistant"
            />

            {/* Hover Effects in CSS */}
            <style>
                {`
                .action-button-hover:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 8px 15px rgba(0,0,0,0.2) !important;
                }
                `}
            </style>
        </div>
    );
};

// Moved ActionButton outside
const ActionButton = ({ icon: Icon, onClick, color, tooltip, badge }) => (
    <OverlayTrigger
        placement="top"
        delay={{ show: 250, hide: 400 }}
        overlay={(props) => (
            <Tooltip id="button-tooltip" {...props}>
                {tooltip}
            </Tooltip>
        )}
    >
        <Button 
            style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                border: 'none',
                position: 'relative',
                backgroundColor: color === 'danger' ? '#dc3545' : 
                                color === 'primary' ? '#0d6efd' : 
                                color === 'purple' ? '#6f42c1' : 
                                color === 'info' ? '#0dcaf0' : '#f8f9fa',
                color: color ? 'white' : '#212529',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
            className="action-button-hover"
            onClick={onClick}
        >
            <Icon size={22} />
            {badge && (
                <span 
                    className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                    style={{ fontSize: '0.6rem' }}
                >
                    {badge}
                </span>
            )}
        </Button>
    </OverlayTrigger>
);

export default QuickActionDock;
