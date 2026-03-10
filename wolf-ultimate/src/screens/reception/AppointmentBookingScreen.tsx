import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, CalendarDays, Clock, CheckCircle2, User, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

interface SlotItem {
  id: number; time: string; status: 'AVAILABLE' | 'BOOKED' | 'BLOCKED';
  patient_name?: string; type?: string;
}

const DOCTORS = [
  { id: 1, name: 'Dr. Sharma', department: 'Cardiology', slots_available: 4 },
  { id: 2, name: 'Dr. Patel', department: 'Medicine', slots_available: 6 },
  { id: 3, name: 'Dr. Reddy', department: 'Orthopedics', slots_available: 3 },
  { id: 4, name: 'Dr. Khan', department: 'Gynecology', slots_available: 5 },
  { id: 5, name: 'Dr. Singh', department: 'ENT', slots_available: 8 },
];

const generateSlots = (): SlotItem[] => [
  { id: 1, time: '09:00 AM', status: 'BOOKED', patient_name: 'Rakesh Kumar', type: 'Follow-up' },
  { id: 2, time: '09:15 AM', status: 'BOOKED', patient_name: 'Anita Devi', type: 'New' },
  { id: 3, time: '09:30 AM', status: 'AVAILABLE' },
  { id: 4, time: '09:45 AM', status: 'AVAILABLE' },
  { id: 5, time: '10:00 AM', status: 'BLOCKED' },
  { id: 6, time: '10:15 AM', status: 'AVAILABLE' },
  { id: 7, time: '10:30 AM', status: 'BOOKED', patient_name: 'Mohan Lal', type: 'Scheduled' },
  { id: 8, time: '10:45 AM', status: 'AVAILABLE' },
  { id: 9, time: '11:00 AM', status: 'AVAILABLE' },
  { id: 10, time: '11:15 AM', status: 'BOOKED', patient_name: 'Priya Nair', type: 'Follow-up' },
  { id: 11, time: '11:30 AM', status: 'AVAILABLE' },
  { id: 12, time: '11:45 AM', status: 'AVAILABLE' },
];

const SLOT_CFG: Record<string, { color: string; label: string }> = {
  AVAILABLE: { color: '#10b981', label: 'Available' },
  BOOKED: { color: '#3b82f6', label: 'Booked' },
  BLOCKED: { color: '#64748b', label: 'Blocked' },
};

