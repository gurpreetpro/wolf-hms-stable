import React from 'react';
import useHospitalProfile from '../../hooks/useHospitalProfile';

/**
 * HospitalPrintHeader - Standardized header component for all print documents
 * 
 * Props:
 * @param {string} title - Document title (e.g., "Registration Receipt", "Prescription")
 * @param {boolean} compact - If true, shows a smaller, more compact header
 * @param {boolean} showContact - Whether to show contact info (phone, email, website)
 * @param {boolean} showAddress - Whether to show full address
 * @param {string} subtitle - Optional subtitle below the title
 */
const HospitalPrintHeader = ({ 
    title = '', 
    compact = false, 
    showContact = true, 
    showAddress = true,
    subtitle = ''
}) => {
    const { hospitalProfile, getFormattedAddress, getContactString } = useHospitalProfile();

    if (compact) {
        return (
            <div className="hospital-print-header hospital-print-header--compact" style={compactStyles.container}>
                <div style={compactStyles.row}>
                    {hospitalProfile?.logo_url && (
                        <img 
                            src={hospitalProfile.logo_url} 
                            alt="Logo" 
                            style={compactStyles.logo}
                        />
                    )}
                    <div style={compactStyles.info}>
                        <h3 style={compactStyles.name}>{hospitalProfile?.name || 'Hospital'}</h3>
                        {showAddress && (
                            <p style={compactStyles.address}>{getFormattedAddress()}</p>
                        )}
                    </div>
                </div>
                {title && (
                    <div style={compactStyles.titleBar}>
                        <strong>{title}</strong>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="hospital-print-header" style={styles.container}>
            {/* Header Row: Logo | Hospital Info | Contact */}
            <div style={styles.headerRow}>
                {/* Logo */}
                <div style={styles.logoSection}>
                    {hospitalProfile?.logo_url ? (
                        <img 
                            src={hospitalProfile.logo_url} 
                            alt="Hospital Logo" 
                            style={styles.logo}
                        />
                    ) : (
                        <div style={styles.logoPlaceholder}>🏥</div>
                    )}
                </div>

                {/* Hospital Name & Tagline */}
                <div style={styles.infoSection}>
                    <h2 style={styles.hospitalName}>{hospitalProfile?.name || 'Hospital Name'}</h2>
                    {hospitalProfile?.tagline && (
                        <p style={styles.tagline}>{hospitalProfile.tagline}</p>
                    )}
                    {showAddress && (
                        <p style={styles.address}>{getFormattedAddress()}</p>
                    )}
                </div>

                {/* Contact Info */}
                {showContact && (
                    <div style={styles.contactSection}>
                        {hospitalProfile?.phone && (
                            <p style={styles.contactItem}>📞 {hospitalProfile.phone}</p>
                        )}
                        {hospitalProfile?.email && (
                            <p style={styles.contactItem}>✉️ {hospitalProfile.email}</p>
                        )}
                        {hospitalProfile?.website && (
                            <p style={styles.contactItem}>🌐 {hospitalProfile.website}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Document Title Bar */}
            {title && (
                <div style={styles.titleBar}>
                    <h3 style={styles.title}>{title}</h3>
                    {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
                </div>
            )}

            {/* Divider */}
            <hr style={styles.divider} />
        </div>
    );
};

// Full header styles
const styles = {
    container: {
        marginBottom: '20px',
        fontFamily: 'Arial, sans-serif'
    },
    headerRow: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '20px',
        padding: '10px 0'
    },
    logoSection: {
        flex: '0 0 80px'
    },
    logo: {
        maxHeight: '60px',
        maxWidth: '80px',
        objectFit: 'contain'
    },
    logoPlaceholder: {
        fontSize: '48px',
        lineHeight: 1
    },
    infoSection: {
        flex: '1',
        textAlign: 'center'
    },
    hospitalName: {
        margin: '0 0 5px 0',
        fontSize: '1.5rem',
        fontWeight: 'bold',
        color: '#1a365d'
    },
    tagline: {
        margin: '0 0 5px 0',
        fontSize: '0.9rem',
        fontStyle: 'italic',
        color: '#666'
    },
    address: {
        margin: '0',
        fontSize: '0.85rem',
        color: '#444'
    },
    contactSection: {
        flex: '0 0 200px',
        textAlign: 'right',
        fontSize: '0.8rem'
    },
    contactItem: {
        margin: '2px 0',
        color: '#444'
    },
    titleBar: {
        backgroundColor: '#f8f9fa',
        padding: '10px 15px',
        marginTop: '15px',
        borderRadius: '4px',
        textAlign: 'center'
    },
    title: {
        margin: '0',
        fontSize: '1.1rem',
        fontWeight: 'bold',
        color: '#333',
        textTransform: 'uppercase',
        letterSpacing: '1px'
    },
    subtitle: {
        margin: '5px 0 0 0',
        fontSize: '0.85rem',
        color: '#666'
    },
    divider: {
        margin: '15px 0',
        border: 'none',
        borderTop: '2px solid #e2e8f0'
    }
};

// Compact header styles
const compactStyles = {
    container: {
        marginBottom: '10px',
        fontFamily: 'Arial, sans-serif'
    },
    row: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    },
    logo: {
        maxHeight: '40px',
        maxWidth: '40px',
        objectFit: 'contain'
    },
    info: {
        flex: 1
    },
    name: {
        margin: '0',
        fontSize: '1rem',
        fontWeight: 'bold'
    },
    address: {
        margin: '2px 0 0 0',
        fontSize: '0.75rem',
        color: '#666'
    },
    titleBar: {
        backgroundColor: '#f0f0f0',
        padding: '5px 10px',
        marginTop: '8px',
        textAlign: 'center',
        fontSize: '0.85rem',
        borderRadius: '3px'
    }
};

export default HospitalPrintHeader;
