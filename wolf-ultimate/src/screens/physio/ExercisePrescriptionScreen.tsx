import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Plus, Trash2, Send, Dumbbell } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

interface ExItem {
  id: number; name: string; category: string; body_part: string;
  sets: string; reps: string; hold: string; intensity: 'LOW' | 'MODERATE' | 'HIGH';
}

const EXERCISE_LIBRARY = [
  { name: 'Quad Sets', category: 'STRENGTHENING', body_part: 'Knee' },
  { name: 'Straight Leg Raise', category: 'STRENGTHENING', body_part: 'Hip/Knee' },
  { name: 'Knee Flexion ROM', category: 'ROM', body_part: 'Knee' },
  { name: 'Wall Slides', category: 'ROM', body_part: 'Shoulder' },
  { name: 'Pendulum Exercise', category: 'ROM', body_part: 'Shoulder' },
  { name: 'Hamstring Stretch', category: 'STRETCHING', body_part: 'Knee/Hip' },
  { name: 'Calf Stretch', category: 'STRETCHING', body_part: 'Ankle' },
  { name: 'Single Leg Stance', category: 'BALANCE', body_part: 'Lower Limb' },
  { name: 'Tandem Walk', category: 'GAIT', body_part: 'Lower Limb' },
  { name: 'Diaphragmatic Breathing', category: 'BREATHING', body_part: 'Chest' },
];

const CAT_COLORS: Record<string, string> = {
  STRENGTHENING: '#ef4444', ROM: '#3b82f6', STRETCHING: '#10b981',
  BALANCE: '#f59e0b', GAIT: '#8b5cf6', BREATHING: '#06b6d4',
};

const INTENSITY: ('LOW' | 'MODERATE' | 'HIGH')[] = ['LOW', 'MODERATE', 'HIGH'];
const INT_COLORS = { LOW: '#10b981', MODERATE: '#f59e0b', HIGH: '#ef4444' };

export const ExercisePrescriptionScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [selected, setSelected] = useState<ExItem[]>([]);
  const [patientName] = useState('Rakesh Kumar — Post TKR Right Knee');

  const addExercise = (ex: typeof EXERCISE_LIBRARY[0]) => {
    setSelected(prev => [...prev, { id: Date.now(), ...ex, sets: '3', reps: '10', hold: '', intensity: 'MODERATE' }]);
  };

  const removeExercise = (id: number) => {
    setSelected(prev => prev.filter(e => e.id !== id));
  };

  const updateField = (id: number, field: keyof ExItem, value: string) => {
    setSelected(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const handleSubmit = () => {
    if (selected.length === 0) { Alert.alert('Required', 'Add at least one exercise.'); return; }
    Alert.alert('Prescribe Exercises', `Send ${selected.length} exercises to ${patientName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Prescribe', onPress: () => { Alert.alert('✅ Prescribed', `${selected.length} exercises sent. Patient can view in Wolf Care.`); setSelected([]); }},
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Exercise Rx</Text>
            <Text style={styles.headerSub}>{patientName}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 120 }}>
          {/* Library */}
          <Text style={styles.secTitle}>Exercise Library</Text>
          <View style={styles.libraryGrid}>
            {EXERCISE_LIBRARY.map((ex, i) => {
              const catColor = CAT_COLORS[ex.category] || COLORS.primary;
              const alreadyAdded = selected.some(s => s.name === ex.name);
              return (
                <TouchableOpacity key={i} style={[styles.libCard, alreadyAdded && { opacity: 0.4 }]} onPress={() => !alreadyAdded && addExercise(ex)} disabled={alreadyAdded}>
                  <View style={[styles.catDot, { backgroundColor: catColor }]} />
                  <Text style={styles.libName}>{ex.name}</Text>
                  <Text style={styles.libMeta}>{ex.category} • {ex.body_part}</Text>
                  {!alreadyAdded && <Plus size={14} color={COLORS.primary} style={{ position: 'absolute', top: 8, right: 8 }} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selected Exercises */}
          {selected.length > 0 && (
            <>
              <Text style={styles.secTitle}>Prescription ({selected.length} exercises)</Text>
              {selected.map(ex => (
                <GlassCard key={ex.id} style={styles.rxCard}>
                  <View style={styles.rxHeader}>
                    <Dumbbell size={16} color={CAT_COLORS[ex.category] || COLORS.primary} />
                    <Text style={styles.rxName}>{ex.name}</Text>
                    <TouchableOpacity onPress={() => removeExercise(ex.id)}><Trash2 size={16} color="#ef4444" /></TouchableOpacity>
                  </View>
                  <View style={styles.rxFields}>
                    <View style={styles.rxField}>
                      <Text style={styles.rxLabel}>Sets</Text>
                      <TextInput style={styles.rxInput} value={ex.sets} onChangeText={v => updateField(ex.id, 'sets', v)} keyboardType="numeric" />
                    </View>
                    <View style={styles.rxField}>
                      <Text style={styles.rxLabel}>Reps</Text>
                      <TextInput style={styles.rxInput} value={ex.reps} onChangeText={v => updateField(ex.id, 'reps', v)} keyboardType="numeric" />
                    </View>
                    <View style={styles.rxField}>
                      <Text style={styles.rxLabel}>Hold(s)</Text>
                      <TextInput style={styles.rxInput} value={ex.hold} onChangeText={v => updateField(ex.id, 'hold', v)} keyboardType="numeric" placeholder="—" placeholderTextColor={COLORS.textMuted} />
                    </View>
                  </View>
                  <View style={styles.intRow}>
                    {INTENSITY.map(int => (
                      <TouchableOpacity key={int} style={[styles.intChip, ex.intensity === int && { backgroundColor: INT_COLORS[int] + '20', borderColor: INT_COLORS[int] }]} onPress={() => updateField(ex.id, 'intensity', int)}>
                        <Text style={[styles.intText, ex.intensity === int && { color: INT_COLORS[int] }]}>{int}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </GlassCard>
              ))}

              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.submitGrad}>
                  <Send size={18} color="#fff" /><Text style={styles.submitText}>Prescribe {selected.length} Exercises</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
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
  secTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginBottom: SPACING.s },
  libraryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.l },
  libCard: { width: '47%' as any, flexGrow: 1, padding: 12, borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  catDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 6 },
  libName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 12 },
  libMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  rxCard: { padding: SPACING.m, marginBottom: 10, borderWidth: 0 },
  rxHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  rxName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14, flex: 1 },
  rxFields: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  rxField: { flex: 1 },
  rxLabel: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 10, letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' as any },
  rxInput: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 14, backgroundColor: COLORS.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.border, textAlign: 'center' },
  intRow: { flexDirection: 'row', gap: 8 },
  intChip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  intText: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 10 },
  submitBtn: { borderRadius: 18, overflow: 'hidden', marginTop: SPACING.m },
  submitGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 18 },
  submitText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 15 },
});
