import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ClipboardList, Plus, X, Check, Sparkles, CheckCircle } from 'lucide-react-native';
import { COLORS, FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import carePlanService, { CarePlan } from '../../services/carePlanService';

interface Props {
  route?: { params?: { admissionId?: string; patientName?: string; diagnosis?: string } };
  navigation?: any;
}

export const CarePlanScreen: React.FC<Props> = ({ route, navigation }) => {
  const admissionId = route?.params?.admissionId;
  const patientName = route?.params?.patientName || 'Patient';
  const diagnosis = route?.params?.diagnosis;

  const [carePlans, setCarePlans] = useState<CarePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedDiagnosis, setSelectedDiagnosis] = useState('');

  useEffect(() => {
    if (admissionId) loadData();
  }, [admissionId]);

  const loadData = async () => {
    if (!admissionId) return;
    setLoading(true);
    try {
      const data = await carePlanService.getCarePlans(admissionId);
      setCarePlans(data);
    } catch (error) {
      console.error('Failed to load care plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setSelectedDiagnosis('');
  };

  const handleCreate = async () => {
    if (!title || !content) {
      Alert.alert('Required', 'Please enter title and content');
      return;
    }
    try {
      await carePlanService.createCarePlan({
        admission_id: admissionId!,
        title,
        content,
      });
      Alert.alert('Success', 'Care plan created');
      setModalVisible(false);
      resetForm();
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to create care plan');
    }
  };

  const handleGenerateAI = async () => {
    if (!selectedDiagnosis) {
      Alert.alert('Required', 'Please select a diagnosis');
      return;
    }
    setGenerating(true);
    try {
      await carePlanService.generateAICarePlan(admissionId!, selectedDiagnosis);
      Alert.alert('Success', 'AI care plan generated');
      setModalVisible(false);
      resetForm();
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to generate AI care plan. Creating manually may be required.');
    } finally {
      setGenerating(false);
    }
  };

  const handleComplete = async (plan: CarePlan) => {
    try {
      await carePlanService.updateCarePlanStatus(plan.id, 'completed');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#1a2f4a']} style={StyleSheet.absoluteFill} />
      <BackgroundOrb color={COLORS.success} position="top-right" />
      
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Care Plans</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Plus size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <Text style={styles.patientName}>{patientName}</Text>
        {diagnosis && <Text style={styles.diagnosis}>Dx: {diagnosis}</Text>}

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          <Text style={styles.sectionTitle}>Active Plans ({carePlans.filter(p => p.status === 'active').length})</Text>

          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : carePlans.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <ClipboardList size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No care plans</Text>
              <Text style={styles.emptySubtext}>Tap + to create or generate with AI</Text>
            </GlassCard>
          ) : (
            carePlans.map((plan) => (
              <GlassCard key={plan.id} style={[styles.planCard, plan.status === 'completed' && styles.completedCard]}>
                <View style={styles.planHeader}>
                  <Text style={styles.planTitle}>{plan.title}</Text>
                  {plan.status === 'completed' ? (
                    <View style={styles.completedBadge}>
                      <CheckCircle size={14} color={COLORS.success} />
                      <Text style={styles.completedText}>Done</Text>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.completeBtn} onPress={() => handleComplete(plan)}>
                      <Check size={16} color={COLORS.success} />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.planContent}>{plan.content}</Text>
                {plan.goals && plan.goals.length > 0 && (
                  <View style={styles.goalsList}>
                    {plan.goals.slice(0, 3).map((goal, idx) => (
                      <Text key={idx} style={styles.goalItem}>• {goal}</Text>
                    ))}
                  </View>
                )}
                <Text style={styles.planTime}>{new Date(plan.created_at).toLocaleDateString()}</Text>
              </GlassCard>
            ))
          )}
        </ScrollView>

        {/* Create/AI Modal */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Care Plan</Text>
                <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView>
                {/* AI Generation */}
                <GlassCard style={styles.aiCard}>
                  <Sparkles size={24} color={COLORS.warning} />
                  <Text style={styles.aiTitle}>Generate with AI</Text>
                  <Text style={styles.aiSubtext}>Select diagnosis to auto-generate care plan</Text>
                  <View style={styles.diagnosisGrid}>
                    {carePlanService.COMMON_DIAGNOSES.slice(0, 6).map((d) => (
                      <TouchableOpacity 
                        key={d} 
                        style={[styles.diagItem, selectedDiagnosis === d && styles.diagSelected]}
                        onPress={() => setSelectedDiagnosis(selectedDiagnosis === d ? '' : d)}
                      >
                        <Text style={[styles.diagText, selectedDiagnosis === d && { color: '#fff' }]}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={styles.aiBtn} onPress={handleGenerateAI} disabled={generating}>
                    <Sparkles size={18} color="#fff" />
                    <Text style={styles.aiBtnText}>{generating ? 'Generating...' : 'Generate AI Plan'}</Text>
                  </TouchableOpacity>
                </GlassCard>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Manual Creation */}
                <Text style={styles.label}>Title</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Pain Management Plan"
                  placeholderTextColor={COLORS.textMuted}
                />

                <Text style={styles.label}>Content</Text>
                <TextInput
                  style={[styles.input, { height: 120 }]}
                  value={content}
                  onChangeText={setContent}
                  placeholder="Goals, interventions, expected outcomes..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                />

                <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}>
                  <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.submitGradient}>
                    <Check size={20} color="#fff" />
                    <Text style={styles.submitText}>Create Care Plan</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
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
  patientName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 24, textAlign: 'center' },
  diagnosis: { fontFamily: FONTS.regular, color: COLORS.primary, fontSize: 14, textAlign: 'center', marginBottom: SPACING.m },
  sectionTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginBottom: SPACING.m },
  loadingText: { color: COLORS.textSecondary, textAlign: 'center' },
  emptyCard: { padding: SPACING.xl, alignItems: 'center' },
  emptyText: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginTop: SPACING.m },
  emptySubtext: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 13 },
  planCard: { padding: SPACING.m, marginBottom: SPACING.m },
  completedCard: { opacity: 0.7 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  planTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, flex: 1 },
  completeBtn: { padding: 8, backgroundColor: COLORS.success + '20', borderRadius: 8 },
  completedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.success + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  completedText: { fontFamily: FONTS.medium, color: COLORS.success, fontSize: 11, marginLeft: 4 },
  planContent: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  goalsList: { marginTop: SPACING.s },
  goalItem: { fontFamily: FONTS.regular, color: COLORS.text, fontSize: 12, marginBottom: 2 },
  planTime: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginTop: SPACING.s },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.m, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m },
  modalTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 20 },
  aiCard: { padding: SPACING.m, alignItems: 'center' },
  aiTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginTop: 8 },
  aiSubtext: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12, marginBottom: SPACING.m },
  diagnosisGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  diagItem: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  diagSelected: { backgroundColor: COLORS.warning, borderColor: COLORS.warning },
  diagText: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 11 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.warning, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: SPACING.m },
  aiBtnText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 14, marginLeft: 8 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.l },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontFamily: FONTS.medium, color: COLORS.textMuted, fontSize: 12, marginHorizontal: 12 },
  label: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 13, marginBottom: 6 },
  input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.m, fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.m },
  submitBtn: { marginTop: SPACING.s },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, padding: 16 },
  submitText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 16, marginLeft: 8 },
});

export default CarePlanScreen;
