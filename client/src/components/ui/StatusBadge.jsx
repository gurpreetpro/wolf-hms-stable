import React from 'react';
import { Badge } from 'react-bootstrap';

/**
 * Status Badge Component with consistent color coding
 * 
 * @param {string} status - The status text to display
 * @param {string} type - Optional type override for custom coloring
 * @param {string} size - 'sm' or 'lg' for size variations
 * @param {boolean} pulse - Add pulsing animation for urgent items
 */
const StatusBadge = ({
    status,
    type,
    size = 'md',
    pulse = false,
    className = ''
}) => {
    // Default status-to-color mapping
    const statusColors = {
        // General statuses
        'pending': 'warning',
        'waiting': 'warning',
        'in-progress': 'info',
        'in progress': 'info',
        'in-consult': 'info',
        'processing': 'info',
        'completed': 'success',
        'done': 'success',
        'approved': 'success',
        'paid': 'success',
        'active': 'success',
        'available': 'success',
        'cancelled': 'secondary',
        'inactive': 'secondary',
        'failed': 'danger',
        'rejected': 'danger',
        'overdue': 'danger',
        'critical': 'danger',
        'urgent': 'danger',
        'occupied': 'danger',

        // Medical-specific
        'admitted': 'primary',
        'discharged': 'secondary',
        'sample collected': 'info',
        'results ready': 'success',
        'maintenance': 'dark',
        'reserved': 'purple',

        // Default
        'default': 'secondary'
    };

    // Determine the color
    const normalizedStatus = status?.toLowerCase() || '';
    const variant = type || statusColors[normalizedStatus] || statusColors['default'];

    // Size classes
    const sizeClasses = {
        sm: 'px-2 py-1',
        md: 'px-2 py-1',
        lg: 'px-3 py-2 fs-6'
    };

    // Pulse animation style
    const pulseStyle = pulse ? {
        animation: 'pulse 2s infinite'
    } : {};

    return (
        <>
            {pulse && (
                <style>
                    {`
                        @keyframes pulse {
                            0% { opacity: 1; }
                            50% { opacity: 0.6; }
                            100% { opacity: 1; }
                        }
                    `}
                </style>
            )}
            <Badge
                bg={variant}
                className={`${sizeClasses[size]} ${className}`}
                style={{
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                    ...pulseStyle
                }}
            >
                {status}
            </Badge>
        </>
    );
};

/**
 * Priority Badge - specifically for priority levels
 */
export const PriorityBadge = ({ priority, className = '' }) => {
    const priorityConfig = {
        'high': { color: 'danger', label: '🔴 High' },
        'critical': { color: 'danger', label: '🚨 Critical' },
        'medium': { color: 'warning', label: '🟡 Medium' },
        'normal': { color: 'info', label: '🔵 Normal' },
        'low': { color: 'secondary', label: '⚪ Low' }
    };

    const config = priorityConfig[priority?.toLowerCase()] || priorityConfig['normal'];

    return (
        <Badge bg={config.color} className={className}>
            {config.label}
        </Badge>
    );
};

/**
 * Count Badge - for showing counts with context
 */
export const CountBadge = ({ count, max, variant = 'primary', className = '' }) => {
    const displayCount = max && count > max ? `${max}+` : count;
    const isOverflow = max && count > max;

    return (
        <Badge
            bg={variant}
            className={`rounded-pill ${className}`}
            style={{
                minWidth: '24px',
                fontWeight: isOverflow ? 700 : 500
            }}
        >
            {displayCount}
        </Badge>
    );
};

export default StatusBadge;
