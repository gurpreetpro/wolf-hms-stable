/**
 * Notification Service — Local + Push notification handling
 * Handles clinical alerts, missed medications, and critical lab results.
 */
import { Platform, Alert } from 'react-native';

export interface ClinicalNotification {
  id: string;
  title: string;
  body: string;
  type: 'critical_vital' | 'medication' | 'lab_result' | 'deterioration' | 'allergy' | 'general';
  severity: 'critical' | 'warning' | 'info';
  patientId?: string;
  data?: Record<string, string>;
  timestamp: number;
}

class NotificationService {
  private listeners: Set<(notification: ClinicalNotification) => void> = new Set();
  private notificationHistory: ClinicalNotification[] = [];
  private readonly MAX_HISTORY = 100;

  /**
   * Show an in-app alert for critical notifications
   */
  showCriticalAlert(notification: ClinicalNotification): void {
    const severityEmoji = notification.severity === 'critical' ? '🚨' :
                          notification.severity === 'warning' ? '⚠️' : 'ℹ️';

    Alert.alert(
      `${severityEmoji} ${notification.title}`,
      notification.body,
      [
        { text: 'Dismiss', style: 'cancel' },
        { text: 'View Details', onPress: () => this._handleNotificationPress(notification) },
      ],
      { cancelable: false }
    );
  }

  /**
   * Process an incoming notification (from WebSocket or push)
   */
  handleIncoming(notification: ClinicalNotification): void {
    // Store in history
    this.notificationHistory.unshift(notification);
    if (this.notificationHistory.length > this.MAX_HISTORY) {
      this.notificationHistory = this.notificationHistory.slice(0, this.MAX_HISTORY);
    }

    // Notify listeners
    this.listeners.forEach(listener => {
      try { listener(notification); } catch (e) { console.error('Notification listener error:', e); }
    });

    // Show alert for critical/warning notifications
    if (notification.severity === 'critical') {
      this.showCriticalAlert(notification);
    }
  }

  /**
   * Subscribe to incoming notifications
   */
  subscribe(handler: (notification: ClinicalNotification) => void): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  /**
   * Get notification history
   */
  getHistory(): ClinicalNotification[] {
    return [...this.notificationHistory];
  }

  /**
   * Get unread count by severity
   */
  getCountBySeverity(): { critical: number; warning: number; info: number; total: number } {
    const critical = this.notificationHistory.filter(n => n.severity === 'critical').length;
    const warning = this.notificationHistory.filter(n => n.severity === 'warning').length;
    const info = this.notificationHistory.filter(n => n.severity === 'info').length;
    return { critical, warning, info, total: critical + warning + info };
  }

  /**
   * Clear notification history
   */
  clearHistory(): void {
    this.notificationHistory = [];
  }

  private _handleNotificationPress(notification: ClinicalNotification): void {
    // In production, this would navigate to the relevant screen
    // For now, just emit to listeners
    this.listeners.forEach(listener => {
      try { listener({ ...notification, type: 'general', data: { ...notification.data, action: 'pressed' } }); }
      catch (e) { /* silent */ }
    });
  }
}

// Singleton
const notificationService = new NotificationService();
export default notificationService;
