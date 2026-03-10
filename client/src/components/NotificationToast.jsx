import React, { useState, useEffect, useCallback } from 'react';
import { Toast, ToastContainer, Badge } from 'react-bootstrap';
import { Bell, Pill, FlaskConical, Activity, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { io } from '../utils/socket-stub';

/**
 * NotificationToast - Real-time notification system for Wolf HMS
 * 
 * Listens to Socket.IO events and displays toast notifications for:
 * - New medication orders
 * - Lab order updates
 * - Clinical alerts
 * - Order acknowledgments
 * - Emergency broadcasts
 */

const NOTIFICATION_TYPES = {
    medication_ordered: { icon: Pill, bg: 'primary', title: 'New Medication Order' },
    lab_ordered: { icon: FlaskConical, bg: 'info', title: 'New Lab Order' },
    vitals_requested: { icon: Activity, bg: 'success', title: 'Vital Check Requested' },
    task_acknowledged: { icon: CheckCircle, bg: 'success', title: 'Order Acknowledged' },
    clinical_alert: { icon: AlertTriangle, bg: 'danger', title: 'Clinical Alert' },
    emergency_broadcast: { icon: AlertTriangle, bg: 'danger', title: '🚨 EMERGENCY' },
    pharmacy_update: { icon: Pill, bg: 'warning', title: 'Pharmacy Update' },
    lab_update: { icon: FlaskConical, bg: 'info', title: 'Lab Update' },
    opd_update: { icon: Bell, bg: 'secondary', title: 'OPD Update' },
};

const NotificationToast = ({ maxNotifications = 5, autoDismiss = 8000 }) => {
    const [notifications, setNotifications] = useState([]);

    // Add notification helper
    const addNotification = useCallback((type, data) => {
        const config = NOTIFICATION_TYPES[type] || { icon: Bell, bg: 'secondary', title: 'Notification' };
        const notification = {
            id: Date.now() + Math.random(),
            type,
            config,
            data,
            timestamp: new Date(),
        };

        setNotifications(prev => {
            const updated = [notification, ...prev];
            // Keep only last N notifications
            return updated.slice(0, maxNotifications);
        });

        // Play notification sound for important alerts
        if (type === 'emergency_broadcast' || type === 'clinical_alert') {
            try {
                const audio = new Audio('/notification.mp3');
                audio.volume = 0.5;
                audio.play().catch(() => { /* Ignore audio play errors */ });
            } catch {
                // Ignore audio errors
            }
        }
    }, [maxNotifications]);

    // Remove notification
    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    // Connect to socket and setup listeners
    useEffect(() => {
        const socketInstance = io();

        // Listen to all clinical events
        socketInstance.on('clinical_update', (data) => {
            if (data.type) {
                addNotification(data.type, data);
            }
        });

        socketInstance.on('pharmacy_update', (data) => {
            addNotification('pharmacy_update', data);
        });

        socketInstance.on('lab_update', (data) => {
            addNotification('lab_update', data);
        });

        socketInstance.on('opd_update', (data) => {
            addNotification('opd_update', data);
        });

        socketInstance.on('emergency_broadcast', (data) => {
            addNotification('emergency_broadcast', data);
        });

        socketInstance.on('order_acknowledged', (data) => {
            addNotification('task_acknowledged', data);
        });

        socketInstance.on('clinical_alert', (data) => {
            addNotification('clinical_alert', data);
        });

        return () => {
            socketInstance.off('clinical_update');
            socketInstance.off('pharmacy_update');
            socketInstance.off('lab_update');
            socketInstance.off('opd_update');
            socketInstance.off('emergency_broadcast');
            socketInstance.off('order_acknowledged');
            socketInstance.off('clinical_alert');
        };
    }, [addNotification]);

    // Auto-dismiss notifications
    useEffect(() => {
        if (autoDismiss && notifications.length > 0) {
            const timer = setTimeout(() => {
                setNotifications(prev => prev.slice(0, -1));
            }, autoDismiss);
            return () => clearTimeout(timer);
        }
    }, [notifications, autoDismiss]);

    // Format message based on notification data
    const formatMessage = (notification) => {
        const { type, data } = notification;
        
        switch (type) {
            case 'medication_ordered':
                return `New medication order for ${data.patient_name || 'patient'}`;
            case 'lab_ordered':
                return `Lab test ordered for ${data.patient_name || 'patient'}`;
            case 'vitals_requested':
                return `Vital check requested for ${data.patient_name || 'patient'}`;
            case 'task_acknowledged':
                return `Order acknowledged by ${data.acknowledged_by || 'nurse'}`;
            case 'clinical_alert':
                return data.message || 'Clinical alert triggered';
            case 'emergency_broadcast':
                return data.message || 'Emergency code activated!';
            case 'pharmacy_update':
                return 'Prescription update received';
            case 'lab_update':
                return 'Lab result available';
            default:
                return data.message || 'New notification';
        }
    };

    if (notifications.length === 0) return null;

    return (
        <ToastContainer 
            position="top-end" 
            className="p-3" 
            style={{ zIndex: 9999, position: 'fixed', top: '60px', right: '10px' }}
        >
            {notifications.map((notification) => {
                const Icon = notification.config.icon;
                return (
                    <Toast 
                        key={notification.id}
                        onClose={() => removeNotification(notification.id)}
                        bg={notification.config.bg}
                        className="mb-2"
                        style={{ minWidth: '300px' }}
                    >
                        <Toast.Header closeButton>
                            <Icon size={16} className="me-2" />
                            <strong className="me-auto">{notification.config.title}</strong>
                            <small className="text-muted">
                                {notification.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </small>
                        </Toast.Header>
                        <Toast.Body className={notification.config.bg === 'danger' || notification.config.bg === 'primary' ? 'text-white' : ''}>
                            {formatMessage(notification)}
                        </Toast.Body>
                    </Toast>
                );
            })}
        </ToastContainer>
    );
};

export default NotificationToast;
