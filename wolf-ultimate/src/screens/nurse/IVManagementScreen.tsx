import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Syringe, Plus, X, Check, AlertTriangle, Trash2, RefreshCw } from 'lucide-react-native';
import { COLORS, FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import ivService, { IVLine } from '../../services/ivService';

interface Props {
  route?: { params?: { admissionId?: string; patientName?: string } };
  navigation?: any;
}

export const IVManagementScreen: React.FC<Props> = ({ route, navigation }) => {
  const admissionId = route?.params?.admissionId;
  const patientName = route?.params?.patientName || 'Patient';

  const [ivLines, setIVLines] = useState<IVLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Form state
  const [site, setSite] = useState('');
  const [gauge, setGauge] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (admissionId) loadData();
  }, [admissionId]);

  const loadData = async () => {
    if (!admissionId) return;
    setLoading(true);
    try {
      const data = await ivService.getActiveIVLines(admissionId);
      setIVLines(data);
    } catch (error) {
      console.error('Failed to load IV lines:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSite('');
    setGauge('');
    setNotes('');
  };

  const handleInsert = async () => {
    if (!site || !gauge) {
      Alert.alert('Required', 'Please select site and gauge');
      return;
    }
    try {
      await ivService.insertIVLine({
        admission_id: admissionId!,
        site,
        gauge,
        notes: notes || undefined,
      });
      Alert.alert('Success', 'IV line inserted');
      setModalVisible(false);
      resetForm();
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to insert IV line');
    }
  };

  const handleRemove = (iv: IVLine) => {
    Alert.alert('Remove IV Line', `Remove IV at ${iv.site}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await ivService.removeIVLine(iv.id);
            Alert.alert('Success', 'IV line removed');
            loadData();
          } catch (error) {
            Alert.alert('Error', 'Failed to remove IV line');
          }
        },
      },
    ]);
  };

  const handleStatusUpdate = async (iv: IVLine, status: IVLine['status']) => {
    try {
      await ivService.updateIVStatus(iv.id, status);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'patent': return COLORS.success;
      case 'blocked': return COLORS.error;
      case 'phlebitis': return COLORS.warning;
      default: return COLORS.textMuted;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#1e3a5f']} style={StyleSheet.absoluteFill} />
      <BackgroundOrb color={COLORS.primary} position="bottom-left" />
      
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>IV Management</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Plus size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <Text style={styles.patientName}>{patientName}</Text>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          <Text style={styles.sectionTitle}>Active IV Lines ({ivLines.length})</Text>

          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : ivLines.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Syringe size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No active IV lines</Text>
              <Text style={styles.emptySubtext}>Tap + to insert new IV</Text>
            </GlassCard>
          ) : (
            ivLines.map((iv) => {
              const isDue = ivService.isDueForChange(iv.inserted_at);
              const hours = ivService.getHoursSinceInsertion(iv.inserted_at);
              return (
                <GlassCard key={iv.id} style={[styles.ivCard, isDue && styles.dueCard]}>
                  {isDue && (
                    <View style={styles.dueBanner}>
                      <AlertTriangle size={14} color={COLORS.warning} />
                      <Text style={styles.dueText}>Due for change ({hours}h)</Text>
                    </View>
                  )}
                  <View style={styles.ivRow}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(iv.status) }]} />
                    <View style={styles.ivInfo}>
                      <Text style={styles.ivSite}>{iv.site}</Text>
                      <Text style={styles.ivGauge}>{iv.gauge} Gauge</Text>
                      <Text style={styles.ivTime}>Inserted {hours}h ago</Text>
                    </View>
                  </View>
                  
                  <View style={styles.ivActions}>
                    <TouchableOpacity 
                      style={[styles.statusBtn, iv.status === 'patent' && styles.statusActive]}
                      onPress={() => handleStatusUpdate(iv, 'patent')}
                    >
                      <Text style={[styles.statusBtnText, iv.status === 'patent' && { color: '#fff' }]}>Patent</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.statusBtn, iv.status === 'blocked' && { backgroundColor: COLORS.error }]}
                      onPress={() => handleStatusUpdate(iv, 'blocked')}
                    >
                      <Text style={[styles.statusBtnText, iv.status === 'blocked' && { color: '#fff' }]}>Blocked</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(iv)}>
                      <Trash2 size={16} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              );
            })
          )}
        </ScrollView>

        {/* Insert IV Modal */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Insert IV Line</Text>
                <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Site</Text>
              <View style={styles.optionGrid}>
                {ivService.IV_SITES.map((s) => (
                  <TouchableOpacity 
                    key={s} 
                    style={[styles.optionItem, site === s && styles.optionSelected]}
                    onPress={() => setSite(s)}
                  >
                    <Text style={[styles.optionText, site === s && { color: '#fff' }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Gauge</Text>
              <View style={styles.gaugeRow}>
                {ivService.IV_GAUGES.map((g) => (
                  <TouchableOpacity 
                    key={g} 
                    style={[styles.gaugeItem, gauge === g && styles.gaugeSelected]}
                    onPress={() => setGauge(g)}
                  >
                    <Text style={[styles.gaugeText, gauge === g && { color: '#fff' }]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={styles.input}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any observations..."
                placeholderTextColor={COLORS.textMuted}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleInsert}>
                <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.submitGradient}>
                  <Syringe size={20} color="#fff" />
                  <Text style={styles.submitText}>Insert IV Line</Text>
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
  patientName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 24, textAlign: 'center', marginBottom: SPACING.m },
  sectionTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginBottom: SPACING.m },
  loadingText: { color: COLORS.textSecondary, textAlign: 'center' },
  emptyCard: { padding: SPACING.xl, alignItems: 'center' },
  emptyText: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginTop: SPACING.m },
  emptySubtext: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 13 },
  ivCard: { padding: SPACING.m, marginBottom: SPACING.m },
  dueCard: { borderWidth: 1, borderColor: COLORS.warning },
  dueBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.warning + '20', padding: 6, borderRadius: 6, marginBottom: SPACING.s },
  dueText: { fontFamily: FONTS.bold, color: COLORS.warning, fontSize: 11, marginLeft: 6 },
  ivRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  ivInfo: { flex: 1 },
  ivSite: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16 },
  ivGauge: { fontFamily: FONTS.medium, color: COLORS.primary, fontSize: 13 },
  ivTime: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11 },
  ivActions: { flexDirection: 'row', marginTop: SPACING.m, gap: 8 },
  statusBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.surface, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statusActive: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  statusBtnText: { fontFamily: FONTS.medium, color: COLORS.textMuted, fontSize: 12 },
  removeBtn: { padding: 10, backgroundColor: COLORS.error + '20', borderRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.m },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m },
  modalTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 20 },
  label: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 13, marginBottom: 6, marginTop: SPACING.m },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionItem: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  optionSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  optionText: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 12 },
  gaugeRow: { flexDirection: 'row', gap: 8 },
  gaugeItem: { flex: 1, paddingVertical: 12, backgroundColor: COLORS.surface, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  gaugeSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  gaugeText: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.m, fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  submitBtn: { marginTop: SPACING.l },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, padding: 16 },
  submitText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 16, marginLeft: 8 },
});

export default IVManagementScreen;
