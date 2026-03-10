import React from 'react';
import { Button } from 'react-bootstrap';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const BackButton = ({ to = '/', label = 'Back to Dashboard' }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Don't show on main dashboard
    if (location.pathname === '/') return null;

    return (
        <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => to ? navigate(to) : navigate(-1)}
            className="mb-3 d-flex align-items-center gap-2"
            style={{
                borderRadius: '20px',
                padding: '6px 16px',
                fontWeight: 500
            }}
        >
            <ArrowLeft size={16} />
            {label}
        </Button>
    );
};

export default BackButton;
