import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, User, Clock, Check, X, Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { COLORS, FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import rosterService, { Staff, ShiftSchedule, AssignShiftInput } from '../../services/rosterService';
import admissionService from '../../services/admissionService';

interface Props {
  navigation?: any;
}

const SHIFTS = ['morning', 'afternoon', 'night'] as const;
const SHIFT_TIMES = {
  morning: '6:00 AM - 2:00 PM',
  afternoon: '2:00 PM - 10:00 PM',
  night: '10:00 PM - 6:00 AM',
};
const SHIFT_COLORS = {
  morning: COLORS.warning,
  afternoon: COLORS.primary,
  night: COLORS.secondary,
};

export const StaffRosterScreen: React.FC<Props> = ({ navigation }) => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [nurses, setNurses] = useState<Staff[]>([]);
  const [roster, setRoster] = useState<ShiftSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  
  // Assign form
  const [selectedNurse, setSelectedNurse] = useState<Staff | null>(null);
  const [selectedShift, setSelectedShift] = useState<typeof SHIFTS[number]>('morning');

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const [staffData, nurseData, wards] = await Promise.all([
        rosterService.getStaffOnDuty(),
        rosterService.getAllNurses(),
        admissionService.getWards(),
      ]);
      setStaff(staffData);
      setNurses(nurseData);
      
      if (wards.length > 0) {
        const rosterData = await rosterService.getShiftRoster(wards[0].id, dateStr);
        setRoster(rosterData);
      }
    } catch (error) {
      console.error('Failed to load roster data:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const handleAssignShift = async () => {
    if (!selectedNurse) {
      Alert.alert('Required', 'Please select a nurse');
      return;
    }
    try {
      const wards = await admissionService.getWards();
      if (wards.length === 0) {
        Alert.alert('Error', 'No wards available');
        return;
      }

      const data: AssignShiftInput = {
        staff_id: selectedNurse.id,
        ward_id: wards[0].id,
        shift: selectedShift,
        date: selectedDate.toISOString().split('T')[0],
      };
      await rosterService.assignShift(data);
      Alert.alert('Success', 'Shift assigned successfully');
      setAssignModalVisible(false);
      setSelectedNurse(null);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to assign shift');
    }
  };

  const currentShift = rosterService.getCurrentShift();

  const getShiftStaff = (shift: string) => {
    return roster.filter(r => r.shift === shift);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#1e293b']} style={StyleSheet.absoluteFill} />
      <BackgroundOrb color={COLORS.warning} position="top-left" />
      
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Staff Roster</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setAssignModalVisible(true)}>
            <Plus size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Current Shift Banner */}
        <GlassCard style={styles.shiftBanner}>
          <Clock size={20} color={COLORS.warning} />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.shiftName}>{currentShift.name}</Text>
            <Text style={styles.shiftTime}>{currentShift.start} - {currentShift.end}</Text>
          </View>
          <View style={styles.onDutyBadge}>
            <Text style={styles.onDutyCount}>{staff.length}</Text>
            <Text style={styles.onDutyLabel}>On Duty</Text>
          </View>
        </GlassCard>

        {/* Date Selector */}
        <View style={styles.dateSelector}>
          <TouchableOpacity onPress={() => changeDate(-1)}>
            <ChevronLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.dateCenter}>
            <Calendar size={16} color={COLORS.primary} />
            <Text style={styles.dateText}>{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
          </View>
          <TouchableOpacity onPress={() => changeDate(1)}>
            <ChevronRight size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {/* Shifts Overview */}
          {SHIFTS.map((shift) => {
            const shiftStaff = getShiftStaff(shift);
            return (
              <GlassCard key={shift} style={styles.shiftCard}>
                <View style={styles.shiftHeader}>
                  <View style={[styles.shiftDot, { backgroundColor: SHIFT_COLORS[shift] }]} />
                  <Text style={styles.shiftTitle}>{shift.charAt(0).toUpperCase() + shift.slice(1)} Shift</Text>
                  <Text style={styles.shiftHours}>{SHIFT_TIMES[shift]}</Text>
                </View>
                
                {shiftStaff.length === 0 ? (
                  <Text style={styles.noStaff}>No staff assigned</Text>
                ) : (
                  <View style={styles.staffList}>
                    {shiftStaff.map((s, idx) => (
                      <View key={s.id || idx} style={styles.staffItem}>
                        <View style={[styles.staffAvatar, { backgroundColor: SHIFT_COLORS[shift] }]}>
                          <Text style={styles.staffInitial}>{s.staff_name?.charAt(0) || '?'}</Text>
                        </View>
                        <Text style={styles.staffName}>{s.staff_name || 'Staff'}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </GlassCard>
            );
          })}

          {/* On Duty Staff */}
          <Text style={styles.sectionTitle}>Currently On Duty</Text>
          {loading ? (
            <Text style={styles.loadingText}>Loading staff...</Text>
          ) : staff.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Users size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No staff on duty</Text>
            </GlassCard>
          ) : (
            staff.map((s) => (
              <GlassCard key={s.id} style={styles.staffCard}>
                <View style={[styles.staffAvatar, { backgroundColor: COLORS.success }]}>
                  <Text style={styles.staffInitial}>{s.name?.charAt(0) || '?'}</Text>
                </View>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffNameLarge}>{s.name}</Text>
                  <Text style={styles.staffRole}>{s.role}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: s.status === 'active' ? COLORS.success + '20' : COLORS.warning + '20' }]}>
                  <Text style={[styles.statusText, { color: s.status === 'active' ? COLORS.success : COLORS.warning }]}>{s.status || 'Active'}</Text>
                </View>
              </GlassCard>
            ))
          )}
        </ScrollView>

        {/* Assign Shift Modal */}
        <Modal visible={assignModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Assign Shift</Text>
                <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Select Nurse</Text>
              <ScrollView style={{ maxHeight: 200 }}>
                {nurses.map((n) => (
                  <TouchableOpacity 
                    key={n.id} 
                    style={[styles.nurseItem, selectedNurse?.id === n.id && styles.nurseSelected]}
                    onPress={() => setSelectedNurse(n)}
                  >
                    <User size={18} color={selectedNurse?.id === n.id ? '#fff' : COLORS.text} />
                    <Text style={[styles.nurseName, selectedNurse?.id === n.id && { color: '#fff' }]}>{n.name}</Text>
                    {selectedNurse?.id === n.id && <Check size={18} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.label, { marginTop: SPACING.m }]}>Select Shift</Text>
              <View style={styles.shiftRow}>
                {SHIFTS.map((s) => (
                  <TouchableOpacity 
                    key={s} 
                    style={[styles.shiftBtn, selectedShift === s && { backgroundColor: SHIFT_COLORS[s] }]}
                    onPress={() => setSelectedShift(s)}
                  >
                    <Text style={[styles.shiftBtnText, selectedShift === s && { color: '#fff' }]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleAssignShift}>
                <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.submitGradient}>
                  <Check size={20} color="#fff" />
                  <Text style={styles.submitText}>Assign Shift</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.m, paddingVertical: SPACING.s },
  backBtn: { fontFamily: FONTS.medium, color: COLORS.primary, fontSize: 16 },
  title: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 20 },
  addBtn: { padding: 8, backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  shiftBanner: { flexDirection: 'row', alignItems: 'center', padding: SPACING.m, marginHorizontal: SPACING.m, marginBottom: SPACING.m },
  shiftName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16 },
  shiftTime: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12 },
  onDutyBadge: { marginLeft: 'auto', alignItems: 'center', backgroundColor: COLORS.success + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  onDutyCount: { fontFamily: FONTS.bold, color: COLORS.success, fontSize: 20 },
  onDutyLabel: { fontFamily: FONTS.regular, color: COLORS.success, fontSize: 10 },
  dateSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.m, marginBottom: SPACING.m },
  dateCenter: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginLeft: 8 },
  shiftCard: { padding: SPACING.m, marginBottom: SPACING.m },
  shiftHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.s },
  shiftDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  shiftTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15, flex: 1 },
  shiftHours: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11 },
  noStaff: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 13, fontStyle: 'italic' },
  staffList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  staffItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20 },
  staffAvatar: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  staffInitial: { fontFamily: FONTS.bold, color: '#fff', fontSize: 10 },
  staffName: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 12, marginLeft: 6 },
  sectionTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginTop: SPACING.m, marginBottom: SPACING.m },
  loadingText: { color: COLORS.textSecondary, textAlign: 'center' },
  emptyCard: { padding: SPACING.xl, alignItems: 'center' },
  emptyText: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginTop: SPACING.m },
  staffCard: { flexDirection: 'row', alignItems: 'center', padding: SPACING.m, marginBottom: SPACING.s },
  staffInfo: { marginLeft: 12, flex: 1 },
  staffNameLarge: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  staffRole: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontFamily: FONTS.bold, fontSize: 11, textTransform: 'capitalize' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.m, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m },
  modalTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 20 },
  label: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 13, marginBottom: 6 },
  nurseItem: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: COLORS.surface, borderRadius: 10, marginBottom: 6 },
  nurseSelected: { backgroundColor: COLORS.primary },
  nurseName: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 14, flex: 1, marginLeft: 10 },
  shiftRow: { flexDirection: 'row', marginBottom: SPACING.m },
  shiftBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.surface, marginHorizontal: 4, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  shiftBtnText: { fontFamily: FONTS.medium, color: COLORS.textMuted, fontSize: 13 },
  submitBtn: { marginTop: SPACING.m },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, padding: 16 },
  submitText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 16, marginLeft: 8 },
});

export default StaffRosterScreen;
