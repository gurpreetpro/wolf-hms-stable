import React, { useState, useEffect } from 'react';

const SECURITY_QUESTIONS = [
    "What is the name of your first pet?",
    "What is your mother's maiden name?",
    "What was the name of your first school?",
    "What city were you born in?",
    "What is your favorite movie?",
    "What was your childhood nickname?",
    "What is the name of your favorite childhood friend?",
    "What was your favorite food as a child?",
    "What is the middle name of your oldest sibling?",
    "What was the first concert you attended?"
];

/**
 * Security Settings Component
 * Allows users to view/update their security questions & answers
 * Can be embedded in any dashboard's settings section
 */
const SecuritySettings = ({ userId, onUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showForm, setShowForm] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');

    const [questions, setQuestions] = useState({
        question1: '',
        answer1: '',
        question2: '',
        answer2: '',
        question3: '',
        answer3: ''
    });

    const handleQuestionChange = (field, value) => {
        setQuestions(prev => ({ ...prev, [field]: value }));
        setMessage({ type: '', text: '' });
    };

    const validateQuestions = () => {
        const selectedQuestions = [questions.question1, questions.question2, questions.question3];
        const uniqueQuestions = new Set(selectedQuestions.filter(q => q));

        if (uniqueQuestions.size < 3) {
            setMessage({ type: 'error', text: 'Please select 3 different questions' });
            return false;
        }

        if (!questions.answer1 || !questions.answer2 || !questions.answer3) {
            setMessage({ type: 'error', text: 'All answers are required' });
            return false;
        }

        if (!currentPassword) {
            setMessage({ type: 'error', text: 'Current password is required for security updates' });
            return false;
        }

        return true;
    };

    const handleSave = async () => {
        if (!validateQuestions()) return;

        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await fetch('/api/auth/update-security', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    currentPassword,
                    securityQuestion1: questions.question1,
                    securityAnswer1: questions.answer1,
                    securityQuestion2: questions.question2,
                    securityAnswer2: questions.answer2,
                    securityQuestion3: questions.question3,
                    securityAnswer3: questions.answer3
                })
            });

            const data = await response.json();

            if (response.ok) {
                setMessage({ type: 'success', text: 'Security questions updated successfully!' });
                setShowForm(false);
                setCurrentPassword('');
                if (onUpdate) onUpdate();
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to update security questions' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Network error. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    const getAvailableQuestions = (excludeIndex) => {
        const selected = [questions.question1, questions.question2, questions.question3];
        return SECURITY_QUESTIONS.filter((q, i) =>
            !selected.includes(q) || selected[excludeIndex] === q
        );
    };

    return (
        <div style={{
            background: 'var(--card-bg, #1e293b)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            border: '1px solid var(--border-color, rgba(255,255,255,0.1))'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px'
            }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    🔐 Security Questions
                </h3>
                <button
                    onClick={() => setShowForm(!showForm)}
                    style={{
                        background: showForm ? '#64748b' : '#3b82f6',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                    }}
                >
                    {showForm ? 'Cancel' : 'Update Questions'}
                </button>
            </div>

            <p style={{
                opacity: 0.7,
                fontSize: '0.9rem',
                marginBottom: showForm ? '20px' : 0
            }}>
                Security questions are used to recover your account if you forget your password.
            </p>

            {message.text && (
                <div style={{
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '15px',
                    background: message.type === 'error' ? '#ef444420' : '#10b98120',
                    color: message.type === 'error' ? '#ef4444' : '#10b981',
                    border: `1px solid ${message.type === 'error' ? '#ef4444' : '#10b981'}`
                }}>
                    {message.type === 'error' ? '⚠️' : '✅'} {message.text}
                </div>
            )}

            {showForm && (
                <div>
                    {/* Current Password */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                            Current Password (Required)
                        </label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter your current password"
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(0,0,0,0.2)',
                                color: 'inherit',
                                fontSize: '1rem'
                            }}
                        />
                    </div>

                    {/* Question 1 */}
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', opacity: 0.8 }}>
                            Question 1
                        </label>
                        <select
                            value={questions.question1}
                            onChange={(e) => handleQuestionChange('question1', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(0,0,0,0.2)',
                                color: 'inherit',
                                fontSize: '1rem',
                                marginBottom: '8px'
                            }}
                        >
                            <option value="">Select a question...</option>
                            {getAvailableQuestions(0).map((q, i) => (
                                <option key={i} value={q}>{q}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            value={questions.answer1}
                            onChange={(e) => handleQuestionChange('answer1', e.target.value)}
                            placeholder="Your answer"
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(0,0,0,0.2)',
                                color: 'inherit',
                                fontSize: '1rem'
                            }}
                        />
                    </div>

                    {/* Question 2 */}
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', opacity: 0.8 }}>
                            Question 2
                        </label>
                        <select
                            value={questions.question2}
                            onChange={(e) => handleQuestionChange('question2', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(0,0,0,0.2)',
                                color: 'inherit',
                                fontSize: '1rem',
                                marginBottom: '8px'
                            }}
                        >
                            <option value="">Select a question...</option>
                            {getAvailableQuestions(1).map((q, i) => (
                                <option key={i} value={q}>{q}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            value={questions.answer2}
                            onChange={(e) => handleQuestionChange('answer2', e.target.value)}
                            placeholder="Your answer"
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(0,0,0,0.2)',
                                color: 'inherit',
                                fontSize: '1rem'
                            }}
                        />
                    </div>

                    {/* Question 3 */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', opacity: 0.8 }}>
                            Question 3
                        </label>
                        <select
                            value={questions.question3}
                            onChange={(e) => handleQuestionChange('question3', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(0,0,0,0.2)',
                                color: 'inherit',
                                fontSize: '1rem',
                                marginBottom: '8px'
                            }}
                        >
                            <option value="">Select a question...</option>
                            {getAvailableQuestions(2).map((q, i) => (
                                <option key={i} value={q}>{q}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            value={questions.answer3}
                            onChange={(e) => handleQuestionChange('answer3', e.target.value)}
                            placeholder="Your answer"
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(0,0,0,0.2)',
                                color: 'inherit',
                                fontSize: '1rem'
                            }}
                        />
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: saving ? '#64748b' : 'linear-gradient(90deg, #10b981, #059669)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            cursor: saving ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {saving ? '⏳ Saving...' : '💾 Save Security Questions'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default SecuritySettings;
