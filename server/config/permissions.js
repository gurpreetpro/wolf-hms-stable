// Define granular permissions
const PERMISSIONS = {
    // Clinical
    VIEW_PATIENT: 'clinical:view_patient',
    EDIT_PATIENT: 'clinical:edit_patient',
    PRESCRIBE_MEDS: 'clinical:prescribe',
    VIEW_VIP_RECORD: 'clinical:view_vip', // Sensitive
    
    // Financial
    VIEW_FINANCE_DASHBOARD: 'finance:view_dashboard',
    PROCESS_REFUND: 'finance:process_refund', // Sensitive
    APPROVE_CLAIM: 'finance:approve_claim',
    
    // Admin
    MANAGE_USERS: 'admin:manage_users',
    VIEW_AUDIT_LOGS: 'admin:view_audit_logs'
};

// Define Default Role -> Permission Mappings
const ROLE_PERMISSIONS = {
    'admin': [
        PERMISSIONS.VIEW_PATIENT, PERMISSIONS.EDIT_PATIENT, 
        PERMISSIONS.VIEW_FINANCE_DASHBOARD, PERMISSIONS.PROCESS_REFUND, PERMISSIONS.APPROVE_CLAIM, 
        PERMISSIONS.MANAGE_USERS, PERMISSIONS.VIEW_AUDIT_LOGS
    ],
    'doctor': [
        PERMISSIONS.VIEW_PATIENT, PERMISSIONS.EDIT_PATIENT, PERMISSIONS.PRESCRIBE_MEDS
    ],
    'nurse': [
        PERMISSIONS.VIEW_PATIENT, PERMISSIONS.EDIT_PATIENT
    ],
    'accountant': [
        PERMISSIONS.VIEW_FINANCE_DASHBOARD, PERMISSIONS.APPROVE_CLAIM
    ]
};

module.exports = { PERMISSIONS, ROLE_PERMISSIONS };
