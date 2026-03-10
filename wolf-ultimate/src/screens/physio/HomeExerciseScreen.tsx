import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Send, Home, Dumbbell, Clock, RotateCcw } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

interface HomeExercise {
  id: number; name: string; sets: number; reps: number; hold_sec?: number;
  frequency: string; instructions: string; video_ref?: string;
  category: string;
}

const MOCK_PLAN: HomeExercise[] = [
  { id: 1, name: 'Quad Sets', sets: 3, reps: 10, hold_sec: 5, frequency: '3x daily', instructions: 'Sit with leg straight. Tighten thigh muscle. Push back of knee into surface. Hold 5 sec. Relax.', category: 'STRENGTHENING' },
  { id: 2, name: 'Heel Slides', sets: 3, reps: 10, frequency: '3x daily', instructions: 'Lie on back. Slide heel toward buttock, bending knee. Hold 2 sec. Slide back. Repeat.', category: 'ROM' },
  { id: 3, name: 'Straight Leg Raise', sets: 3, reps: 10, hold_sec: 5, frequency: '2x daily', instructions: 'Lie on back. Tighten quad. Lift leg 12 inches off bed. Hold 5 sec. Lower slowly.', category: 'STRENGTHENING' },
  { id: 4, name: 'Ankle Pumps', sets: 1, reps: 20, frequency: 'Hourly', instructions: 'Pump ankles up and down. Do 20 reps every hour while awake. Helps prevent DVT.', category: 'ROM' },
  { id: 5, name: 'Seated Knee Extension', sets: 3, reps: 10, hold_sec: 3, frequency: '2x daily', instructions: 'Sit on chair. Straighten knee fully. Hold 3 sec. Lower slowly. Use ankle weight when able.', category: 'STRENGTHENING' },
  { id: 6, name: 'Standing Calf Stretch', sets: 3, reps: 1, hold_sec: 30, frequency: '2x daily', instructions: 'Face wall. Step back with affected leg. Keep heel on floor. Lean forward until stretch is felt. Hold 30 sec.', category: 'STRETCHING' },
];

const CAT_COLORS: Record<string, string> = { STRENGTHENING: '#ef4444', ROM: '#3b82f6', STRETCHING: '#10b981' };

export const HomeExerciseScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [expanded, setExpanded] = useState<number | null>(null);

  const handleSend = () => {
    Alert.alert('Send to Patient', 'Send this home exercise plan to Rakesh Kumar via Wolf Care app?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send', onPress: () => Alert.alert('✅ Sent', 'Home exercise plan delivered to Wolf Care app.') },
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Home Exercise Plan</Text>
            <Text style={styles.headerSub}>Rakesh Kumar • Post TKR Right Knee</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 120 }}>
          {/* Info Banner */}
          <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.infoBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Home size={20} color="#06b6d4" />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>{MOCK_PLAN.length} exercises prescribed</Text>
              <Text style={styles.infoSub}>Patient can view with video guides in Wolf Care</Text>
            </View>
          </LinearGradient>

          {MOCK_PLAN.map(ex => {
            const catColor = CAT_COLORS[ex.category] || COLORS.primary;
            const isExpanded = expanded === ex.id;
            return (
              <TouchableOpacity key={ex.id} onPress={() => setExpanded(isExpanded ? null : ex.id)}>
                <GlassCard style={styles.exCard}>
                  <View style={styles.exTop}>
                    <View style={[styles.catDot, { backgroundColor: catColor }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.exName}>{ex.name}</Text>
                      <Text style={styles.exMeta}>{ex.category}</Text>
                    </View>
                    <View style={styles.freqBadge}><Clock size={10} color={COLORS.primary} /><Text style={styles.freqText}>{ex.frequency}</Text></View>
                  </View>

                  <View style={styles.paramRow}>
                    <View style={styles.paramChip}><Dumbbell size={12} color={COLORS.textMuted} /><Text style={styles.paramText}>{ex.sets} × {ex.reps}</Text></View>
                    {ex.hold_sec != null && <View style={styles.paramChip}><RotateCcw size={12} color={COLORS.textMuted} /><Text style={styles.paramText}>Hold {ex.hold_sec}s</Text></View>}
                  </View>

                  {isExpanded && (
                    <View style={styles.instrBox}>
                      <Text style={styles.instrLabel}>Instructions</Text>
                      <Text style={styles.instrText}>{ex.instructions}</Text>
                    </View>
                  )}
                </GlassCard>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <LinearGradient colors={['#06b6d4', '#0891b2']} style={styles.sendGrad}>
              <Send size={18} color="#fff" /><Text style={styles.sendText}>Send Plan to Wolf Care</Text>
            </LinearGradient>
          </TouchableOpacity>
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
  infoBanner: { borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: SPACING.l, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  infoTitle: { fontFamily: FONTS.bold, color: '#fff', fontSize: 14 },
  infoSub: { fontFamily: FONTS.regular, color: '#94a3b8', fontSize: 11, marginTop: 2 },
  exCard: { padding: SPACING.m, marginBottom: 8, borderWidth: 0 },
  exTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  exName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  exMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  freqBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  freqText: { fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 10 },
  paramRow: { flexDirection: 'row', gap: 8 },
  paramChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surface, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  paramText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 11 },
  instrBox: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginTop: 10, borderWidth: 1, borderColor: COLORS.border },
  instrLabel: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 10, letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' as any },
  instrText: { fontFamily: FONTS.regular, color: COLORS.text, fontSize: 13, lineHeight: 20 },
  sendBtn: { borderRadius: 18, overflow: 'hidden', marginTop: SPACING.l },
  sendGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 18 },
  sendText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 15 },
});
