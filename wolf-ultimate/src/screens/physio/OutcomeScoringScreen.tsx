import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Send, TrendingUp } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

const FIM_DOMAINS = [
  { domain: 'Self-Care', items: ['Eating', 'Grooming', 'Bathing', 'Dressing Upper', 'Dressing Lower', 'Toileting'] },
  { domain: 'Sphincter Control', items: ['Bladder Management', 'Bowel Management'] },
  { domain: 'Transfers', items: ['Bed/Chair/Wheelchair', 'Toilet', 'Tub/Shower'] },
  { domain: 'Locomotion', items: ['Walk/Wheelchair', 'Stairs'] },
  { domain: 'Communication', items: ['Comprehension', 'Expression'] },
  { domain: 'Social Cognition', items: ['Social Interaction', 'Problem Solving', 'Memory'] },
];

const FIM_LEVELS = [
  { score: 1, label: 'Total Assist', color: '#ef4444' },
  { score: 2, label: 'Max Assist', color: '#f97316' },
  { score: 3, label: 'Mod Assist', color: '#f59e0b' },
  { score: 4, label: 'Min Assist', color: '#eab308' },
  { score: 5, label: 'Supervision', color: '#3b82f6' },
  { score: 6, label: 'Mod Indep', color: '#10b981' },
  { score: 7, label: 'Complete Indep', color: '#059669' },
];

export const OutcomeScoringScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [scores, setScores] = useState<Record<string, number>>({});

  const allItems = FIM_DOMAINS.flatMap(d => d.items);
  const totalScore = Object.values(scores).reduce((s, v) => s + v, 0);
  const maxScore = allItems.length * 7;
  const minScore = allItems.length;
  const pct = maxScore > 0 ? Math.round(((totalScore - minScore) / (maxScore - minScore)) * 100) : 0;

  const getInterpretation = () => {
    if (totalScore === 0) return { label: 'Not Scored', color: COLORS.textMuted };
    if (totalScore < 36) return { label: 'Total Dependence', color: '#ef4444' };
    if (totalScore < 72) return { label: 'Modified Dependence', color: '#f59e0b' };
    if (totalScore < 108) return { label: 'Modified Independence', color: '#3b82f6' };
    return { label: 'Complete Independence', color: '#10b981' };
  };

  const interp = getInterpretation();

  const handleSubmit = () => {
    if (Object.keys(scores).length < allItems.length) {
      Alert.alert('Incomplete', `Score all ${allItems.length} items (${Object.keys(scores).length} done).`); return;
    }
    Alert.alert('Save FIM Score', `Total: ${totalScore}/${maxScore}\n${interp.label}\n\nSave for Rakesh Kumar?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Save', onPress: () => Alert.alert('✅ Saved', 'FIM outcome score recorded.') },
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>FIM Scoring</Text>
            <Text style={styles.headerSub}>Functional Independence Measure</Text>
          </View>
        </View>

        {/* Score Banner */}
        <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.bannerRow}>
            <View>
              <Text style={[styles.bannerScore, { color: interp.color }]}>{totalScore || '—'}</Text>
              <Text style={styles.bannerMax}>/ {maxScore}</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={[styles.interpLabel, { color: interp.color }]}>{interp.label}</Text>
              <Text style={styles.bannerPct}>{Object.keys(scores).length}/{allItems.length} items scored</Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 120 }}>
          {FIM_DOMAINS.map(domain => (
            <View key={domain.domain}>
              <Text style={styles.domainTitle}>{domain.domain}</Text>
              {domain.items.map(item => {
                const key = `${domain.domain}-${item}`;
                const selected = scores[key];
                return (
                  <GlassCard key={key} style={styles.itemCard}>
                    <Text style={styles.itemName}>{item}</Text>
                    <View style={styles.scoreRow}>
                      {FIM_LEVELS.map(level => (
                        <TouchableOpacity key={level.score} style={[styles.scoreChip, selected === level.score && { backgroundColor: level.color + '20', borderColor: level.color }]} onPress={() => setScores(prev => ({ ...prev, [key]: level.score }))}>
                          <Text style={[styles.scoreNum, selected === level.score && { color: level.color }]}>{level.score}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {selected !== undefined && (
                      <Text style={[styles.scoreLabel, { color: FIM_LEVELS[selected - 1].color }]}>{FIM_LEVELS[selected - 1].label}</Text>
                    )}
                  </GlassCard>
                );
              })}
            </View>
          ))}

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <LinearGradient colors={['#10b981', '#059669']} style={styles.submitGrad}>
              <TrendingUp size={18} color="#fff" /><Text style={styles.submitText}>Save FIM Score ({totalScore}/{maxScore})</Text>
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
  banner: { marginHorizontal: SPACING.m, borderRadius: 20, padding: 18, marginBottom: SPACING.m, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  bannerRow: { flexDirection: 'row', alignItems: 'center' },
  bannerScore: { fontFamily: FONTS.bold, fontSize: 36 },
  bannerMax: { fontFamily: FONTS.medium, color: '#94a3b8', fontSize: 14 },
  interpLabel: { fontFamily: FONTS.bold, fontSize: 14, marginBottom: 4 },
  bannerPct: { fontFamily: FONTS.regular, color: '#94a3b8', fontSize: 12 },
  domainTitle: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' as any, marginTop: SPACING.m, marginBottom: 8, marginLeft: 4 },
  itemCard: { padding: 12, marginBottom: 8, borderWidth: 0 },
  itemName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14, marginBottom: 8 },
  scoreRow: { flexDirection: 'row', gap: 6 },
  scoreChip: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border },
  scoreNum: { fontFamily: FONTS.bold, color: COLORS.textMuted, fontSize: 14 },
  scoreLabel: { fontFamily: FONTS.medium, fontSize: 11, marginTop: 6 },
  submitBtn: { borderRadius: 18, overflow: 'hidden', marginTop: SPACING.l },
  submitGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 18 },
  submitText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 15 },
});
