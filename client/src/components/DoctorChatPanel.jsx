/**
 * Doctor Chat Panel Component
 * 
 * Sidebar panel for doctor dashboard showing patient message threads
 * Supports real-time messaging via Socket.IO
 */

import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../config';

const DoctorChatPanel = ({ doctorId, onSelectThread }) => {
    const [threads, setThreads] = useState([]);
    const [selectedThread, setSelectedThread] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [quickReplies, setQuickReplies] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showQuickReplies, setShowQuickReplies] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (doctorId) {
            fetchThreads();
            fetchQuickReplies();
            fetchUnreadCount();
        }
    }, [doctorId]);

    useEffect(() => {
        if (selectedThread) {
            fetchMessages(selectedThread.id);
        }
    }, [selectedThread]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchThreads = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/api/chat/threads?doctor_id=${doctorId}`);
            const data = await res.json();
            setThreads(data.threads || []);
        } catch (err) {
            console.error('Failed to fetch threads:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (threadId) => {
        try {
            const res = await fetch(`${API_BASE}/api/chat/threads/${threadId}`);
            const data = await res.json();
            setMessages(data.messages || []);
            
            // Mark as read
            await fetch(`${API_BASE}/api/chat/read`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ thread_id: threadId, reader_type: 'doctor' })
            });
            fetchUnreadCount();
        } catch (err) {
            console.error('Failed to fetch messages:', err);
        }
    };

    const fetchQuickReplies = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/chat/quick-replies?doctor_id=${doctorId}`);
            const data = await res.json();
            setQuickReplies(data.quick_replies || []);
        } catch (err) {
            console.error('Failed to fetch quick replies:', err);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/chat/unread?doctor_id=${doctorId}`);
            const data = await res.json();
            setUnreadCount(parseInt(data.total_unread) || 0);
        } catch (err) {
            console.error('Failed to fetch unread count:', err);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedThread) return;
        
        try {
            const res = await fetch(`${API_BASE}/api/chat/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    thread_id: selectedThread.id,
                    content: newMessage,
                    sender_type: 'doctor',
                    sender_id: doctorId
                })
            });
            
            if (res.ok) {
                const data = await res.json();
                setMessages(prev => [...prev, data.message]);
                setNewMessage('');
                fetchThreads(); // Refresh thread list
            }
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    };

    const handleQuickReply = (text) => {
        setNewMessage(text);
        setShowQuickReplies(false);
    };

    const handleCloseThread = async () => {
        if (!selectedThread) return;
        if (!window.confirm('Close this conversation?')) return;
        
        try {
            await fetch(`${API_BASE}/api/chat/threads/${selectedThread.id}/close`, {
                method: 'PUT'
            });
            setSelectedThread(null);
            setMessages([]);
            fetchThreads();
        } catch (err) {
            console.error('Failed to close thread:', err);
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return date.toLocaleDateString('en-US', { weekday: 'short' });
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>💬</span>
                    <span style={{ fontWeight: '600', color: '#fff' }}>Messages</span>
                    {unreadCount > 0 && (
                        <span style={styles.unreadBadge}>{unreadCount}</span>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Thread List */}
                <div style={styles.threadList}>
                    {loading ? (
                        <div style={styles.emptyState}>Loading...</div>
                    ) : threads.length === 0 ? (
                        <div style={styles.emptyState}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
                            <div>No messages yet</div>
                        </div>
                    ) : (
                        threads.map(thread => (
                            <div 
                                key={thread.id}
                                onClick={() => setSelectedThread(thread)}
                                style={{
                                    ...styles.threadItem,
                                    backgroundColor: selectedThread?.id === thread.id ? '#3a3a4d' : 'transparent'
                                }}
                            >
                                <div style={styles.threadAvatar}>
                                    {thread.patient_name?.charAt(0) || '?'}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                        <span style={{ fontWeight: '500', color: '#fff', fontSize: '14px' }}>
                                            {thread.patient_name}
                                        </span>
                                        <span style={{ fontSize: '11px', color: '#666' }}>
                                            {formatTime(thread.last_message_at)}
                                        </span>
                                    </div>
                                    <div style={styles.lastMessage}>
                                        {thread.last_message || 'No messages yet'}
                                    </div>
                                </div>
                                {thread.unread_doctor > 0 && (
                                    <span style={styles.threadUnread}>{thread.unread_doctor}</span>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Chat Area */}
                {selectedThread ? (
                    <div style={styles.chatArea}>
                        {/* Chat Header */}
                        <div style={styles.chatHeader}>
                            <div>
                                <div style={{ fontWeight: '600', color: '#fff' }}>
                                    {selectedThread.patient_name}
                                </div>
                                <div style={{ fontSize: '12px', color: '#888' }}>
                                    {selectedThread.patient_phone}
                                </div>
                            </div>
                            <button onClick={handleCloseThread} style={styles.closeButton}>
                                ✕ Close
                            </button>
                        </div>

                        {/* Messages */}
                        <div style={styles.messagesContainer}>
                            {messages.map((msg, idx) => (
                                <div 
                                    key={msg.id || idx}
                                    style={{
                                        ...styles.message,
                                        alignSelf: msg.sender_type === 'doctor' ? 'flex-end' : 'flex-start',
                                        backgroundColor: msg.sender_type === 'doctor' ? '#14b8a6' : '#3a3a4d'
                                    }}
                                >
                                    <div style={{ wordBreak: 'break-word' }}>{msg.content}</div>
                                    <div style={styles.messageTime}>
                                        {formatTime(msg.created_at)}
                                        {msg.sender_type === 'doctor' && msg.is_read && ' ✓✓'}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick Replies */}
                        {showQuickReplies && (
                            <div style={styles.quickRepliesContainer}>
                                {quickReplies.map((qr, idx) => (
                                    <button 
                                        key={qr.id || idx}
                                        onClick={() => handleQuickReply(qr.text)}
                                        style={styles.quickReplyButton}
                                    >
                                        {qr.text.length > 40 ? qr.text.substring(0, 40) + '...' : qr.text}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Input Area */}
                        <div style={styles.inputArea}>
                            <button 
                                onClick={() => setShowQuickReplies(!showQuickReplies)}
                                style={styles.quickReplyToggle}
                                title="Quick Replies"
                            >
                                ⚡
                            </button>
                            <input 
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Type a message..."
                                style={styles.input}
                            />
                            <button onClick={handleSendMessage} style={styles.sendButton}>
                                Send
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={styles.noChatSelected}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
                        <div style={{ color: '#888' }}>Select a conversation</div>
                    </div>
                )}
            </div>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '500px',
        backgroundColor: '#1e1e2f',
        borderRadius: '12px',
        overflow: 'hidden'
    },
    header: {
        padding: '16px',
        borderBottom: '1px solid #3a3a4d',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    unreadBadge: {
        backgroundColor: '#ef4444',
        color: '#fff',
        padding: '2px 8px',
        borderRadius: '10px',
        fontSize: '12px',
        fontWeight: '600'
    },
    threadList: {
        width: '280px',
        borderRight: '1px solid #3a3a4d',
        overflowY: 'auto'
    },
    threadItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        cursor: 'pointer',
        borderBottom: '1px solid #2a2a3d',
        transition: 'background-color 0.2s'
    },
    threadAvatar: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: '#14b8a6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: '600',
        fontSize: '16px'
    },
    lastMessage: {
        fontSize: '13px',
        color: '#888',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
    },
    threadUnread: {
        backgroundColor: '#14b8a6',
        color: '#fff',
        padding: '2px 8px',
        borderRadius: '10px',
        fontSize: '11px',
        fontWeight: '600'
    },
    chatArea: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
    },
    chatHeader: {
        padding: '12px 16px',
        borderBottom: '1px solid #3a3a4d',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    closeButton: {
        padding: '6px 12px',
        backgroundColor: '#3a3a4d',
        border: 'none',
        borderRadius: '6px',
        color: '#888',
        cursor: 'pointer',
        fontSize: '12px'
    },
    messagesContainer: {
        flex: 1,
        padding: '16px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    message: {
        maxWidth: '70%',
        padding: '10px 14px',
        borderRadius: '12px',
        color: '#fff',
        fontSize: '14px'
    },
    messageTime: {
        fontSize: '10px',
        color: 'rgba(255,255,255,0.6)',
        marginTop: '4px',
        textAlign: 'right'
    },
    quickRepliesContainer: {
        padding: '8px 16px',
        borderTop: '1px solid #3a3a4d',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        maxHeight: '120px',
        overflowY: 'auto'
    },
    quickReplyButton: {
        padding: '6px 12px',
        backgroundColor: '#3a3a4d',
        border: 'none',
        borderRadius: '16px',
        color: '#14b8a6',
        cursor: 'pointer',
        fontSize: '12px'
    },
    inputArea: {
        display: 'flex',
        gap: '8px',
        padding: '12px 16px',
        borderTop: '1px solid #3a3a4d'
    },
    quickReplyToggle: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: '#3a3a4d',
        border: 'none',
        color: '#14b8a6',
        cursor: 'pointer',
        fontSize: '18px'
    },
    input: {
        flex: 1,
        padding: '10px 16px',
        backgroundColor: '#2a2a3d',
        border: '1px solid #3a3a4d',
        borderRadius: '20px',
        color: '#fff',
        fontSize: '14px'
    },
    sendButton: {
        padding: '10px 20px',
        backgroundColor: '#14b8a6',
        border: 'none',
        borderRadius: '20px',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
    },
    noChatSelected: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
    },
    emptyState: {
        padding: '40px 20px',
        textAlign: 'center',
        color: '#888'
    }
};

export default DoctorChatPanel;
