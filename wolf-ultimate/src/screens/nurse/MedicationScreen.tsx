import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Pill, Check, X, Clock, AlertTriangle, BedDouble, ChevronRight, Ban, Pause } from 'lucide-react-native';
import { COLORS, FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import medicationService, { MedicationTask } from '../../services/medicationService';

interface Props {
  route?: { params?: { admissionId?: string } };
  navigation?: any;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'given': return COLORS.success;
    case 'overdue': return COLORS.error;
    case 'due': return COLORS.warning;
    case 'skipped': case 'held': return COLORS.textMuted;
    default: return COLORS.primary;
  }
};

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

export const MedicationScreen: React.FC<Props> = ({ route, navigation }) => {
  const admissionId = route?.params?.admissionId;

  const [tasks, setTasks] = useState<MedicationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<MedicationTask | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [actionType, setActionType] = useState<'administer' | 'skip' | 'hold'>('administer');

  useEffect(() => {
    loadTasks();
  }, [admissionId]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = admissionId 
        ? await medicationService.getPatientMedications(admissionId)
        : await medicationService.getPendingTasks();
      setTasks(data);
    } catch (error) {
      console.error('Failed to load medication tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const openActionModal = (task: MedicationTask, action: 'administer' | 'skip' | 'hold') => {
    setSelectedTask(task);
    setActionType(action);
    setSkipReason('');
    setActionModalVisible(true);
  };

  const executeAction = async () => {
    if (!selectedTask) return;

    try {
      if (actionType === 'administer') {
        await medicationService.administerMedication({ task_id: selectedTask.id });
        Alert.alert('Success', 'Medication marked as given');
      } else if (actionType === 'skip') {
        if (!skipReason) {
          Alert.alert('Required', 'Please provide a reason for skipping');
          return;
        }
        await medicationService.skipMedication(selectedTask.id, skipReason);
        Alert.alert('Success', 'Medication skipped');
      } else if (actionType === 'hold') {
        if (!skipReason) {
          Alert.alert('Required', 'Please provide a reason for holding');
          return;
        }
        await medicationService.holdMedication(selectedTask.id, skipReason);
        Alert.alert('Success', 'Medication held');
      }
      setActionModalVisible(false);
      loadTasks();
    } catch (error) {
      Alert.alert('Error', 'Failed to update medication');
    }
  };

  const { due, overdue } = medicationService.getDueCounts(tasks);

  const groupedTasks = tasks.reduce((acc, task) => {
    const key = task.patient_name || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {} as Record<string, MedicationTask[]>);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#111827']} style={StyleSheet.absoluteFill} />
      <BackgroundOrb color={COLORS.warning} position="bottom-left" />
      
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Medications (eMAR)</Text>
          <TouchableOpacity onPress={loadTasks}>
            <Text style={styles.refreshBtn}>↻</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Badges */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryBadge, { backgroundColor: COLORS.warning + '20' }]}>
            <Clock size={16} color={COLORS.warning} />
            <Text style={[styles.summaryValue, { color: COLORS.warning }]}>{due}</Text>
            <Text style={styles.summaryLabel}>Due Now</Text>
          </View>
          <View style={[styles.summaryBadge, { backgroundColor: COLORS.error + '20' }]}>
            <AlertTriangle size={16} color={COLORS.error} />
            <Text style={[styles.summaryValue, { color: COLORS.error }]}>{overdue}</Text>
            <Text style={styles.summaryLabel}>Overdue</Text>
          </View>
          <View style={[styles.summaryBadge, { backgroundColor: COLORS.success + '20' }]}>
            <Check size={16} color={COLORS.success} />
            <Text style={[styles.summaryValue, { color: COLORS.success }]}>{tasks.filter(t => t.status === 'given').length}</Text>
            <Text style={styles.summaryLabel}>Given</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {loading ? (
            <Text style={styles.loadingText}>Loading medications...</Text>
          ) : tasks.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Pill size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No pending medications</Text>
              <Text style={styles.emptySubtext}>All medications have been administered</Text>
            </GlassCard>
          ) : (
            Object.entries(groupedTasks).map(([patientName, patientTasks]) => (
              <View key={patientName} style={styles.patientGroup}>
                <View style={styles.patientHeader}>
                  <BedDouble size={16} color={COLORS.primary} />
                  <Text style={styles.patientName}>{patientName}</Text>
                  <Text style={styles.bedNum}>{patientTasks[0]?.bed_number ? `Bed ${patientTasks[0].bed_number}` : ''}</Text>
                </View>

                {patientTasks.map((task) => (
                  <GlassCard key={task.id} style={[styles.taskCard, task.status === 'overdue' && styles.overdueCard]}>
                    <View style={styles.taskRow}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(task.status) }]} />
                      <View style={styles.taskInfo}>
                        <Text style={styles.medName}>{task.medication_name}</Text>
                        <Text style={styles.medDetails}>{task.dosage} • {task.route} • {task.frequency}</Text>
                        <View style={styles.timeRow}>
                          <Clock size={12} color={COLORS.textMuted} />
                          <Text style={styles.schedTime}>{formatTime(task.scheduled_time)}</Text>
                          {task.is_prn && <Text style={styles.prnBadge}>PRN</Text>}
                        </View>
                      </View>
                      <View style={styles.actionsCol}>
                        {task.status !== 'given' && task.status !== 'skipped' && task.status !== 'held' && (
                          <>
                            <TouchableOpacity style={styles.giveBtn} onPress={() => openActionModal(task, 'administer')}>
                              <Check size={16} color="#fff" />
                            </TouchableOpacity>
                            <View style={styles.actionRow}>
                              <TouchableOpacity style={styles.skipBtn} onPress={() => openActionModal(task, 'skip')}>
                                <Ban size={12} color={COLORS.error} />
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.holdBtn} onPress={() => openActionModal(task, 'hold')}>
                                <Pause size={12} color={COLORS.warning} />
                              </TouchableOpacity>
                            </View>
                          </>
                        )}
                        {(task.status === 'given' || task.status === 'skipped' || task.status === 'held') && (
                          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) + '30' }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(task.status) }]}>{task.status}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </GlassCard>
                ))}
              </View>
            ))
          )}
        </ScrollView>

        {/* Action Modal */}
        <Modal visible={actionModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {actionType === 'administer' ? 'Confirm Administration' : actionType === 'skip' ? 'Skip Medication' : 'Hold Medication'}
                </Text>
                <TouchableOpacity onPress={() => setActionModalVisible(false)}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              {selectedTask && (
                <View style={styles.modalBody}>
                  <Text style={styles.modalMedName}>{selectedTask.medication_name}</Text>
                  <Text style={styles.modalMedDetails}>{selectedTask.dosage} • {selectedTask.route}</Text>
                  <Text style={styles.modalPatient}>Patient: {selectedTask.patient_name}</Text>

                  {(actionType === 'skip' || actionType === 'hold') && (
                    <>
                      <Text style={styles.reasonLabel}>Reason *</Text>
                      <TextInput
                        style={styles.reasonInput}
                        value={skipReason}
                        onChangeText={setSkipReason}
                        placeholder={actionType === 'skip' ? 'Why is this medication being skipped?' : 'Why is this medication being held?'}
                        placeholderTextColor={COLORS.textMuted}
                        multiline
                      />
                    </>
                  )}

                  <TouchableOpacity 
                    style={[
                      styles.confirmBtn, 
                      { backgroundColor: actionType === 'administer' ? COLORS.success : actionType === 'skip' ? COLORS.error : COLORS.warning }
                    ]} 
                    onPress={executeAction}
                  >
                    {actionType === 'administer' ? <Check size={18} color="#fff" /> : actionType === 'skip' ? <Ban size={18} color="#fff" /> : <Pause size={18} color="#fff" />}
                    <Text style={styles.confirmText}>
                      {actionType === 'administer' ? 'Mark as Given' : actionType === 'skip' ? 'Skip Medication' : 'Hold Medication'}
                    </Text>
                  </TouchableOpacity>
                </View>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.m, paddingVertical: SPACING.s },
  backBtn: { fontFamily: FONTS.medium, color: COLORS.primary, fontSize: 16 },
  title: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18 },
  refreshBtn: { fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: SPACING.m, marginBottom: SPACING.m },
  summaryBadge: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, minWidth: 80 },
  summaryValue: { fontFamily: FONTS.bold, fontSize: 20, marginTop: 4 },
  summaryLabel: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10 },
  loadingText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 40 },
  emptyCard: { padding: SPACING.xl, alignItems: 'center' },
  emptyText: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginTop: SPACING.m },
  emptySubtext: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 14, marginTop: SPACING.xs },
  patientGroup: { marginBottom: SPACING.l },
  patientHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.s },
  patientName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginLeft: 8 },
  bedNum: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12, marginLeft: 'auto' },
  taskCard: { padding: SPACING.m, marginBottom: SPACING.s },
  overdueCard: { borderWidth: 1, borderColor: COLORS.error + '50' },
  taskRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  taskInfo: { flex: 1 },
  medName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  medDetails: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  schedTime: { fontFamily: FONTS.medium, color: COLORS.textMuted, fontSize: 11, marginLeft: 4 },
  prnBadge: { fontFamily: FONTS.bold, color: COLORS.warning, fontSize: 9, backgroundColor: COLORS.warning + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  actionsCol: { alignItems: 'center' },
  giveBtn: { backgroundColor: COLORS.success, padding: 10, borderRadius: 10, marginBottom: 6 },
  actionRow: { flexDirection: 'row', gap: 6 },
  skipBtn: { backgroundColor: COLORS.error + '20', padding: 6, borderRadius: 6 },
  holdBtn: { backgroundColor: COLORS.warning + '20', padding: 6, borderRadius: 6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontFamily: FONTS.bold, fontSize: 11, textTransform: 'capitalize' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: SPACING.m },
  modalContent: { backgroundColor: COLORS.background, borderRadius: 20, padding: SPACING.m },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m },
  modalTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18 },
  modalBody: { alignItems: 'center' },
  modalMedName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 20, marginBottom: 4 },
  modalMedDetails: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 14 },
  modalPatient: { fontFamily: FONTS.medium, color: COLORS.textMuted, fontSize: 13, marginTop: SPACING.s, marginBottom: SPACING.m },
  reasonLabel: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12, alignSelf: 'flex-start', marginTop: SPACING.m },
  reasonInput: { width: '100%', backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.m, fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14, borderWidth: 1, borderColor: COLORS.border, height: 80, textAlignVertical: 'top', marginTop: 6, marginBottom: SPACING.m },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, marginTop: SPACING.s, width: '100%' },
  confirmText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 15, marginLeft: 8 },
});

export default MedicationScreen;
