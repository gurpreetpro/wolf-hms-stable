import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Activity, Heart, Thermometer, Wind, Droplets, Check, X, AlertTriangle, TrendingUp } from 'lucide-react-native';
import { COLORS, FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import vitalsService, { Vital, VitalInput } from '../../services/vitalsService';

interface Props {
  route?: { params?: { admissionId?: string; patientId?: string; patientName?: string; bedNumber?: string } };
  navigation?: any;
}

const VitalField = ({ label, value, onChange, unit, icon: Icon, color, placeholder }: any) => (
  <View style={styles.fieldWrapper}>
    <View style={styles.fieldHeader}>
      <Icon size={16} color={color} />
      <Text style={styles.fieldLabel}>{label}</Text>
    </View>
    <View style={styles.fieldInputWrap}>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
      />
      <Text style={styles.fieldUnit}>{unit}</Text>
    </View>
  </View>
);

export const VitalsScreen: React.FC<Props> = ({ route, navigation }) => {
  const admissionId = route?.params?.admissionId;
  const patientId = route?.params?.patientId;
  const patientName = route?.params?.patientName || 'Patient';
  const bedNumber = route?.params?.bedNumber;

  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Vital[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Form state
  const [bpSystolic, setBpSystolic] = useState('');
  const [bpDiastolic, setBpDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [temp, setTemp] = useState('');
  const [spo2, setSpo2] = useState('');
  const [respRate, setRespRate] = useState('');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (admissionId) {
      loadHistory();
    }
  }, [admissionId]);

  const loadHistory = async () => {
    if (!admissionId) return;
    try {
      const data = await vitalsService.getVitalsHistory(admissionId);
      setHistory(data);
    } catch (error) {
      console.error('Failed to load vitals history:', error);
    }
  };

  const resetForm = () => {
    setBpSystolic('');
    setBpDiastolic('');
    setPulse('');
    setTemp('');
    setSpo2('');
    setRespRate('');
    setWeight('');
    setNotes('');
  };

  const submitVitals = async () => {
    if (!bpSystolic || !bpDiastolic || !pulse || !temp || !spo2) {
      Alert.alert('Required Fields', 'Please fill in BP, Pulse, Temp, and SpO2');
      return;
    }

    setLoading(true);
    try {
      const data: VitalInput = {
        admission_id: admissionId!,
        patient_id: patientId!,
        bp_systolic: parseInt(bpSystolic),
        bp_diastolic: parseInt(bpDiastolic),
        pulse: parseInt(pulse),
        temp: parseFloat(temp),
        spo2: parseInt(spo2),
        resp_rate: respRate ? parseInt(respRate) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
        notes,
      };

      await vitalsService.recordVitals(data);
      Alert.alert('Success', 'Vitals recorded successfully');
      setModalVisible(false);
      resetForm();
      loadHistory();
    } catch (error) {
      Alert.alert('Error', 'Failed to record vitals');
    } finally {
      setLoading(false);
    }
  };

  const formatBP = (vital: any) => {
    if (vital.blood_pressure_systolic && vital.blood_pressure_diastolic) {
      return `${vital.blood_pressure_systolic}/${vital.blood_pressure_diastolic}`;
    }
    return vital.bp || '-';
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#111827']} style={StyleSheet.absoluteFill} />
      <BackgroundOrb color={COLORS.success} position="top-right" />
      
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Vitals</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Activity size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{patientName}</Text>
          {bedNumber && <Text style={styles.bedNumber}>Bed {bedNumber}</Text>}
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {/* Latest Vitals Card */}
          {history.length > 0 && (
            <GlassCard style={styles.latestCard}>
              <Text style={styles.latestTitle}>Latest Recording</Text>
              <Text style={styles.latestTime}>{new Date(history[0].recorded_at).toLocaleString()}</Text>
              
              <View style={styles.vitalsGrid}>
                <View style={styles.vitalItem}>
                  <Heart size={18} color={COLORS.error} />
                  <Text style={styles.vitalValue}>{formatBP(history[0])}</Text>
                  <Text style={styles.vitalLabel}>BP</Text>
                </View>
                <View style={styles.vitalItem}>
                  <Activity size={18} color={COLORS.warning} />
                  <Text style={styles.vitalValue}>{history[0].pulse_rate || '-'}</Text>
                  <Text style={styles.vitalLabel}>Pulse</Text>
                </View>
                <View style={styles.vitalItem}>
                  <Thermometer size={18} color={COLORS.primary} />
                  <Text style={styles.vitalValue}>{history[0].temperature || '-'}°</Text>
                  <Text style={styles.vitalLabel}>Temp</Text>
                </View>
                <View style={styles.vitalItem}>
                  <Droplets size={18} color={COLORS.info || COLORS.primary} />
                  <Text style={styles.vitalValue}>{history[0].spo2 || '-'}%</Text>
                  <Text style={styles.vitalLabel}>SpO2</Text>
                </View>
              </View>
            </GlassCard>
          )}

          {/* History */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>History</Text>
            <TouchableOpacity onPress={loadHistory}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {history.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Activity size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No vitals recorded</Text>
              <Text style={styles.emptySubtext}>Tap the + button to record vitals</Text>
            </GlassCard>
          ) : (
            history.slice(1).map((vital, idx) => {
              const { abnormal, alerts } = vitalsService.isAbnormal(vital);
              return (
                <GlassCard key={vital.id || idx} style={[styles.historyCard, abnormal && styles.abnormalCard]}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyTime}>{new Date(vital.recorded_at).toLocaleString()}</Text>
                    {abnormal && (
                      <View style={styles.alertBadge}>
                        <AlertTriangle size={12} color={COLORS.error} />
                        <Text style={styles.alertText}>{alerts[0]}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.historyRow}>
                    <Text style={styles.historyValue}>BP: {formatBP(vital)}</Text>
                    <Text style={styles.historyValue}>P: {vital.pulse_rate}</Text>
                    <Text style={styles.historyValue}>T: {vital.temperature}°</Text>
                    <Text style={styles.historyValue}>SpO2: {vital.spo2}%</Text>
                  </View>
                </GlassCard>
              );
            })
          )}
        </ScrollView>

        {/* Record Vitals Modal */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Record Vitals</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <X size={24} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ flex: 1 }}>
                  <View style={styles.bpRow}>
                    <VitalField 
                      label="Systolic" 
                      value={bpSystolic} 
                      onChange={setBpSystolic} 
                      unit="mmHg" 
                      icon={Heart} 
                      color={COLORS.error}
                      placeholder="120"
                    />
                    <Text style={styles.bpSlash}>/</Text>
                    <VitalField 
                      label="Diastolic" 
                      value={bpDiastolic} 
                      onChange={setBpDiastolic} 
                      unit="mmHg" 
                      icon={Heart} 
                      color={COLORS.error}
                      placeholder="80"
                    />
                  </View>

                  <View style={styles.fieldRow}>
                    <VitalField label="Pulse" value={pulse} onChange={setPulse} unit="bpm" icon={Activity} color={COLORS.warning} placeholder="72" />
                    <VitalField label="Temp" value={temp} onChange={setTemp} unit="°C" icon={Thermometer} color={COLORS.primary} placeholder="37.0" />
                  </View>

                  <View style={styles.fieldRow}>
                    <VitalField label="SpO2" value={spo2} onChange={setSpo2} unit="%" icon={Droplets} color={COLORS.info || COLORS.primary} placeholder="98" />
                    <VitalField label="Resp Rate" value={respRate} onChange={setRespRate} unit="/min" icon={Wind} color={COLORS.textSecondary} placeholder="16" />
                  </View>

                  <View style={styles.fieldRow}>
                    <VitalField label="Weight" value={weight} onChange={setWeight} unit="kg" icon={TrendingUp} color={COLORS.textMuted} placeholder="60" />
                    <View style={{ flex: 1 }} />
                  </View>

                  <Text style={styles.notesLabel}>Notes</Text>
                  <TextInput
                    style={styles.notesInput}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Additional observations..."
                    placeholderTextColor={COLORS.textMuted}
                    multiline
                  />
                </ScrollView>

                <TouchableOpacity style={styles.submitBtn} onPress={submitVitals} disabled={loading}>
                  <LinearGradient colors={[COLORS.success, COLORS.primary]} style={styles.submitGradient}>
                    <Check size={20} color="#fff" />
                    <Text style={styles.submitText}>{loading ? 'Saving...' : 'Save Vitals'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
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
  patientInfo: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.m, marginBottom: SPACING.s },
  patientName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 22 },
  bedNumber: { fontFamily: FONTS.medium, color: COLORS.primary, fontSize: 14, marginLeft: SPACING.m, backgroundColor: COLORS.primary + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  latestCard: { padding: SPACING.m, marginBottom: SPACING.l },
  latestTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16 },
  latestTime: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12, marginBottom: SPACING.m },
  vitalsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  vitalItem: { alignItems: 'center', flex: 1 },
  vitalValue: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginTop: 4 },
  vitalLabel: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m },
  sectionTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18 },
  refreshText: { fontFamily: FONTS.medium, color: COLORS.primary, fontSize: 14 },
  emptyCard: { padding: SPACING.xl, alignItems: 'center' },
  emptyText: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginTop: SPACING.m },
  emptySubtext: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 14, marginTop: SPACING.xs },
  historyCard: { padding: SPACING.m, marginBottom: SPACING.s },
  abnormalCard: { borderWidth: 1, borderColor: COLORS.error + '50' },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
  historyTime: { fontFamily: FONTS.medium, color: COLORS.textMuted, fontSize: 12 },
  alertBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.error + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  alertText: { fontFamily: FONTS.bold, color: COLORS.error, fontSize: 10, marginLeft: 4 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between' },
  historyValue: { fontFamily: FONTS.regular, color: COLORS.text, fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.m, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m },
  modalTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 20 },
  bpRow: { flexDirection: 'row', alignItems: 'flex-end' },
  bpSlash: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 24, marginHorizontal: 8, marginBottom: 12 },
  fieldRow: { flexDirection: 'row', gap: 12 },
  fieldWrapper: { flex: 1, marginBottom: SPACING.m },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  fieldLabel: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12, marginLeft: 6 },
  fieldInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: SPACING.m, borderWidth: 1, borderColor: COLORS.border },
  fieldInput: { flex: 1, fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, paddingVertical: 12 },
  fieldUnit: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12 },
  notesLabel: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12, marginBottom: 6 },
  notesInput: { backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.m, fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14, borderWidth: 1, borderColor: COLORS.border, height: 80, textAlignVertical: 'top', marginBottom: SPACING.m },
  submitBtn: { marginTop: SPACING.s },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, padding: 16 },
  submitText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 16, marginLeft: 8 },
});

export default VitalsScreen;
