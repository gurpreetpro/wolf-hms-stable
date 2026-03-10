import React from 'react';
import { Card } from 'react-bootstrap';

/**
 * Unified Stats Card Component
 * Provides consistent styling for dashboard statistics across all modules
 * 
 * @param {string} title - Label for the stat
 * @param {number|string} value - The main value to display
 * @param {React.ReactNode} icon - Lucide icon component
 * @param {string} variant - Color variant: primary, success, warning, danger, info
 * @param {string} subtitle - Optional subtitle text
 * @param {Function} onClick - Optional click handler
 */
const StatsCard = ({
    title,
    value,
    icon,
    variant = 'primary',
    subtitle,
    onClick,
    className = ''
}) => {
    const variantColors = {
        primary: { bg: '#0d6efd', text: 'white' },
        success: { bg: '#198754', text: 'white' },
        warning: { bg: '#ffc107', text: 'dark' },
        danger: { bg: '#dc3545', text: 'white' },
        info: { bg: '#0dcaf0', text: 'dark' },
        secondary: { bg: '#6c757d', text: 'white' },
        purple: { bg: '#6f42c1', text: 'white' },
        dark: { bg: '#212529', text: 'white' }
    };

    const colors = variantColors[variant] || variantColors.primary;

    return (
        <Card
            className={`border-0 shadow-sm h-100 ${onClick ? 'cursor-pointer' : ''} ${className}`}
            style={{
                backgroundColor: colors.bg,
                cursor: onClick ? 'pointer' : 'default',
                transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onClick={onClick}
            onMouseEnter={(e) => {
                if (onClick) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '';
            }}
        >
            <Card.Body className="d-flex align-items-center justify-content-between py-3">
                <div>
                    <h2
                        className={`mb-1 fw-bold text-${colors.text}`}
                        style={{ fontSize: '2rem' }}
                    >
                        {value}
                    </h2>
                    <div className={`text-${colors.text}`} style={{ opacity: 0.9 }}>
                        {title}
                    </div>
                    {subtitle && (
                        <small className={`text-${colors.text}`} style={{ opacity: 0.7 }}>
                            {subtitle}
                        </small>
                    )}
                </div>
                {icon && (
                    <div className={`text-${colors.text}`} style={{ opacity: 0.5 }}>
                        {React.cloneElement(icon, { size: 36 })}
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

export default StatsCard;
