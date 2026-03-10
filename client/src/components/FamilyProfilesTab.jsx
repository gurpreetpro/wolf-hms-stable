/**
 * Family Profiles Tab Component
 * 
 * Tab component for viewing/managing family members within PatientProfileModal
 * Supports Wolf Care patient app family management
 */

import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

const FamilyProfilesTab = ({ patientId, patientName }) => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [relationships, setRelationships] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        relationship: 'spouse',
        date_of_birth: '',
        gender: '',
        blood_group: '',
        allergies: '',
        notes: ''
    });

    useEffect(() => {
        if (patientId) {
            fetchFamilyMembers();
            fetchRelationships();
        }
    }, [patientId]);

    const fetchFamilyMembers = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/api/family/admin/all?patient_id=${patientId}`);
            const data = await res.json();
            setMembers(data.members || []);
        } catch (err) {
            console.error('Failed to fetch family members:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRelationships = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/family/relationships`);
            const data = await res.json();
            setRelationships(data.relationships || []);
        } catch (err) {
            console.error('Failed to fetch relationships:', err);
        }
    };

    const handleAddMember = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/family/add`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Patient-ID': patientId
                },
                body: JSON.stringify({
                    ...formData,
                    allergies: formData.allergies ? formData.allergies.split(',').map(a => a.trim()) : []
                })
            });
            
            if (res.ok) {
                setShowAddModal(false);
                setFormData({
                    name: '', phone: '', relationship: 'spouse',
                    date_of_birth: '', gender: '', blood_group: '', allergies: '', notes: ''
                });
                fetchFamilyMembers();
            }
        } catch (err) {
            console.error('Failed to add family member:', err);
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (!window.confirm('Are you sure you want to remove this family member?')) return;
        
        try {
            const res = await fetch(`${API_BASE}/api/family/${memberId}`, {
                method: 'DELETE',
                headers: { 'X-Patient-ID': patientId }
            });
            
            if (res.ok) {
                fetchFamilyMembers();
            }
        } catch (err) {
            console.error('Failed to remove family member:', err);
        }
    };

    const getRelationshipIcon = (relationship) => {
        const rel = relationships.find(r => r.code === relationship);
        return rel?.icon || '👤';
    };

    const getRelationshipLabel = (relationship) => {
        const rel = relationships.find(r => r.code === relationship);
        return rel?.label || relationship;
    };

    const calculateAge = (dob) => {
        if (!dob) return null;
        const today = new Date();
        const birthDate = new Date(dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    return (
        <div style={{ padding: '16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h5 style={{ margin: 0, color: '#fff' }}>👨‍👩‍👧‍👦 Family Members</h5>
                    <small style={{ color: '#888' }}>Linked to: {patientName}</small>
                </div>
                <button 
                    onClick={() => setShowAddModal(true)}
                    style={styles.addButton}
                >
                    + Add Member
                </button>
            </div>

            {/* Members List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                    Loading...
                </div>
            ) : members.length === 0 ? (
                <div style={styles.emptyState}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>👨‍👩‍👧‍👦</div>
                    <h4 style={{ color: '#fff', margin: '0 0 8px' }}>No Family Members</h4>
                    <p style={{ color: '#888', margin: 0 }}>Add family members to enable proxy booking</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {members.map(member => (
                        <div key={member.id} style={styles.memberCard}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                <div style={styles.iconCircle}>
                                    {getRelationshipIcon(member.relationship)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: '600', color: '#fff', fontSize: '16px' }}>
                                            {member.name}
                                        </span>
                                        <span style={styles.relationshipBadge}>
                                            {getRelationshipLabel(member.relationship)}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', color: '#888', fontSize: '13px' }}>
                                        {member.phone && <span>📞 {member.phone}</span>}
                                        {member.blood_group && <span>🩸 {member.blood_group}</span>}
                                        {member.date_of_birth && (
                                            <span>👤 Age: {calculateAge(member.date_of_birth)}</span>
                                        )}
                                        {member.gender && <span>⚧️ {member.gender}</span>}
                                    </div>
                                    {member.allergies && member.allergies.length > 0 && (
                                        <div style={{ marginTop: '8px' }}>
                                            <span style={{ color: '#f59e0b', fontSize: '12px' }}>
                                                ⚠️ Allergies: {member.allergies.join(', ')}
                                            </span>
                                        </div>
                                    )}
                                    {member.linked_patient_id ? (
                                        <div style={styles.linkedBadge}>
                                            ✅ Linked to UHID: {member.linked_uhid}
                                        </div>
                                    ) : (
                                        <div style={styles.notLinkedBadge}>
                                            ⚠️ No patient record linked
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {!member.linked_patient_id && (
                                        <button 
                                            onClick={() => { setSelectedMember(member); setShowLinkModal(true); }}
                                            style={styles.linkButton}
                                        >
                                            🔗 Link
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => handleRemoveMember(member.id)}
                                        style={styles.removeButton}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Member Modal */}
            {showAddModal && (
                <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={{ margin: 0, color: '#fff' }}>+ Add Family Member</h3>
                            <button onClick={() => setShowAddModal(false)} style={styles.closeButton}>×</button>
                        </div>
                        <div style={styles.modalBody}>
                            <div style={styles.formGrid}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Name *</label>
                                    <input 
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        style={styles.input}
                                        placeholder="Full name"
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Relationship *</label>
                                    <select 
                                        value={formData.relationship}
                                        onChange={(e) => setFormData({...formData, relationship: e.target.value})}
                                        style={styles.input}
                                    >
                                        {relationships.map(r => (
                                            <option key={r.code} value={r.code}>{r.icon} {r.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Phone</label>
                                    <input 
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                        style={styles.input}
                                        placeholder="+91 98765 43210"
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Date of Birth</label>
                                    <input 
                                        type="date"
                                        value={formData.date_of_birth}
                                        onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                                        style={styles.input}
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Gender</label>
                                    <select 
                                        value={formData.gender}
                                        onChange={(e) => setFormData({...formData, gender: e.target.value})}
                                        style={styles.input}
                                    >
                                        <option value="">Select</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Blood Group</label>
                                    <select 
                                        value={formData.blood_group}
                                        onChange={(e) => setFormData({...formData, blood_group: e.target.value})}
                                        style={styles.input}
                                    >
                                        <option value="">Select</option>
                                        <option value="A+">A+</option>
                                        <option value="A-">A-</option>
                                        <option value="B+">B+</option>
                                        <option value="B-">B-</option>
                                        <option value="AB+">AB+</option>
                                        <option value="AB-">AB-</option>
                                        <option value="O+">O+</option>
                                        <option value="O-">O-</option>
                                    </select>
                                </div>
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Allergies (comma-separated)</label>
                                <input 
                                    type="text"
                                    value={formData.allergies}
                                    onChange={(e) => setFormData({...formData, allergies: e.target.value})}
                                    style={styles.input}
                                    placeholder="e.g., Penicillin, Peanuts"
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Notes</label>
                                <textarea 
                                    value={formData.notes}
                                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                    style={{...styles.input, minHeight: '80px', resize: 'vertical'}}
                                    placeholder="Any additional notes..."
                                />
                            </div>
                        </div>
                        <div style={styles.modalFooter}>
                            <button onClick={() => setShowAddModal(false)} style={styles.cancelButton}>Cancel</button>
                            <button onClick={handleAddMember} style={styles.saveButton}>Add Member</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Link Patient Modal */}
            {showLinkModal && selectedMember && (
                <div style={styles.modalOverlay} onClick={() => setShowLinkModal(false)}>
                    <div style={{...styles.modal, maxWidth: '400px'}} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={{ margin: 0, color: '#fff' }}>🔗 Link Patient Record</h3>
                            <button onClick={() => setShowLinkModal(false)} style={styles.closeButton}>×</button>
                        </div>
                        <div style={styles.modalBody}>
                            <p style={{ color: '#888', marginBottom: '16px' }}>
                                Link <strong style={{ color: '#fff' }}>{selectedMember.name}</strong> to an existing patient record.
                            </p>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Patient UHID</label>
                                <input 
                                    type="text"
                                    id="linkUhid"
                                    style={styles.input}
                                    placeholder="Enter UHID (e.g., P-001234)"
                                />
                            </div>
                            <div style={{ 
                                padding: '12px', 
                                backgroundColor: 'rgba(14, 165, 233, 0.1)', 
                                borderRadius: '8px',
                                marginTop: '12px'
                            }}>
                                <small style={{ color: '#0ea5e9' }}>
                                    💡 Once linked, the primary patient can view appointments, lab results, and prescriptions for this family member.
                                </small>
                            </div>
                        </div>
                        <div style={styles.modalFooter}>
                            <button onClick={() => setShowLinkModal(false)} style={styles.cancelButton}>Cancel</button>
                            <button 
                                onClick={async () => {
                                    const uhid = document.getElementById('linkUhid')?.value;
                                    if (!uhid) return alert('Please enter UHID');
                                    try {
                                        const res = await fetch(`${API_BASE}/api/family/${selectedMember.id}/link`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', 'X-Patient-ID': patientId },
                                            body: JSON.stringify({ uhid })
                                        });
                                        if (res.ok) {
                                            setShowLinkModal(false);
                                            fetchFamilyMembers();
                                        }
                                    } catch (err) {
                                        console.error('Link failed:', err);
                                    }
                                }} 
                                style={styles.saveButton}
                            >
                                Link Record
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    addButton: {
        padding: '8px 16px',
        backgroundColor: '#14b8a6',
        border: 'none',
        borderRadius: '8px',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
    },
    emptyState: {
        textAlign: 'center',
        padding: '60px 20px',
        backgroundColor: '#2a2a3d',
        borderRadius: '12px'
    },
    memberCard: {
        backgroundColor: '#2a2a3d',
        borderRadius: '12px',
        padding: '16px'
    },
    iconCircle: {
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        backgroundColor: '#3a3a4d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px'
    },
    relationshipBadge: {
        padding: '2px 8px',
        backgroundColor: '#3a3a4d',
        borderRadius: '4px',
        fontSize: '11px',
        color: '#14b8a6',
        textTransform: 'capitalize'
    },
    linkedBadge: {
        marginTop: '8px',
        padding: '4px 8px',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#10b981',
        display: 'inline-block'
    },
    notLinkedBadge: {
        marginTop: '8px',
        padding: '4px 8px',
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#f59e0b',
        display: 'inline-block'
    },
    linkButton: {
        padding: '6px 12px',
        backgroundColor: '#0ea5e9',
        border: 'none',
        borderRadius: '6px',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '12px'
    },
    removeButton: {
        padding: '6px 10px',
        backgroundColor: '#ef4444',
        border: 'none',
        borderRadius: '6px',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '12px'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
    },
    modal: {
        backgroundColor: '#2a2a3d',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto'
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px',
        borderBottom: '1px solid #3a3a4d'
    },
    closeButton: {
        background: 'none',
        border: 'none',
        color: '#888',
        fontSize: '28px',
        cursor: 'pointer'
    },
    modalBody: {
        padding: '20px'
    },
    modalFooter: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
        padding: '16px 20px',
        borderTop: '1px solid #3a3a4d'
    },
    formGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px',
        marginBottom: '16px'
    },
    formGroup: {
        marginBottom: '12px'
    },
    label: {
        display: 'block',
        color: '#888',
        marginBottom: '6px',
        fontSize: '13px'
    },
    input: {
        width: '100%',
        padding: '10px 12px',
        backgroundColor: '#1e1e2f',
        border: '1px solid #3a3a4d',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '14px'
    },
    cancelButton: {
        padding: '10px 20px',
        backgroundColor: '#3a3a4d',
        border: 'none',
        borderRadius: '8px',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '14px'
    },
    saveButton: {
        padding: '10px 20px',
        backgroundColor: '#14b8a6',
        border: 'none',
        borderRadius: '8px',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
    }
};

export default FamilyProfilesTab;
