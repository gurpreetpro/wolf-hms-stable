import React from 'react';
import useHospitalProfile from '../../hooks/useHospitalProfile';

/**
 * HospitalPrintFooter - Standardized footer component for all print documents
 * 
 * Props:
 * @param {boolean} showTimestamp - Whether to show print timestamp
 * @param {boolean} showPageNumber - Whether to show page number (for multi-page docs)
 * @param {string} disclaimer - Custom disclaimer text
 * @param {boolean} showRegistration - Whether to show registration number
 * @param {boolean} showWebsite - Whether to show website
 */
const HospitalPrintFooter = ({ 
    showTimestamp = true, 
    showPageNumber = false,
    disclaimer = 'This is a computer-generated document. No signature is required.',
    showRegistration = true,
    showWebsite = true
}) => {
    const { hospitalProfile } = useHospitalProfile();

    const formatDate = () => {
        return new Date().toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    };

    return (
        <div className="hospital-print-footer" style={styles.container}>
            {/* Divider */}
            <hr style={styles.divider} />

            {/* Footer Content */}
            <div style={styles.content}>
                {/* Left: Hospital Info */}
                <div style={styles.leftSection}>
                    <p style={styles.hospitalName}>{hospitalProfile?.name || 'Hospital'}</p>
                    {showRegistration && hospitalProfile?.registration_number && (
                        <p style={styles.regNumber}>Reg. No: {hospitalProfile.registration_number}</p>
                    )}
                </div>

                {/* Center: Disclaimer */}
                <div style={styles.centerSection}>
                    {disclaimer && (
                        <p style={styles.disclaimer}>{disclaimer}</p>
                    )}
                    {showTimestamp && (
                        <p style={styles.timestamp}>Printed on: {formatDate()}</p>
                    )}
                </div>

                {/* Right: Website & Page Number */}
                <div style={styles.rightSection}>
                    {showWebsite && hospitalProfile?.website && (
                        <p style={styles.website}>{hospitalProfile.website}</p>
                    )}
                    {showPageNumber && (
                        <p style={styles.pageNumber}>Page 1 of 1</p>
                    )}
                </div>
            </div>

            {/* Accreditations Row (if any) */}
            {(hospitalProfile?.nabh_accreditation || hospitalProfile?.lab_nabl_number) && (
                <div style={styles.accreditationsRow}>
                    {hospitalProfile?.nabh_accreditation && (
                        <span style={styles.accreditation}>NABH Accredited</span>
                    )}
                    {hospitalProfile?.lab_nabl_number && (
                        <span style={styles.accreditation}>NABL: {hospitalProfile.lab_nabl_number}</span>
                    )}
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        marginTop: 'auto',
        paddingTop: '20px',
        fontFamily: 'Arial, sans-serif',
        fontSize: '0.75rem',
        color: '#666'
    },
    divider: {
        margin: '0 0 10px 0',
        border: 'none',
        borderTop: '1px solid #ccc'
    },
    content: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '20px'
    },
    leftSection: {
        flex: '1',
        textAlign: 'left'
    },
    centerSection: {
        flex: '2',
        textAlign: 'center'
    },
    rightSection: {
        flex: '1',
        textAlign: 'right'
    },
    hospitalName: {
        margin: '0',
        fontWeight: 'bold',
        color: '#333'
    },
    regNumber: {
        margin: '2px 0 0 0',
        fontSize: '0.7rem'
    },
    disclaimer: {
        margin: '0',
        fontStyle: 'italic',
        fontSize: '0.7rem'
    },
    timestamp: {
        margin: '3px 0 0 0',
        fontSize: '0.7rem'
    },
    website: {
        margin: '0',
        color: '#0066cc'
    },
    pageNumber: {
        margin: '3px 0 0 0'
    },
    accreditationsRow: {
        marginTop: '8px',
        paddingTop: '8px',
        borderTop: '1px dashed #ddd',
        textAlign: 'center'
    },
    accreditation: {
        display: 'inline-block',
        margin: '0 10px',
        padding: '2px 8px',
        backgroundColor: '#e8f5e9',
        color: '#2e7d32',
        fontSize: '0.65rem',
        borderRadius: '3px'
    }
};

export default HospitalPrintFooter;
