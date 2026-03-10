import React, { useState } from 'react';
import { Card } from 'react-bootstrap';
import { ChevronDown, ChevronRight } from 'lucide-react';

/**
 * CollapsibleSection - Reusable collapsible card section
 * For hybrid UI reorganization of Doctor Dashboard
 */
const CollapsibleSection = ({
    title,
    icon,
    children,
    defaultExpanded = false,
    headerColor = 'primary',
    badge = null,
    onToggle = null
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const handleToggle = () => {
        setIsExpanded(!isExpanded);
        if (onToggle) onToggle(!isExpanded);
    };

    // Color variants for header backgrounds
    const colorClasses = {
        primary: 'bg-primary text-white',
        success: 'bg-success text-white',
        info: 'bg-info text-white',
        warning: 'bg-warning text-dark',
        danger: 'bg-danger text-white',
        dark: 'bg-dark text-white',
        purple: 'text-white',
        teal: 'text-white'
    };

    const getHeaderStyle = () => {
        if (headerColor === 'purple') return { backgroundColor: '#6f42c1' };
        if (headerColor === 'teal') return { backgroundColor: '#20c997' };
        return {};
    };

    return (
        <Card className="shadow-sm mb-2">
            <Card.Header
                className={`${colorClasses[headerColor] || colorClasses.primary} py-2 d-flex justify-content-between align-items-center`}
                style={{
                    cursor: 'pointer',
                    ...getHeaderStyle()
                }}
                onClick={handleToggle}
            >
                <div className="d-flex align-items-center gap-2">
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    {icon}
                    <strong className="small">{title}</strong>
                    {badge}
                </div>
            </Card.Header>
            {isExpanded && (
                <Card.Body className="p-2">
                    {children}
                </Card.Body>
            )}
        </Card>
    );
};

export default CollapsibleSection;
