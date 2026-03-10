import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Smile, Frown, Meh, X, Check, TrendingUp } from 'lucide-react-native';
import { COLORS, FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import painService, { PainRecord } from '../../services/painService';

interface Props {
  route?: { params?: { admissionId?: string; patientName?: string } };
  navigation?: any;
}

export const PainAssessmentScreen: React.FC<Props> = ({ route, navigation }) => {
  const admissionId = route?.params?.admissionId;
  const patientName = route?.params?.patientName || 'Patient';

  const [history, setHistory] = useState<PainRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Form state
  const [painScore, setPainScore] = useState(0);
  const [location, setLocation] = useState('');
  const [character, setCharacter] = useState('');
  const [intervention, setIntervention] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (admissionId) loadData();
  }, [admissionId]);

  const loadData = async () => {
    if (!admissionId) return;
    setLoading(true);
    try {
      const data = await painService.getPainHistory(admissionId);
      setHistory(data);
    } catch (error) {
      console.error('Failed to load pain history:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPainScore(0);
    setLocation('');
    setCharacter('');
    setIntervention('');
    setNotes('');
  };

  const handleSubmit = async () => {
    if (!location) {
      Alert.alert('Required', 'Please select pain location');
      return;
    }

    try {
      await painService.logPain({
        admission_id: admissionId!,
        pain_score: painScore,
        location,
        character: character || undefined,
        intervention: intervention || undefined,
        notes: notes || undefined,
      });
      Alert.alert('Success', 'Pain assessment recorded');
      setModalVisible(false);
      resetForm();
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to record pain assessment');
    }
  };

  const latestPain = history.length > 0 ? history[0] : null;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#2d1f3d']} style={StyleSheet.absoluteFill} />
      <BackgroundOrb color={COLORS.error} position="top-right" />
      
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Pain Assessment</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.addText}>+ Log</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.patientName}>{patientName}</Text>

        {/* Latest Pain Card */}
        {latestPain && (
          <GlassCard style={styles.latestCard}>
            <Text style={styles.latestTitle}>Current Pain Level</Text>
            <View style={styles.painDisplay}>
              <View style={[styles.painCircle, { backgroundColor: painService.getPainColor(latestPain.pain_score) }]}>
                <Text style={styles.painNumber}>{latestPain.pain_score}</Text>
              </View>
              <View>
                <Text style={styles.painLabel}>{painService.getPainLabel(latestPain.pain_score)}</Text>
                <Text style={styles.painLocation}>{latestPain.location}</Text>
              </View>
            </View>
            <Text style={styles.latestTime}>{new Date(latestPain.recorded_at).toLocaleString()}</Text>
          </GlassCard>
        )}

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          <Text style={styles.sectionTitle}>Pain History</Text>

          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : history.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Smile size={40} color={COLORS.success} />
              <Text style={styles.emptyText}>No pain records</Text>
              <Text style={styles.emptySubtext}>Tap + Log to record pain assessment</Text>
            </GlassCard>
          ) : (
            history.map((record, idx) => (
              <GlassCard key={record.id || idx} style={styles.historyCard}>
                <View style={styles.historyRow}>
                  <View style={[styles.historyDot, { backgroundColor: painService.getPainColor(record.pain_score) }]}>
                    <Text style={styles.historyScore}>{record.pain_score}</Text>
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyLabel}>{painService.getPainLabel(record.pain_score)} - {record.location}</Text>
                    {record.character && <Text style={styles.historyChar}>{record.character}</Text>}
                    {record.intervention && <Text style={styles.historyIntervention}>Intervention: {record.intervention}</Text>}
                  </View>
                  <Text style={styles.historyTime}>{new Date(record.recorded_at).toLocaleTimeString()}</Text>
                </View>
              </GlassCard>
            ))
          )}
        </ScrollView>

        {/* Pain Assessment Modal */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Pain Assessment</Text>
                <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView>
                {/* Pain Scale */}
                <Text style={styles.label}>Pain Score (0-10)</Text>
                <View style={styles.scaleRow}>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <TouchableOpacity 
                      key={n} 
                      style={[styles.scaleItem, painScore === n && { backgroundColor: painService.getPainColor(n) }]}
                      onPress={() => setPainScore(n)}
                    >
                      <Text style={[styles.scaleNum, painScore === n && { color: '#fff' }]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.faceRow}>
                  <Smile size={24} color={COLORS.success} />
                  <Meh size={24} color={COLORS.warning} />
                  <Frown size={24} color={COLORS.error} />
                </View>

                {/* Location */}
                <Text style={styles.label}>Location</Text>
                <View style={styles.chipRow}>
                  {painService.PAIN_LOCATIONS.map((loc) => (
                    <TouchableOpacity 
                      key={loc} 
                      style={[styles.chip, location === loc && styles.chipSelected]}
                      onPress={() => setLocation(loc)}
                    >
                      <Text style={[styles.chipText, location === loc && { color: '#fff' }]}>{loc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Character */}
                <Text style={styles.label}>Character (optional)</Text>
                <View style={styles.chipRow}>
                  {painService.PAIN_CHARACTERS.slice(0, 6).map((ch) => (
                    <TouchableOpacity 
                      key={ch} 
                      style={[styles.chip, character === ch && styles.chipSelected]}
                      onPress={() => setCharacter(character === ch ? '' : ch)}
                    >
                      <Text style={[styles.chipText, character === ch && { color: '#fff' }]}>{ch}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Intervention */}
                <Text style={styles.label}>Intervention (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={intervention}
                  onChangeText={setIntervention}
                  placeholder="e.g. Pain medication given, repositioned..."
                  placeholderTextColor={COLORS.textMuted}
                />

                {/* Notes */}
                <Text style={styles.label}>Notes (optional)</Text>
                <TextInput
                  style={[styles.input, { height: 80 }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Additional observations..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                />

                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                  <LinearGradient colors={[painService.getPainColor(painScore), COLORS.primary]} style={styles.submitGradient}>
                    <Check size={20} color="#fff" />
                    <Text style={styles.submitText}>Record Assessment</Text>
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
  addBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 14 },
  patientName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 24, textAlign: 'center', marginBottom: SPACING.m },
  latestCard: { marginHorizontal: SPACING.m, padding: SPACING.m },
  latestTitle: { fontFamily: FONTS.medium, color: COLORS.textMuted, fontSize: 12, textAlign: 'center' },
  painDisplay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: SPACING.m },
  painCircle: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  painNumber: { fontFamily: FONTS.bold, color: '#fff', fontSize: 32 },
  painLabel: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 20 },
  painLocation: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 14 },
  latestTime: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11, textAlign: 'center' },
  sectionTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginBottom: SPACING.m },
  loadingText: { color: COLORS.textSecondary, textAlign: 'center' },
  emptyCard: { padding: SPACING.xl, alignItems: 'center' },
  emptyText: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginTop: SPACING.m },
  emptySubtext: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 13 },
  historyCard: { padding: SPACING.m, marginBottom: SPACING.s },
  historyRow: { flexDirection: 'row', alignItems: 'center' },
  historyDot: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  historyScore: { fontFamily: FONTS.bold, color: '#fff', fontSize: 16 },
  historyInfo: { flex: 1, marginLeft: 12 },
  historyLabel: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  historyChar: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 12 },
  historyIntervention: { fontFamily: FONTS.regular, color: COLORS.primary, fontSize: 11, marginTop: 2 },
  historyTime: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.m, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m },
  modalTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 20 },
  label: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 13, marginBottom: 6, marginTop: SPACING.m },
  scaleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleItem: { width: 28, height: 40, borderRadius: 6, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  scaleNum: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  faceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 8, marginBottom: SPACING.m },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.surface, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 12 },
  input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.m, fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  submitBtn: { marginTop: SPACING.l, marginBottom: SPACING.m },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, padding: 16 },
  submitText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 16, marginLeft: 8 },
});

export default PainAssessmentScreen;
