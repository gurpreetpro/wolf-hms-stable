import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Droplets, Plus, X, Check, ArrowDown, ArrowUp, TrendingUp, TrendingDown } from 'lucide-react-native';
import { COLORS, FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import ioChartService, { IntakeRecord, OutputRecord, IOBalance } from '../../services/ioChartService';

interface Props {
  route?: { params?: { admissionId?: string; patientName?: string } };
  navigation?: any;
}

const INTAKE_TYPES = [
  { value: 'oral', label: 'Oral', icon: '💧' },
  { value: 'iv', label: 'IV Fluid', icon: '💉' },
  { value: 'ng_tube', label: 'NG Tube', icon: '🔧' },
  { value: 'other', label: 'Other', icon: '📝' },
];

const OUTPUT_TYPES = [
  { value: 'urine', label: 'Urine', icon: '🚽' },
  { value: 'stool', label: 'Stool', icon: '💩' },
  { value: 'vomit', label: 'Vomit', icon: '🤮' },
  { value: 'drain', label: 'Drain', icon: '🩸' },
  { value: 'other', label: 'Other', icon: '📝' },
];

export const IOChartScreen: React.FC<Props> = ({ route, navigation }) => {
  const admissionId = route?.params?.admissionId;
  const patientName = route?.params?.patientName || 'Patient';

  const [balance, setBalance] = useState<IOBalance>({ total_intake: 0, total_output: 0, net_balance: 0, records: [] });
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'intake' | 'output'>('intake');
  
  // Form state
  const [selectedType, setSelectedType] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (admissionId) loadData();
  }, [admissionId]);

  const loadData = async () => {
    if (!admissionId) return;
    setLoading(true);
    try {
      const data = await ioChartService.get24HourBalance(admissionId);
      setBalance(data);
    } catch (error) {
      const records = await ioChartService.getIOHistory(admissionId);
      setBalance(ioChartService.calculateBalance(records));
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type: 'intake' | 'output') => {
    setModalType(type);
    setSelectedType('');
    setDescription('');
    setAmount('');
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!selectedType || !amount) {
      Alert.alert('Required', 'Please select type and enter amount');
      return;
    }

    try {
      if (modalType === 'intake') {
        await ioChartService.logIntake({
          admission_id: admissionId!,
          type: selectedType as any,
          description: description || INTAKE_TYPES.find(t => t.value === selectedType)?.label || '',
          amount_ml: parseInt(amount),
        });
      } else {
        await ioChartService.logOutput({
          admission_id: admissionId!,
          type: selectedType as any,
          description,
          amount_ml: parseInt(amount),
        });
      }
      Alert.alert('Success', `${modalType === 'intake' ? 'Intake' : 'Output'} recorded`);
      setModalVisible(false);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to record');
    }
  };

  const typeOptions = modalType === 'intake' ? INTAKE_TYPES : OUTPUT_TYPES;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#0c4a6e']} style={StyleSheet.absoluteFill} />
      <BackgroundOrb color={COLORS.info || COLORS.primary} position="bottom-right" />
      
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>I/O Chart</Text>
          <View style={{ width: 50 }} />
        </View>

        <Text style={styles.patientName}>{patientName}</Text>

        {/* Balance Card */}
        <GlassCard style={styles.balanceCard}>
          <Text style={styles.balanceTitle}>24-Hour Balance</Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <View style={[styles.balanceIcon, { backgroundColor: COLORS.success + '30' }]}>
                <ArrowDown size={20} color={COLORS.success} />
              </View>
              <Text style={styles.balanceValue}>{balance.total_intake}</Text>
              <Text style={styles.balanceLabel}>Intake (ml)</Text>
            </View>
            <View style={styles.balanceItem}>
              <View style={[styles.balanceIcon, { backgroundColor: COLORS.warning + '30' }]}>
                <ArrowUp size={20} color={COLORS.warning} />
              </View>
              <Text style={styles.balanceValue}>{balance.total_output}</Text>
              <Text style={styles.balanceLabel}>Output (ml)</Text>
            </View>
            <View style={styles.balanceItem}>
              <View style={[styles.balanceIcon, { backgroundColor: balance.net_balance >= 0 ? COLORS.primary + '30' : COLORS.error + '30' }]}>
                {balance.net_balance >= 0 ? <TrendingUp size={20} color={COLORS.primary} /> : <TrendingDown size={20} color={COLORS.error} />}
              </View>
              <Text style={[styles.balanceValue, { color: balance.net_balance >= 0 ? COLORS.success : COLORS.error }]}>
                {balance.net_balance >= 0 ? '+' : ''}{balance.net_balance}
              </Text>
              <Text style={styles.balanceLabel}>Net (ml)</Text>
            </View>
          </View>
        </GlassCard>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success }]} onPress={() => openModal('intake')}>
            <ArrowDown size={20} color="#fff" />
            <Text style={styles.actionText}>Log Intake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.warning }]} onPress={() => openModal('output')}>
            <ArrowUp size={20} color="#fff" />
            <Text style={styles.actionText}>Log Output</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          <Text style={styles.sectionTitle}>Records</Text>
          
          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : balance.records.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Droplets size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No records today</Text>
            </GlassCard>
          ) : (
            balance.records.map((record: any, idx) => {
              const isIntake = ['oral', 'iv', 'ng_tube'].includes(record.type);
              return (
                <GlassCard key={record.id || idx} style={styles.recordCard}>
                  <View style={styles.recordRow}>
                    <View style={[styles.recordIcon, { backgroundColor: isIntake ? COLORS.success + '20' : COLORS.warning + '20' }]}>
                      {isIntake ? <ArrowDown size={16} color={COLORS.success} /> : <ArrowUp size={16} color={COLORS.warning} />}
                    </View>
                    <View style={styles.recordInfo}>
                      <Text style={styles.recordType}>{record.description || record.type}</Text>
                      <Text style={styles.recordTime}>{new Date(record.recorded_at).toLocaleTimeString()}</Text>
                    </View>
                    <Text style={[styles.recordAmount, { color: isIntake ? COLORS.success : COLORS.warning }]}>
                      {isIntake ? '+' : '-'}{record.amount_ml} ml
                    </Text>
                  </View>
                </GlassCard>
              );
            })
          )}
        </ScrollView>

        {/* Log Modal */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Log {modalType === 'intake' ? 'Intake' : 'Output'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Type</Text>
              <View style={styles.typeGrid}>
                {typeOptions.map((t) => (
                  <TouchableOpacity 
                    key={t.value} 
                    style={[styles.typeItem, selectedType === t.value && styles.typeSelected]}
                    onPress={() => setSelectedType(t.value)}
                  >
                    <Text style={styles.typeEmoji}>{t.icon}</Text>
                    <Text style={[styles.typeLabel, selectedType === t.value && { color: '#fff' }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Amount (ml)</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="e.g. 200"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. Water, Normal Saline..."
                placeholderTextColor={COLORS.textMuted}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                <LinearGradient colors={modalType === 'intake' ? [COLORS.success, '#059669'] : [COLORS.warning, '#d97706']} style={styles.submitGradient}>
                  <Check size={20} color="#fff" />
                  <Text style={styles.submitText}>Record {modalType === 'intake' ? 'Intake' : 'Output'}</Text>
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
  patientName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 24, textAlign: 'center', marginBottom: SPACING.m },
  balanceCard: { marginHorizontal: SPACING.m, padding: SPACING.m },
  balanceTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, textAlign: 'center', marginBottom: SPACING.m },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-around' },
  balanceItem: { alignItems: 'center' },
  balanceIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  balanceValue: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 22 },
  balanceLabel: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11 },
  actionRow: { flexDirection: 'row', paddingHorizontal: SPACING.m, marginTop: SPACING.m, gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12 },
  actionText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 15, marginLeft: 8 },
  sectionTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginBottom: SPACING.m },
  loadingText: { color: COLORS.textSecondary, textAlign: 'center' },
  emptyCard: { padding: SPACING.xl, alignItems: 'center' },
  emptyText: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginTop: SPACING.m },
  recordCard: { padding: SPACING.m, marginBottom: SPACING.s },
  recordRow: { flexDirection: 'row', alignItems: 'center' },
  recordIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  recordInfo: { flex: 1, marginLeft: 12 },
  recordType: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  recordTime: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11 },
  recordAmount: { fontFamily: FONTS.bold, fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.m },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m },
  modalTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 20 },
  label: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 13, marginBottom: 6, marginTop: SPACING.m },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeItem: { width: '30%', alignItems: 'center', padding: 12, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  typeSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeEmoji: { fontSize: 24 },
  typeLabel: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 11, marginTop: 4 },
  input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.m, fontFamily: FONTS.regular, color: COLORS.text, fontSize: 16, borderWidth: 1, borderColor: COLORS.border },
  submitBtn: { marginTop: SPACING.l },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, padding: 16 },
  submitText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 16, marginLeft: 8 },
});

export default IOChartScreen;
