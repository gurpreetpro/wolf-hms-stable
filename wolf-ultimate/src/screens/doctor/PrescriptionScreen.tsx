import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Pill, Plus, Search, X, Sparkles, Clock, Check, ChevronRight } from 'lucide-react-native';
import { COLORS, FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import { useAuthStore } from '../../store/authStore';
import prescriptionService, { Prescription, Medication } from '../../services/prescriptionService';

interface Props {
  route?: { params?: { patientId?: string; patientName?: string; visitId?: string } };
  navigation?: any;
}

export const PrescriptionScreen: React.FC<Props> = ({ route, navigation }) => {
  const patientId = route?.params?.patientId;
  const patientName = route?.params?.patientName || 'Patient';
  const visitId = route?.params?.visitId;
  
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [currentMed, setCurrentMed] = useState<Partial<Medication>>({});
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; strength: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (patientId) {
      loadPrescriptions();
    }
  }, [patientId]);

  const loadPrescriptions = async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const data = await prescriptionService.getPatientPrescriptions(patientId);
      setPrescriptions(data);
    } catch (error) {
      console.error('Failed to load prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      const results = await prescriptionService.searchMedicines(query);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const addMedication = (med: { name: string; strength: string }) => {
    const newMed: Medication = {
      medicine_name: `${med.name} ${med.strength}`,
      dosage: med.strength,
      frequency: '1-0-1',
      duration: '5 days',
    };
    setMedications([...medications, newMed]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const getAISuggestions = async () => {
    if (!diagnosis.trim() || !patientId) {
      Alert.alert('Enter Diagnosis', 'Please enter a diagnosis to get AI suggestions');
      return;
    }
    setAiLoading(true);
    try {
      const suggestions = await prescriptionService.getAISuggestion(diagnosis, patientId);
      if (suggestions.length > 0) {
        setMedications([...medications, ...suggestions]);
        Alert.alert('AI Suggestions Added', `${suggestions.length} medications suggested`);
      } else {
        Alert.alert('No Suggestions', 'AI could not suggest medications for this diagnosis');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not get AI suggestions');
    } finally {
      setAiLoading(false);
    }
  };

  const submitPrescription = async () => {
    if (medications.length === 0) {
      Alert.alert('Add Medications', 'Please add at least one medication');
      return;
    }
    try {
      await prescriptionService.createPrescription({
        patient_id: patientId!,
        visit_id: visitId,
        medications,
        diagnosis,
        notes,
      });
      Alert.alert('Success', 'Prescription created successfully');
      setModalVisible(false);
      setMedications([]);
      setDiagnosis('');
      setNotes('');
      loadPrescriptions();
    } catch (error) {
      Alert.alert('Error', 'Failed to create prescription');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#111827']} style={StyleSheet.absoluteFill} />
      <BackgroundOrb color={COLORS.secondary} position="top-right" />
      
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Prescriptions</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Plus size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <Text style={styles.patientName}>{patientName}</Text>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {loading ? (
            <Text style={styles.loadingText}>Loading prescriptions...</Text>
          ) : prescriptions.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Pill size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No prescriptions yet</Text>
              <Text style={styles.emptySubtext}>Tap + to create one</Text>
            </GlassCard>
          ) : (
            prescriptions.map((rx) => (
              <GlassCard key={rx.id} style={styles.rxCard}>
                <View style={styles.rxHeader}>
                  <View style={styles.rxIconWrap}>
                    <Pill size={18} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: SPACING.s }}>
                    <Text style={styles.rxDiagnosis}>{rx.diagnosis || 'Prescription'}</Text>
                    <Text style={styles.rxDate}>{new Date(rx.created_at).toLocaleDateString()}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: rx.status === 'active' ? COLORS.success + '30' : COLORS.textMuted + '30' }]}>
                    <Text style={[styles.statusText, { color: rx.status === 'active' ? COLORS.success : COLORS.textMuted }]}>
                      {rx.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.rxMeds}>
                  {rx.medications?.slice(0, 3).map((med, idx) => (
                    <Text key={idx} style={styles.medItem}>• {med.medicine_name} - {med.frequency}</Text>
                  ))}
                  {rx.medications?.length > 3 && (
                    <Text style={styles.moreText}>+{rx.medications.length - 3} more</Text>
                  )}
                </View>
              </GlassCard>
            ))
          )}
        </ScrollView>

        {/* Create Prescription Modal */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Prescription</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1 }}>
                {/* Diagnosis */}
                <Text style={styles.label}>Diagnosis</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter diagnosis..."
                  placeholderTextColor={COLORS.textMuted}
                  value={diagnosis}
                  onChangeText={setDiagnosis}
                />

                {/* AI Suggest Button */}
                <TouchableOpacity style={styles.aiBtn} onPress={getAISuggestions} disabled={aiLoading}>
                  <Sparkles size={16} color="#fff" />
                  <Text style={styles.aiBtnText}>{aiLoading ? 'Thinking...' : 'AI Suggest Medications'}</Text>
                </TouchableOpacity>

                {/* Medicine Search */}
                <Text style={styles.label}>Add Medications</Text>
                <View style={styles.searchWrap}>
                  <Search size={18} color={COLORS.textMuted} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search medicines..."
                    placeholderTextColor={COLORS.textMuted}
                    value={searchQuery}
                    onChangeText={handleSearch}
                  />
                </View>

                {searchResults.length > 0 && (
                  <View style={styles.searchResults}>
                    {searchResults.map((med) => (
                      <TouchableOpacity key={med.id} style={styles.searchItem} onPress={() => addMedication(med)}>
                        <Text style={styles.searchItemText}>{med.name} {med.strength}</Text>
                        <Plus size={16} color={COLORS.primary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Added Medications */}
                <Text style={[styles.label, { marginTop: SPACING.m }]}>Medications ({medications.length})</Text>
                {medications.map((med, idx) => (
                  <View key={idx} style={styles.medCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.medName}>{med.medicine_name}</Text>
                      <Text style={styles.medDetails}>{med.frequency} • {med.duration}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeMedication(idx)}>
                      <X size={18} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Notes */}
                <Text style={[styles.label, { marginTop: SPACING.m }]}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Additional instructions..."
                  placeholderTextColor={COLORS.textMuted}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />
              </ScrollView>

              {/* Submit Button */}
              <TouchableOpacity style={styles.submitBtn} onPress={submitPrescription}>
                <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.submitGradient}>
                  <Check size={20} color="#fff" />
                  <Text style={styles.submitText}>Create Prescription</Text>
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
  patientName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 24, paddingHorizontal: SPACING.m, marginBottom: SPACING.s },
  loadingText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 40 },
  emptyCard: { padding: SPACING.xl, alignItems: 'center' },
  emptyText: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginTop: SPACING.m },
  emptySubtext: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 14, marginTop: SPACING.xs },
  rxCard: { padding: SPACING.m, marginBottom: SPACING.m },
  rxHeader: { flexDirection: 'row', alignItems: 'center' },
  rxIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center' },
  rxDiagnosis: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16 },
  rxDate: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontFamily: FONTS.medium, fontSize: 11, textTransform: 'capitalize' },
  rxMeds: { marginTop: SPACING.s, paddingLeft: 44 },
  medItem: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 13, marginBottom: 2 },
  moreText: { fontFamily: FONTS.medium, color: COLORS.primary, fontSize: 12, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.m, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m },
  modalTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 20 },
  label: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 13, marginBottom: SPACING.xs },
  input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.m, fontFamily: FONTS.regular, color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.m },
  aiBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.secondary, borderRadius: 12, padding: SPACING.m, marginBottom: SPACING.m },
  aiBtnText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 14, marginLeft: 8 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: SPACING.m, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, fontFamily: FONTS.regular, color: COLORS.text, fontSize: 15, paddingVertical: SPACING.m, marginLeft: 8 },
  searchResults: { backgroundColor: COLORS.surface, borderRadius: 12, marginTop: 4, borderWidth: 1, borderColor: COLORS.border },
  searchItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.m, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchItemText: { fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14 },
  medCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.m, marginBottom: SPACING.s, borderWidth: 1, borderColor: COLORS.border },
  medName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  medDetails: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12 },
  submitBtn: { marginTop: SPACING.m },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, padding: 16 },
  submitText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 16, marginLeft: 8 },
});

export default PrescriptionScreen;
