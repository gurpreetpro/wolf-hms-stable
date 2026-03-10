import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FileText, Plus, X, Check, Clock, Stethoscope, ClipboardList, FileCheck } from 'lucide-react-native';
import { COLORS, FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import clinicalService, { ClinicalNote } from '../../services/clinicalService';

interface Props {
  route?: { params?: { patientId?: string; patientName?: string; visitId?: string } };
  navigation?: any;
}

const NOTE_TYPES: ClinicalNote['note_type'][] = ['SOAP', 'Progress', 'Procedure', 'Consultation', 'Discharge'];

const NOTE_TYPE_ICONS: Record<string, any> = {
  'SOAP': Stethoscope,
  'Progress': ClipboardList,
  'Procedure': FileCheck,
  'Consultation': FileText,
  'Discharge': FileText,
};

export const ClinicalNotesScreen: React.FC<Props> = ({ route, navigation }) => {
  const patientId = route?.params?.patientId;
  const patientName = route?.params?.patientName || 'Patient';
  const visitId = route?.params?.visitId;
  
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedNote, setSelectedNote] = useState<ClinicalNote | null>(null);
  
  // Create note state
  const [noteType, setNoteType] = useState<ClinicalNote['note_type']>('SOAP');
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (patientId) {
      loadNotes();
    }
  }, [patientId]);

  const loadNotes = async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const data = await clinicalService.getPatientNotes(patientId);
      setNotes(data);
    } catch (error) {
      console.error('Failed to load clinical notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNoteType('SOAP');
    setSubjective('');
    setObjective('');
    setAssessment('');
    setPlan('');
    setContent('');
  };

  const submitNote = async () => {
    if (noteType === 'SOAP' && !subjective && !objective && !assessment && !plan) {
      Alert.alert('Add Content', 'Please fill at least one SOAP field');
      return;
    }
    if (noteType !== 'SOAP' && !content) {
      Alert.alert('Add Content', 'Please enter note content');
      return;
    }
    
    try {
      await clinicalService.createNote({
        patient_id: patientId!,
        visit_id: visitId,
        note_type: noteType,
        subjective: noteType === 'SOAP' ? subjective : undefined,
        objective: noteType === 'SOAP' ? objective : undefined,
        assessment: noteType === 'SOAP' ? assessment : undefined,
        plan: noteType === 'SOAP' ? plan : undefined,
        content: noteType !== 'SOAP' ? content : undefined,
      });
      Alert.alert('Success', 'Clinical note created successfully');
      setModalVisible(false);
      resetForm();
      loadNotes();
    } catch (error) {
      Alert.alert('Error', 'Failed to create clinical note');
    }
  };

  const viewNote = (note: ClinicalNote) => {
    setSelectedNote(note);
  };

  const getNoteIcon = (type: string) => {
    const Icon = NOTE_TYPE_ICONS[type] || FileText;
    return Icon;
  };

  const getNoteSummary = (note: ClinicalNote) => {
    if (note.note_type === 'SOAP') {
      return note.assessment || note.subjective || 'SOAP Note';
    }
    return note.content?.substring(0, 100) || 'Clinical Note';
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#111827']} style={StyleSheet.absoluteFill} />
      <BackgroundOrb color={COLORS.warning} position="top-right" />
      
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Clinical Notes</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Plus size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <Text style={styles.patientName}>{patientName}</Text>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {loading ? (
            <Text style={styles.loadingText}>Loading notes...</Text>
          ) : notes.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <FileText size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No clinical notes yet</Text>
              <Text style={styles.emptySubtext}>Tap + to add a note</Text>
            </GlassCard>
          ) : (
            notes.map((note) => {
              const Icon = getNoteIcon(note.note_type);
              return (
                <TouchableOpacity key={note.id} onPress={() => viewNote(note)}>
                  <GlassCard style={styles.noteCard}>
                    <View style={styles.noteHeader}>
                      <View style={styles.noteIconWrap}>
                        <Icon size={18} color={COLORS.warning} />
                      </View>
                      <View style={{ flex: 1, marginLeft: SPACING.s }}>
                        <Text style={styles.noteType}>{note.note_type} Note</Text>
                        <Text style={styles.noteDate}>
                          {new Date(note.created_at).toLocaleDateString()} • {note.doctor_name || 'Doctor'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.noteSummary} numberOfLines={2}>{getNoteSummary(note)}</Text>
                  </GlassCard>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Create Note Modal */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Clinical Note</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1 }}>
                {/* Note Type Selector */}
                <Text style={styles.label}>Note Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.m }}>
                  {NOTE_TYPES.map((type) => (
                    <TouchableOpacity 
                      key={type} 
                      style={[styles.typeBtn, noteType === type && styles.typeBtnActive]} 
                      onPress={() => setNoteType(type)}
                    >
                      <Text style={[styles.typeBtnText, noteType === type && styles.typeBtnTextActive]}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {noteType === 'SOAP' ? (
                  <>
                    <Text style={styles.label}>Subjective (S)</Text>
                    <TextInput
                      style={[styles.input, { height: 80 }]}
                      placeholder="Patient's complaints, symptoms..."
                      placeholderTextColor={COLORS.textMuted}
                      value={subjective}
                      onChangeText={setSubjective}
                      multiline
                    />

                    <Text style={styles.label}>Objective (O)</Text>
                    <TextInput
                      style={[styles.input, { height: 80 }]}
                      placeholder="Physical exam findings, vitals..."
                      placeholderTextColor={COLORS.textMuted}
                      value={objective}
                      onChangeText={setObjective}
                      multiline
                    />

                    <Text style={styles.label}>Assessment (A)</Text>
                    <TextInput
                      style={[styles.input, { height: 80 }]}
                      placeholder="Diagnosis, clinical impression..."
                      placeholderTextColor={COLORS.textMuted}
                      value={assessment}
                      onChangeText={setAssessment}
                      multiline
                    />

                    <Text style={styles.label}>Plan (P)</Text>
                    <TextInput
                      style={[styles.input, { height: 80 }]}
                      placeholder="Treatment plan, follow-up..."
                      placeholderTextColor={COLORS.textMuted}
                      value={plan}
                      onChangeText={setPlan}
                      multiline
                    />
                  </>
                ) : (
                  <>
                    <Text style={styles.label}>Note Content</Text>
                    <TextInput
                      style={[styles.input, { height: 200 }]}
                      placeholder="Enter note details..."
                      placeholderTextColor={COLORS.textMuted}
                      value={content}
                      onChangeText={setContent}
                      multiline
                    />
                  </>
                )}
              </ScrollView>

              <TouchableOpacity style={styles.submitBtn} onPress={submitNote}>
                <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.submitGradient}>
                  <Check size={20} color="#fff" />
                  <Text style={styles.submitText}>Save Note</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* View Note Modal */}
        <Modal visible={!!selectedNote} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedNote?.note_type} Note</Text>
                <TouchableOpacity onPress={() => setSelectedNote(null)}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView>
                <Text style={styles.viewNoteDate}>
                  {selectedNote && new Date(selectedNote.created_at).toLocaleString()}
                </Text>
                <Text style={styles.viewNoteDoctor}>
                  By: {selectedNote?.doctor_name || 'Doctor'}
                </Text>

                {selectedNote?.note_type === 'SOAP' ? (
                  <>
                    {selectedNote.subjective && (
                      <View style={styles.soapSection}>
                        <Text style={styles.soapLabel}>Subjective</Text>
                        <Text style={styles.soapContent}>{selectedNote.subjective}</Text>
                      </View>
                    )}
                    {selectedNote.objective && (
                      <View style={styles.soapSection}>
                        <Text style={styles.soapLabel}>Objective</Text>
                        <Text style={styles.soapContent}>{selectedNote.objective}</Text>
                      </View>
                    )}
                    {selectedNote.assessment && (
                      <View style={styles.soapSection}>
                        <Text style={styles.soapLabel}>Assessment</Text>
                        <Text style={styles.soapContent}>{selectedNote.assessment}</Text>
                      </View>
                    )}
                    {selectedNote.plan && (
                      <View style={styles.soapSection}>
                        <Text style={styles.soapLabel}>Plan</Text>
                        <Text style={styles.soapContent}>{selectedNote.plan}</Text>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={styles.noteContent}>{selectedNote?.content}</Text>
                )}
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
  patientName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 24, paddingHorizontal: SPACING.m, marginBottom: SPACING.s },
  loadingText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 40 },
  emptyCard: { padding: SPACING.xl, alignItems: 'center' },
  emptyText: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginTop: SPACING.m },
  emptySubtext: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 14, marginTop: SPACING.xs },
  noteCard: { padding: SPACING.m, marginBottom: SPACING.m },
  noteHeader: { flexDirection: 'row', alignItems: 'center' },
  noteIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.warning + '20', justifyContent: 'center', alignItems: 'center' },
  noteType: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16 },
  noteDate: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12 },
  noteSummary: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 14, marginTop: SPACING.s, paddingLeft: 44 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.m, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m },
  modalTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 20 },
  label: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 13, marginBottom: SPACING.xs },
  typeBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.surface, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
  typeBtnActive: { backgroundColor: COLORS.warning, borderColor: COLORS.warning },
  typeBtnText: { fontFamily: FONTS.medium, color: COLORS.textMuted, fontSize: 13 },
  typeBtnTextActive: { color: '#fff' },
  input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.m, fontFamily: FONTS.regular, color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.m, textAlignVertical: 'top' },
  submitBtn: { marginTop: SPACING.m },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, padding: 16 },
  submitText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 16, marginLeft: 8 },
  viewNoteDate: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 13, marginBottom: 4 },
  viewNoteDoctor: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 14, marginBottom: SPACING.m },
  soapSection: { marginBottom: SPACING.m },
  soapLabel: { fontFamily: FONTS.bold, color: COLORS.warning, fontSize: 14, marginBottom: 4 },
  soapContent: { fontFamily: FONTS.regular, color: COLORS.text, fontSize: 15, lineHeight: 22 },
  noteContent: { fontFamily: FONTS.regular, color: COLORS.text, fontSize: 15, lineHeight: 22 },
});

export default ClinicalNotesScreen;
