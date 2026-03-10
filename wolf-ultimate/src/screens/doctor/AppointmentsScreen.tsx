import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Clock, User, Phone, Video, Check, X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { COLORS, FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import appointmentService, { Appointment } from '../../services/appointmentService';

interface Props {
  route?: { params?: { doctorId?: string } };
  navigation?: any;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const AppointmentsScreen: React.FC<Props> = ({ route, navigation }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, [selectedDate]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const data = await appointmentService.getAppointments(dateStr, dateStr);
      setAppointments(data);
    } catch (error) {
      console.error('Failed to load appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const handleStatusUpdate = async (status: Appointment['status']) => {
    if (!selectedAppointment) return;
    try {
      await appointmentService.updateStatus(selectedAppointment.id, status);
      Alert.alert('Success', 'Appointment status updated');
      setModalVisible(false);
      loadAppointments();
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return COLORS.success;
      case 'in_progress': return COLORS.warning;
      case 'arrived': return COLORS.primary;
      case 'cancelled': case 'no_show': return COLORS.error;
      default: return COLORS.textMuted;
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = Number.parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${minutes} ${ampm}`;
  };

  const getWeekDays = () => {
    const days = [];
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay());
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };



  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#111827']} style={StyleSheet.absoluteFill} />
      <BackgroundOrb color={COLORS.info || COLORS.primary} position="top-right" />
            <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backButton}>
            <ChevronLeft size={24} color={COLORS.primary} />
            {/* <Text style={styles.backText}>Back</Text> - Design often just has icon or simple text, removing text for cleaner look if preferred, or keeping it. Screenshot had "Back" text? actually screenshot has "Back" with arrow. Keeping it. */}
             <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Appointments</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Month Selector */}
        <View style={styles.monthSelector}>
            <TouchableOpacity onPress={() => changeDate(-7)}>
                <ChevronLeft size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.headerSubtitle}>
                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity onPress={() => changeDate(7)}>
                <ChevronRight size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
        </View>

        {/* Week Calendar Strip */}
        <View style={styles.calendarStrip}>
          <View style={styles.weekRow}>
          {getWeekDays().map((date) => (
            <TouchableOpacity 
              key={date.toISOString()} 
              style={[
                styles.dayBtn, 
                isSelected(date) && styles.dayBtnSelected,
              ]} 
              onPress={() => setSelectedDate(date)}
            >
              <Text style={[styles.dayName, isSelected(date) && styles.dayTextSelected]}>
                {DAYS[date.getDay()]}
              </Text>
              <Text style={[styles.dayNumber, isSelected(date) && styles.dayTextSelected]}>
                {date.getDate()}
              </Text>
            </TouchableOpacity>
          ))}
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          <Text style={styles.sectionTitle}>
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>

          {loading ? (
            <Text style={styles.loadingText}>Loading appointments...</Text>
          ) : appointments.length === 0 ? (
            <View style={styles.emptyContainer}>
                <GlassCard style={styles.emptyCard} intensity={40}>
                    <Calendar size={48} color={COLORS.textMuted} strokeWidth={1.5} />
                    <Text style={styles.emptyTitle}>No appointments</Text>
                    <Text style={styles.emptySubtext}>No appointments scheduled for this day</Text>
                </GlassCard>
            </View>
          ) : (
            appointments.map((apt) => (
              <TouchableOpacity key={apt.id} onPress={() => { setSelectedAppointment(apt); setModalVisible(true); }}>
                <GlassCard style={styles.aptCard}>
                  <View style={styles.aptTimeCol}>
                    <Text style={styles.aptTime}>{formatTime(apt.appointment_time)}</Text>
                    <Text style={styles.aptDuration}>{apt.duration_minutes || 15} min</Text>
                  </View>
                  <View style={styles.aptDivider} />
                  <View style={styles.aptDetails}>
                    <View style={styles.aptRow}>
                      <Text style={styles.aptPatient}>{apt.patient_name}</Text>
                      {apt.consultation_type === 'video' && (
                        <Video size={16} color={COLORS.primary} style={{ marginLeft: 8 }} />
                      )}
                    </View>
                    <Text style={styles.aptReason}>{apt.reason || 'Consultation'}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(apt.status) + '30' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(apt.status) }]}>
                        {apt.status.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Appointment Detail Modal */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Appointment Details</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              {selectedAppointment && (
                <ScrollView>
                  <View style={styles.detailRow}>
                    <User size={20} color={COLORS.textMuted} />
                    <View style={{ marginLeft: SPACING.m }}>
                      <Text style={styles.detailLabel}>Patient</Text>
                      <Text style={styles.detailValue}>{selectedAppointment.patient_name}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Clock size={20} color={COLORS.textMuted} />
                    <View style={{ marginLeft: SPACING.m }}>
                      <Text style={styles.detailLabel}>Time</Text>
                      <Text style={styles.detailValue}>
                        {selectedAppointment.appointment_date} at {formatTime(selectedAppointment.appointment_time)}
                      </Text>
                    </View>
                  </View>

                  {selectedAppointment.patient_phone && (
                    <View style={styles.detailRow}>
                      <Phone size={20} color={COLORS.textMuted} />
                      <View style={{ marginLeft: SPACING.m }}>
                        <Text style={styles.detailLabel}>Phone</Text>
                        <Text style={styles.detailValue}>{selectedAppointment.patient_phone}</Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <Video size={20} color={COLORS.textMuted} />
                    <View style={{ marginLeft: SPACING.m }}>
                      <Text style={styles.detailLabel}>Type</Text>
                      <Text style={styles.detailValue}>{selectedAppointment.consultation_type}</Text>
                    </View>
                  </View>

                  <Text style={[styles.label, { marginTop: SPACING.l }]}>Quick Actions</Text>
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.primary + '20' }]} onPress={() => handleStatusUpdate('arrived')}>
                      <Check size={18} color={COLORS.primary} />
                      <Text style={[styles.actionText, { color: COLORS.primary }]}>Mark Arrived</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.warning + '20' }]} onPress={() => handleStatusUpdate('in_progress')}>
                      <Clock size={18} color={COLORS.warning} />
                      <Text style={[styles.actionText, { color: COLORS.warning }]}>Start</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success + '20' }]} onPress={() => handleStatusUpdate('completed')}>
                      <Check size={18} color={COLORS.success} />
                      <Text style={[styles.actionText, { color: COLORS.success }]}>Complete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.error + '20' }]} onPress={() => handleStatusUpdate('cancelled')}>
                      <X size={18} color={COLORS.error} />
                      <Text style={[styles.actionText, { color: COLORS.error }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: SPACING.m, 
    paddingVertical: SPACING.s,
    marginTop: SPACING.s
  },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  backText: { fontFamily: FONTS.medium, color: COLORS.primary, fontSize: 16, marginLeft: 4 },
  headerTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18 },
  headerSubtitle: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 16 },
  
  monthSelector: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.l,
      marginBottom: SPACING.s
  },
  
  // Calendar Strip
  calendarStrip: { 
      paddingVertical: SPACING.m, 
  },
  weekRow: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      paddingHorizontal: SPACING.m
  },
  dayBtn: { 
      alignItems: 'center', 
      justifyContent: 'center',
      width: 44,
      height: 64, 
      borderRadius: 12, // More grounded rect look
      backgroundColor: 'transparent'
  },
  dayBtnSelected: { 
      backgroundColor: COLORS.primary,
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4
  },
  dayName: { fontFamily: FONTS.medium, color: COLORS.textMuted, fontSize: 12, marginBottom: 4 },
  dayNumber: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18 },
  dayTextSelected: { color: '#fff' },
  
  sectionTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginBottom: SPACING.m, marginTop: SPACING.s },
  loadingText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 40 },
  
  // Empty State
  emptyContainer: { alignItems: 'center', marginTop: 20 },
  emptyCard: { 
      padding: 40, 
      alignItems: 'center', 
      borderRadius: 24, 
      width: '100%' 
  },
  emptyTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginTop: 16 },
  emptySubtext: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 14, marginTop: 8, textAlign: 'center' },
  
  aptCard: { flexDirection: 'row', padding: SPACING.m, marginBottom: SPACING.m },
  aptTimeCol: { width: 70, alignItems: 'center' },
  aptTime: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  aptDuration: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11 },
  aptDivider: { width: 2, backgroundColor: COLORS.border, marginHorizontal: SPACING.m, borderRadius: 1 },
  aptDetails: { flex: 1 },
  aptRow: { flexDirection: 'row', alignItems: 'center' },
  aptPatient: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16 },
  aptReason: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 8 },
  statusText: { fontFamily: FONTS.medium, fontSize: 11, textTransform: 'capitalize' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.m, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m },
  modalTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 20 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.m, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12 },
  detailValue: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  label: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 13, marginBottom: SPACING.s },
  actionRow: { flexDirection: 'row', marginBottom: SPACING.s },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, marginHorizontal: 4 },
  actionText: { fontFamily: FONTS.medium, fontSize: 13, marginLeft: 6 },
});

export default AppointmentsScreen;
