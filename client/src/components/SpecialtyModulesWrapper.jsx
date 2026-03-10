import React from 'react';
import { Badge } from 'react-bootstrap';
import PediatricsModule from './PediatricsModule';
import CardiologyModule from './CardiologyModule';

/**
 * SpecialtyModulesWrapper - Phase 6
 * Displays relevant specialty modules based on patient age or department
 */

const SpecialtyModulesWrapper = ({ patient, vitals, department }) => {
    // Calculate patient age
    const getAge = () => {
        if (!patient?.dob) return null;
        const dob = new Date(patient.dob);
        const now = new Date();
        return Math.floor((now - dob) / (365.25 * 24 * 60 * 60 * 1000));
    };

    const age = getAge();

    // Determine which modules to show
    const showPediatrics = age !== null && age < 18;
    const showCardiology = department?.toLowerCase()?.includes('cardio') ||
        patient?.complaint?.toLowerCase()?.includes('chest') ||
        patient?.complaint?.toLowerCase()?.includes('heart') ||
        patient?.complaint?.toLowerCase()?.includes('bp') ||
        (age && age >= 40);

    // No modules to show
    if (!showPediatrics && !showCardiology) {
        return null;
    }

    return (
        <div className="mb-3">
            <div className="d-flex align-items-center gap-2 mb-2">
                <Badge bg="dark" className="px-2 py-1">
                    🏥 Specialty Tools
                </Badge>
                <small className="text-muted">
                    Auto-detected based on patient profile
                </small>
            </div>

            {showPediatrics && (
                <PediatricsModule patient={patient} />
            )}

            {showCardiology && (
                <CardiologyModule patient={patient} vitals={vitals} />
            )}
        </div>
    );
};

export default SpecialtyModulesWrapper;
