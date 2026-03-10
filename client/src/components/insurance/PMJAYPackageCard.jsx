/**
 * PMJAY Package Card
 * Displays selected PMJAY package in consultation/admission flows
 * 
 * WOLF HMS
 */

import React from 'react';
import { Card, Badge, Button } from 'react-bootstrap';
import { Package, Shield, Clock, IndianRupee, CheckCircle, Edit2, X } from 'lucide-react';

const PMJAYPackageCard = ({ 
    packageData, 
    onEdit, 
    onRemove, 
    compact = false,
    isDark = false 
}) => {
    if (!packageData) return null;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', { 
            style: 'currency', 
            currency: 'INR',
            maximumFractionDigits: 0 
        }).format(amount);
    };

    if (compact) {
        return (
            <div 
                className={`d-flex align-items-center justify-content-between p-2 rounded-3 ${isDark ? 'bg-success bg-opacity-10' : 'bg-success bg-opacity-10'}`}
                style={{ border: '1px solid rgba(52, 211, 153, 0.3)' }}
            >
                <div className="d-flex align-items-center gap-2">
                    <Shield size={16} className="text-success" />
                    <span className="fw-medium">{packageData.packageName}</span>
                    <code className="small text-muted">{packageData.packageCode}</code>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <span className="text-success fw-bold">{formatCurrency(packageData.rate)}</span>
                    {onEdit && (
                        <Button size="sm" variant="link" className="p-0 text-muted" onClick={onEdit}>
                            <Edit2 size={14} />
                        </Button>
                    )}
                    {onRemove && (
                        <Button size="sm" variant="link" className="p-0 text-danger" onClick={onRemove}>
                            <X size={14} />
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <Card 
            className={`border-0 shadow-sm ${isDark ? 'bg-dark text-white' : ''}`}
            style={{ 
                background: isDark 
                    ? 'linear-gradient(135deg, rgba(5, 150, 105, 0.15) 0%, rgba(52, 211, 153, 0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(5, 150, 105, 0.08) 0%, rgba(52, 211, 153, 0.05) 100%)',
                border: '1px solid rgba(52, 211, 153, 0.3)'
            }}
        >
            <Card.Body className="p-3">
                <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="d-flex align-items-center gap-2">
                        <div 
                            className="d-flex align-items-center justify-content-center rounded-circle"
                            style={{ 
                                width: 36, 
                                height: 36, 
                                background: 'linear-gradient(135deg, #059669 0%, #34d399 100%)' 
                            }}
                        >
                            <Package size={18} color="white" />
                        </div>
                        <div>
                            <h6 className="mb-0 fw-bold">{packageData.packageName}</h6>
                            <small className="text-muted">
                                <code>{packageData.packageCode}</code> | Tier {packageData.cityTier || 'T2'}
                            </small>
                        </div>
                    </div>
                    <div className="d-flex gap-1">
                        {onEdit && (
                            <Button size="sm" variant="outline-secondary" onClick={onEdit}>
                                <Edit2 size={14} />
                            </Button>
                        )}
                        {onRemove && (
                            <Button size="sm" variant="outline-danger" onClick={onRemove}>
                                <X size={14} />
                            </Button>
                        )}
                    </div>
                </div>

                <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex gap-2">
                        {packageData.requiresPreauth && (
                            <Badge bg="warning" text="dark" className="d-flex align-items-center gap-1">
                                <Shield size={10} />
                                Pre-Auth Required
                            </Badge>
                        )}
                        {packageData.expectedLOS && (
                            <Badge bg="secondary" className="d-flex align-items-center gap-1">
                                <Clock size={10} />
                                {packageData.expectedLOS} days LOS
                            </Badge>
                        )}
                    </div>
                    <div className="text-end">
                        <div className="h4 mb-0 text-success fw-bold">
                            {formatCurrency(packageData.rate)}
                        </div>
                        {packageData.baseRate && packageData.rate !== packageData.baseRate && (
                            <small className="text-muted text-decoration-line-through">
                                {formatCurrency(packageData.baseRate)}
                            </small>
                        )}
                    </div>
                </div>

                {/* Procedures */}
                {packageData.procedures?.length > 0 && (
                    <div className="mt-3 pt-2 border-top">
                        <small className="text-muted d-flex align-items-center gap-1 mb-2">
                            <CheckCircle size={12} />
                            Includes {packageData.procedures.length} procedure(s)
                        </small>
                        <div className="d-flex flex-wrap gap-1">
                            {packageData.procedures.slice(0, 3).map(proc => (
                                <Badge key={proc.code} bg="light" text="dark" className="fw-normal">
                                    {proc.name}
                                </Badge>
                            ))}
                            {packageData.procedures.length > 3 && (
                                <Badge bg="secondary">
                                    +{packageData.procedures.length - 3} more
                                </Badge>
                            )}
                        </div>
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

export default PMJAYPackageCard;