export const AppointmentBookingScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [selectedDoctor, setSelectedDoctor] = useState(DOCTORS[0]);
  const [slots] = useState(generateSlots());
  const [selectedSlot, setSelectedSlot] = useState<SlotItem | null>(null);
  const [patientName, setPatientName] = useState('');
  const [dateLabel] = useState('Today, 5 Mar 2026');

  const available = slots.filter(s => s.status === 'AVAILABLE').length;
  const booked = slots.filter(s => s.status === 'BOOKED').length;

  const handleBook = () => {
    if (!selectedSlot || !patientName.trim()) {
      Alert.alert('Required', 'Select a slot and enter patient name.'); return;
    }
    Alert.alert('Confirm Booking', `Book ${selectedSlot.time} with ${selectedDoctor.name} for ${patientName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Book', onPress: () => { Alert.alert('✅ Booked', `Appointment confirmed at ${selectedSlot.time}`); setSelectedSlot(null); setPatientName(''); }},
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Book Appointment</Text>
            <Text style={styles.headerSub}>{dateLabel}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 120 }}>
          {/* Date Nav */}
          <View style={styles.dateNav}>
            <TouchableOpacity style={styles.dateArrow}><ChevronLeft size={20} color={COLORS.textMuted} /></TouchableOpacity>
            <View style={styles.dateCenter}>
              <CalendarDays size={18} color={COLORS.primary} />
              <Text style={styles.dateText}>{dateLabel}</Text>
            </View>
            <TouchableOpacity style={styles.dateArrow}><ChevronRight size={20} color={COLORS.textMuted} /></TouchableOpacity>
          </View>

          {/* Doctor Selector */}
          <Text style={styles.secTitle}>Select Doctor</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.m }}>
            {DOCTORS.map(doc => (
              <TouchableOpacity key={doc.id} style={[styles.docChip, selectedDoctor.id === doc.id && styles.docChipActive]} onPress={() => setSelectedDoctor(doc)}>
                <Text style={[styles.docName, selectedDoctor.id === doc.id && styles.docNameActive]}>{doc.name}</Text>
                <Text style={[styles.docDept, selectedDoctor.id === doc.id && styles.docDeptActive]}>{doc.department} • {doc.slots_available} slots</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Slot Summary */}
          <View style={styles.slotSummary}>
            <View style={styles.slotSumItem}><View style={[styles.slotDot, { backgroundColor: '#10b981' }]} /><Text style={styles.slotSumText}>{available} Available</Text></View>
            <View style={styles.slotSumItem}><View style={[styles.slotDot, { backgroundColor: '#3b82f6' }]} /><Text style={styles.slotSumText}>{booked} Booked</Text></View>
          </View>

          {/* Slot Grid */}
          <Text style={styles.secTitle}>Time Slots</Text>
          <View style={styles.slotGrid}>
            {slots.map(slot => {
              const cfg = SLOT_CFG[slot.status];
              const isSelected = selectedSlot?.id === slot.id;
              return (
                <TouchableOpacity
                  key={slot.id}
                  style={[styles.slotCard, { borderColor: isSelected ? COLORS.primary : cfg.color + '40' }, isSelected && { backgroundColor: COLORS.primary + '15' }]}
                  onPress={() => slot.status === 'AVAILABLE' && setSelectedSlot(slot)}
                  disabled={slot.status !== 'AVAILABLE'}
                >
                  <Text style={[styles.slotTime, { color: slot.status === 'AVAILABLE' ? COLORS.text : COLORS.textMuted }]}>{slot.time}</Text>
                  {slot.status === 'BOOKED' && <Text style={styles.slotPatient}>{slot.patient_name}</Text>}
                  {slot.status === 'AVAILABLE' && isSelected && <CheckCircle2 size={14} color={COLORS.primary} />}
                  {slot.status === 'BLOCKED' && <Text style={styles.slotBlocked}>Blocked</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Booking Form */}
          {selectedSlot && (
            <GlassCard style={styles.bookForm}>
              <Text style={styles.bookTitle}>📋 Book {selectedSlot.time} — {selectedDoctor.name}</Text>
              <View style={styles.bookField}>
                <User size={16} color={COLORS.textMuted} />
                <TextInput style={styles.bookInput} placeholder="Patient Name / UHID" placeholderTextColor={COLORS.textMuted} value={patientName} onChangeText={setPatientName} />
              </View>
              <TouchableOpacity style={styles.bookBtn} onPress={handleBook}>
                <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.bookGrad}>
                  <CalendarDays size={18} color="#fff" /><Text style={styles.bookBtnText}>Confirm Booking</Text>
                </LinearGradient>
              </TouchableOpacity>
            </GlassCard>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const getStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SPACING.m, paddingVertical: SPACING.s, marginTop: SPACING.m },
  backBtn: { padding: 10, backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  headerTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 22 },
  headerSub: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.l },
  dateArrow: { padding: 8, backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  dateCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateText: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16 },
  secTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginBottom: SPACING.s },
  docChip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginRight: 10 },
  docChipActive: { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary },
  docName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 13 },
  docNameActive: { color: COLORS.primary },
  docDept: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  docDeptActive: { color: COLORS.primary },
  slotSummary: { flexDirection: 'row', gap: 16, marginBottom: SPACING.m },
  slotSumItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  slotDot: { width: 8, height: 8, borderRadius: 4 },
  slotSumText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.l },
  slotCard: { width: '31%' as any, padding: 10, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', backgroundColor: COLORS.surface },
  slotTime: { fontFamily: FONTS.bold, fontSize: 12 },
  slotPatient: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 9, marginTop: 2 },
  slotBlocked: { fontFamily: FONTS.medium, color: '#64748b', fontSize: 9, marginTop: 2 },
  bookForm: { padding: SPACING.m, borderWidth: 0, marginTop: SPACING.s },
  bookTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15, marginBottom: 12 },
  bookField: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14 },
  bookInput: { flex: 1, fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14 },
  bookBtn: { borderRadius: 16, overflow: 'hidden' },
  bookGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16 },
  bookBtnText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 14 },
});
