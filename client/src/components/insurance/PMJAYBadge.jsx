/**
 * PMJAY Badge Component
 * Displays PMJAY verification status badge
 * 
 * WOLF HMS
 */

import React from 'react';
import { Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Shield, Check } from 'lucide-react';

const PMJAYBadge = ({ 
    pmjayId, 
    verified = false, 
    balance = null,
    size = 'md', // sm, md, lg
    showTooltip = true,
    onClick = null
}) => {
    const sizeStyles = {
        sm: { padding: '2px 6px', fontSize: '0.7rem' },
        md: { padding: '4px 10px', fontSize: '0.8rem' },
        lg: { padding: '6px 14px', fontSize: '0.9rem' }
    };

    const badge = (
        <Badge 
            bg={verified ? 'success' : 'warning'}
            className="d-inline-flex align-items-center gap-1"
            style={{ 
                ...sizeStyles[size],
                cursor: onClick ? 'pointer' : 'default',
                background: verified 
                    ? 'linear-gradient(135deg, #059669 0%, #34d399 100%)'
                    : 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)'
            }}
            onClick={onClick}
        >
            <Shield size={size === 'sm' ? 10 : size === 'lg' ? 16 : 12} />
            PMJAY
            {verified && <Check size={size === 'sm' ? 8 : size === 'lg' ? 14 : 10} />}
        </Badge>
    );

    if (!showTooltip) return badge;

    const tooltipContent = (
        <Tooltip id="pmjay-tooltip">
            <div className="text-start">
                <div><strong>Ayushman Bharat</strong></div>
                {pmjayId && <div>ID: {pmjayId}</div>}
                {balance !== null && (
                    <div>Balance: ₹{Number(balance).toLocaleString()}</div>
                )}
                <div className={verified ? 'text-success' : 'text-warning'}>
                    {verified ? '✓ Verified' : '⏳ Pending Verification'}
                </div>
            </div>
        </Tooltip>
    );

    return (
        <OverlayTrigger placement="top" overlay={tooltipContent}>
            {badge}
        </OverlayTrigger>
    );
};

export default PMJAYBadge;
