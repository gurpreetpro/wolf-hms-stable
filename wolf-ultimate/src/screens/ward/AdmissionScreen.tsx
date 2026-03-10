import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BedDouble, User, Plus, X, CheckCircle, Search, ArrowRightLeft, LogOut, Users, Bed, UserPlus } from 'lucide-react-native';
import { FONTS, SPACING, SHADOWS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { VerticalStatCard } from '../../components/common/VerticalStatCard';
import { EmptyState } from '../../components/common/EmptyState';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import admissionService, { Admission, Bed as BedType, Ward, AdmitInput } from '../../services/admissionService';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  navigation?: any;
}

export const AdmissionScreen: React.FC<Props> = ({ navigation }) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [beds, setBeds] = useState<BedType[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [admitModalVisible, setAdmitModalVisible] = useState(false);
  const [dischargeModalVisible, setDischargeModalVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
  
  // Admit form
  const [patientSearch, setPatientSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedBed, setSelectedBed] = useState<BedType | null>(null);
  const [diagnosis, setDiagnosis] = useState('');
  
  // Discharge form
  const [dischargeType, setDischargeType] = useState<'normal' | 'lama' | 'absconded'>('normal');
  const [dischargeSummary, setDischargeSummary] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [admData, bedData, wardData] = await Promise.all([
        admissionService.getActiveAdmissions(),
        admissionService.getAllBeds(),
        admissionService.getWards(),
      ]);
      setAdmissions(admData);
      setBeds(bedData);
      setWards(wardData);
    } catch (error) {
      console.error('Failed to load admission data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSearch = async () => {
    if (!patientSearch.trim()) return;
    try {
      const results = await admissionService.searchPatients(patientSearch);
      setSearchResults(results);
    } catch (error) {
      console.error('Patient search failed:', error);
    }
  };

  const handleAdmit = async () => {
    if (!selectedPatient || !selectedBed) {
      Alert.alert('Required', 'Please select a patient and bed');
      return;
    }
    try {
      const data: AdmitInput = {
        patient_id: selectedPatient.id,
        bed_id: selectedBed.id,
        ward_id: selectedBed.ward_id,
        diagnosis,
      };
      await admissionService.admitPatient(data);
      Alert.alert('Success', 'Patient admitted successfully');
      setAdmitModalVisible(false);
      resetAdmitForm();
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to admit patient');
    }
  };

  const handleDischarge = async () => {
    if (!selectedAdmission) return;
    try {
      await admissionService.dischargePatient({
        admission_id: selectedAdmission.id,
        discharge_type: dischargeType,
        discharge_summary: dischargeSummary,
      });
      Alert.alert('Success', 'Patient discharged successfully');
      setDischargeModalVisible(false);
      setSelectedAdmission(null);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to discharge patient');
    }
  };

  const handleTransfer = async (newBed: BedType) => {
    if (!selectedAdmission) return;
    try {
      await admissionService.transferPatient(selectedAdmission.id, newBed.id);
      Alert.alert('Success', `Patient transferred to Bed ${newBed.bed_number}`);
      setTransferModalVisible(false);
      setSelectedAdmission(null);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to transfer patient');
    }
  };

  const resetAdmitForm = () => {
    setPatientSearch('');
    setSearchResults([]);
    setSelectedPatient(null);
    setSelectedBed(null);
    setDiagnosis('');
  };

  const openDischarge = (admission: Admission) => {
    setSelectedAdmission(admission);
    setDischargeType('normal');
    setDischargeSummary('');
    setDischargeModalVisible(true);
  };

  const openTransfer = (admission: Admission) => {
    setSelectedAdmission(admission);
    setTransferModalVisible(true);
  };

  const availableBeds = beds.filter(b => b.status === 'available');

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#1e1b4b']} style={StyleSheet.absoluteFill} />
      <BackgroundOrb color={COLORS.primary} position="top-right" />
      
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
            <View>
                <Text style={styles.title}>Admissions</Text>
                <Text style={styles.subtitle}>Patient Intake & Discharge</Text>
            </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
             {/* Stats Row */}
             <View style={styles.statsRow}>
                <VerticalStatCard 
                    icon={Users} 
                    title="Admitted" 
                    value={admissions.length} 
                    color={COLORS.primary} 
                />
                <VerticalStatCard 
                    icon={CheckCircle} 
                    title="Beds Free" 
                    value={availableBeds.length} 
                    color={COLORS.success} 
                />
                <VerticalStatCard 
                    icon={Bed} 
                    title="Total Beds" 
                    value={beds.length} 
                    color={COLORS.warning} 
                />
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m }}>
                 <Text style={styles.sectionTitle}>Active Admissions</Text>
                 <TouchableOpacity style={styles.addBtnSmall} onPress={() => setAdmitModalVisible(true)}>
                    <UserPlus size={16} color="#fff" />
                    <Text style={{ marginLeft: 6, color: '#fff', fontFamily: FONTS.bold }}>Admit New</Text>
                 </TouchableOpacity>
            </View>

          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : admissions.length === 0 ? (
            <EmptyState 
                icon={<BedDouble size={36} color="#9ca3af" />} 
                title="No Active Admissions" 
                message="Tap the Admit button to assign a patient to a bed." 
            />
          ) : (
            admissions.map((adm) => (
              <GlassCard key={adm.id} style={styles.admissionCard}>
                <View style={styles.admRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{adm.patient_name?.charAt(0) || '?'}</Text>
                  </View>
                  <View style={styles.admInfo}>
                    <Text style={styles.patientName}>{adm.patient_name}</Text>
                    <Text style={styles.bedInfo}>Bed {adm.bed_number} • {adm.ward_name}</Text>
                    <Text style={styles.diagText}>{adm.diagnosis || 'No diagnosis'}</Text>
                  </View>
                </View>
                <View style={styles.admActions}>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.warning + '15', borderWidth: 1, borderColor: COLORS.warning + '30' }]} onPress={() => openTransfer(adm)}>
                    <ArrowRightLeft size={16} color={COLORS.warning} />
                    <Text style={[styles.actionText, { color: COLORS.warning }]}>Transfer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.error + '15', borderWidth: 1, borderColor: COLORS.error + '30' }]} onPress={() => openDischarge(adm)}>
                    <LogOut size={16} color={COLORS.error} />
                    <Text style={[styles.actionText, { color: COLORS.error }]}>Discharge</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            ))
          )}
        </ScrollView>

        {/* Admit Modal */}
        <Modal visible={admitModalVisible} animationType="slide" transparent>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Admit Patient</Text>
                <TouchableOpacity onPress={() => { setAdmitModalVisible(false); resetAdmitForm(); }}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView>
                {/* Patient Search */}
                <Text style={styles.label}>Search Patient</Text>
                <View style={styles.searchRow}>
                  <TextInput
                    style={styles.input}
                    value={patientSearch}
                    onChangeText={setPatientSearch}
                    placeholder="Enter patient name or phone..."
                    placeholderTextColor={COLORS.textMuted}
                    onSubmitEditing={handlePatientSearch}
                  />
                  <TouchableOpacity style={styles.searchBtn} onPress={handlePatientSearch}>
                    <Search size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                {searchResults.length > 0 && !selectedPatient && (
                  <View style={styles.searchResults}>
                    {searchResults.slice(0, 5).map((p) => (
                      <TouchableOpacity key={p.id} style={styles.resultItem} onPress={() => setSelectedPatient(p)}>
                        <Text style={styles.resultName}>{p.name}</Text>
                        <Text style={styles.resultPhone}>{p.phone}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {selectedPatient && (
                  <GlassCard style={styles.selectedPatient}>
                    <User size={20} color={COLORS.primary} />
                    <Text style={styles.selectedName}>{selectedPatient.name}</Text>
                    <TouchableOpacity onPress={() => setSelectedPatient(null)}>
                      <X size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  </GlassCard>
                )}

                {/* Bed Selection */}
                <Text style={[styles.label, { marginTop: SPACING.m }]}>Select Bed</Text>
                <View style={styles.bedGrid}>
                  {availableBeds.slice(0, 8).map((bed) => (
                    <TouchableOpacity 
                      key={bed.id} 
                      style={[styles.bedItem, selectedBed?.id === bed.id && styles.bedSelected]}
                      onPress={() => setSelectedBed(bed)}
                    >
                      <BedDouble size={20} color={selectedBed?.id === bed.id ? '#fff' : COLORS.success} />
                      <Text style={[styles.bedNum, selectedBed?.id === bed.id && { color: '#fff' }]}>{bed.bed_number}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Diagnosis */}
                <Text style={[styles.label, { marginTop: SPACING.m }]}>Diagnosis</Text>
                <TextInput
                  style={styles.input}
                  value={diagnosis}
                  onChangeText={setDiagnosis}
                  placeholder="Primary diagnosis..."
                  placeholderTextColor={COLORS.textMuted}
                />

                <TouchableOpacity style={styles.submitBtn} onPress={handleAdmit}>
                  <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.submitGradient}>
                    <CheckCircle size={20} color="#fff" />
                    <Text style={styles.submitText}>Admit Patient</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Discharge Modal */}
        <Modal visible={dischargeModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '60%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Discharge Patient</Text>
                <TouchableOpacity onPress={() => setDischargeModalVisible(false)}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.dischargePatient}>{selectedAdmission?.patient_name}</Text>

              <Text style={styles.label}>Discharge Type</Text>
              <View style={styles.typeRow}>
                {(['normal', 'lama', 'absconded'] as const).map((t) => (
                  <TouchableOpacity 
                    key={t} 
                    style={[styles.typeBtn, dischargeType === t && styles.typeBtnActive]}
                    onPress={() => setDischargeType(t)}
                  >
                    <Text style={[styles.typeText, dischargeType === t && { color: '#fff' }]}>{t === 'lama' ? 'LAMA' : t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Summary</Text>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                value={dischargeSummary}
                onChangeText={setDischargeSummary}
                placeholder="Discharge summary..."
                placeholderTextColor={COLORS.textMuted}
                multiline
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleDischarge}>
                <LinearGradient colors={[COLORS.error, '#ff6b6b']} style={styles.submitGradient}>
                  <LogOut size={20} color="#fff" />
                  <Text style={styles.submitText}>Confirm Discharge</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Transfer Modal */}
        <Modal visible={transferModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '60%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Transfer Patient</Text>
                <TouchableOpacity onPress={() => setTransferModalVisible(false)}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.dischargePatient}>{selectedAdmission?.patient_name}</Text>
              <Text style={styles.currentBed}>Current: Bed {selectedAdmission?.bed_number}</Text>

              <Text style={[styles.label, { marginTop: SPACING.m }]}>Select New Bed</Text>
              <ScrollView style={{ maxHeight: 200 }}>
                <View style={styles.bedGrid}>
                  {availableBeds.map((bed) => (
                    <TouchableOpacity 
                      key={bed.id} 
                      style={[styles.bedItem, { backgroundColor: COLORS.warning + '20' }]}
                      onPress={() => handleTransfer(bed)}
                    >
                      <BedDouble size={20} color={COLORS.warning} />
                      <Text style={styles.bedNum}>{bed.bed_number}</Text>
                      <Text style={styles.bedWard}>{bed.ward_name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

const getStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      paddingHorizontal: SPACING.m, 
      marginTop: SPACING.m, 
      marginBottom: SPACING.m 
  },
  title: { fontFamily: FONTS.bold, fontSize: 28, color: COLORS.text },
  subtitle: { fontFamily: FONTS.medium, fontSize: 16, color: COLORS.primary },
  
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: SPACING.l,
  },
  
  sectionTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18 },
  addBtnSmall: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: COLORS.primary, 
      paddingHorizontal: 12, 
      paddingVertical: 8, 
      borderRadius: 20 
  },
  
  loadingText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 40 },
  
  admissionCard: { padding: SPACING.m, marginBottom: SPACING.m, borderRadius: 24 },
  admRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 20 },
  admInfo: { marginLeft: 12, flex: 1 },
  patientName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16 },
  bedInfo: { fontFamily: FONTS.medium, color: COLORS.primary, fontSize: 13 },
  diagText: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  admActions: { flexDirection: 'row', marginTop: SPACING.m, gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 16 },
  actionText: { fontFamily: FONTS.medium, fontSize: 13, marginLeft: 6 },
  
  // Modal & Inputs
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.background, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: SPACING.l, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.l },
  modalTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 22 },
  label: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 13, marginBottom: 8, marginLeft: 4 },
  
  input: { 
      backgroundColor: COLORS.surface, 
      borderRadius: 16, 
      padding: 16, 
      fontFamily: FONTS.regular, 
      color: COLORS.text, 
      borderWidth: 1, 
      borderColor: COLORS.border,
      marginBottom: SPACING.s
  },
  searchRow: { flexDirection: 'row', marginBottom: SPACING.s, gap: 8 },
  searchBtn: { 
      backgroundColor: COLORS.primary, 
      width: 54, 
      justifyContent: 'center', 
      alignItems: 'center', 
      borderRadius: 16,
      marginBottom: SPACING.s
  },
  searchResults: { backgroundColor: COLORS.surface, borderRadius: 16, marginBottom: SPACING.m, padding: 8 },
  resultItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  resultName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  resultPhone: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12 },
  
  selectedPatient: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: SPACING.m, borderRadius: 16 },
  selectedName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, flex: 1, marginLeft: 12 },
  
  bedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bedItem: { width: '23%', alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: COLORS.success + '15', borderWidth: 1, borderColor: COLORS.success + '30' },
  bedSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  bedNum: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14, marginTop: 4 },
  bedWard: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 9 },

  submitBtn: { marginTop: SPACING.m },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 20, padding: 18 },
  submitText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 16, marginLeft: 8 },
  
  dischargePatient: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 20, textAlign: 'center', marginBottom: 4 },
  currentBed: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginBottom: SPACING.m },
  typeRow: { flexDirection: 'row', marginBottom: SPACING.m },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 16, backgroundColor: COLORS.surface, marginHorizontal: 4, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  typeBtnActive: { backgroundColor: COLORS.error, borderColor: COLORS.error },
  typeText: { fontFamily: FONTS.medium, color: COLORS.textMuted, fontSize: 13 },
});

export default AdmissionScreen;
