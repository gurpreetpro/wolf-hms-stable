import React from 'react';
import { Card, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Clock, Eye, CheckCircle, AlertTriangle, User } from 'lucide-react';

/**
 * OrderTrackingTimeline - Visual timeline showing order lifecycle
 * 
 * Stages: Ordered → Acknowledged → In Progress → Completed
 */

const STAGES = [
    { key: 'ordered', label: 'Ordered', icon: Clock, color: 'primary' },
    { key: 'acknowledged', label: 'Acknowledged', icon: Eye, color: 'info' },
    { key: 'completed', label: 'Completed', icon: CheckCircle, color: 'success' },
];

const OrderTrackingTimeline = ({ order }) => {
    // Determine current stage based on order data
    const getCurrentStage = () => {
        if (order.status === 'Completed' || order.completed_at) return 2;
        if (order.acknowledged_at) return 1;
        return 0;
    };

    const currentStage = getCurrentStage();
    
    // Calculate time elapsed since order creation
    const getTimeElapsed = (fromDate) => {
        if (!fromDate) return '';
        const now = new Date();
        const from = new Date(fromDate);
        const diffMs = now - from;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${Math.floor(diffHours / 24)}d ago`;
    };

    // Check if order is delayed (unacknowledged for >10 min)
    const isDelayed = () => {
        if (order.acknowledged_at) return false;
        const createdAt = new Date(order.scheduled_time || order.created_at);
        const now = new Date();
        const diffMins = (now - createdAt) / (1000 * 60);
        return diffMins > 10;
    };

    const delayed = isDelayed();

    return (
        <div className="order-timeline d-flex align-items-center gap-2" style={{ fontSize: '0.75rem' }}>
            {STAGES.map((stage, idx) => {
                const isActive = idx <= currentStage;
                const isCurrent = idx === currentStage;
                const Icon = stage.icon;
                
                // Get timestamp for this stage
                let timestamp = null;
                if (idx === 0) timestamp = order.scheduled_time || order.created_at;
                else if (idx === 1) timestamp = order.acknowledged_at;
                else if (idx === 2) timestamp = order.completed_at;
                
                return (
                    <React.Fragment key={stage.key}>
                        {idx > 0 && (
                            <div 
                                className={`flex-grow-0`}
                                style={{ 
                                    width: '20px', 
                                    height: '2px', 
                                    backgroundColor: isActive ? '#198754' : '#dee2e6' 
                                }}
                            />
                        )}
                        <OverlayTrigger
                            overlay={
                                <Tooltip>
                                    {stage.label}
                                    {timestamp && (
                                        <div className="small">
                                            {new Date(timestamp).toLocaleString()}
                                        </div>
                                    )}
                                    {idx === 1 && order.acknowledged_by_name && (
                                        <div className="small">By: {order.acknowledged_by_name}</div>
                                    )}
                                </Tooltip>
                            }
                        >
                            <div 
                                className={`d-flex align-items-center justify-content-center rounded-circle`}
                                style={{ 
                                    width: '24px', 
                                    height: '24px',
                                    backgroundColor: isActive ? (isCurrent && delayed && idx === 0 ? '#dc3545' : `var(--bs-${stage.color})`) : '#dee2e6',
                                    color: isActive ? 'white' : '#6c757d',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Icon size={12} />
                            </div>
                        </OverlayTrigger>
                    </React.Fragment>
                );
            })}
            
            {/* Elapsed time indicator */}
            <span className={`ms-2 ${delayed ? 'text-danger fw-bold' : 'text-muted'}`}>
                {delayed && <AlertTriangle size={12} className="me-1" />}
                {getTimeElapsed(order.scheduled_time || order.created_at)}
            </span>
        </div>
    );
};

export default OrderTrackingTimeline;
