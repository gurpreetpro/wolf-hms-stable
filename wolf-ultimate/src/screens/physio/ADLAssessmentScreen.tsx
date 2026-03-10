import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Send } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

const ADL_ITEMS = [
  { id: 1, category: 'Self-Care', item: 'Feeding', levels: ['Dependent', 'Max Assist', 'Mod Assist', 'Min Assist', 'Supervision', 'Modified Independent', 'Independent'] },
  { id: 2, category: 'Self-Care', item: 'Grooming', levels: ['Dependent', 'Max Assist', 'Mod Assist', 'Min Assist', 'Supervision', 'Modified Independent', 'Independent'] },
  { id: 3, category: 'Self-Care', item: 'Bathing', levels: ['Dependent', 'Max Assist', 'Mod Assist', 'Min Assist', 'Supervision', 'Modified Independent', 'Independent'] },
  { id: 4, category: 'Self-Care', item: 'Dressing Upper', levels: ['Dependent', 'Max Assist', 'Mod Assist', 'Min Assist', 'Supervision', 'Modified Independent', 'Independent'] },
  { id: 5, category: 'Self-Care', item: 'Dressing Lower', levels: ['Dependent', 'Max Assist', 'Mod Assist', 'Min Assist', 'Supervision', 'Modified Independent', 'Independent'] },
  { id: 6, category: 'Self-Care', item: 'Toileting', levels: ['Dependent', 'Max Assist', 'Mod Assist', 'Min Assist', 'Supervision', 'Modified Independent', 'Independent'] },
  { id: 7, category: 'Mobility', item: 'Bed Mobility', levels: ['Dependent', 'Max Assist', 'Mod Assist', 'Min Assist', 'Supervision', 'Modified Independent', 'Independent'] },
  { id: 8, category: 'Mobility', item: 'Transfers', levels: ['Dependent', 'Max Assist', 'Mod Assist', 'Min Assist', 'Supervision', 'Modified Independent', 'Independent'] },
  { id: 9, category: 'Mobility', item: 'Ambulation', levels: ['Dependent', 'Max Assist', 'Mod Assist', 'Min Assist', 'Supervision', 'Modified Independent', 'Independent'] },
  { id: 10, category: 'Mobility', item: 'Stairs', levels: ['Dependent', 'Max Assist', 'Mod Assist', 'Min Assist', 'Supervision', 'Modified Independent', 'Independent'] },
];

const LEVEL_COLORS = ['#ef4444', '#f59e0b', '#f59e0b', '#eab308', '#3b82f6', '#10b981', '#10b981'];

export const ADLAssessmentScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [scores, setScores] = useState<Record<number, number>>({});

  const setScore = (id: number, level: number) => setScores(prev => ({ ...prev, [id]: level }));

  const totalScore = Object.values(scores).reduce((sum, s) => sum + (s + 1), 0);
  const maxScore = ADL_ITEMS.length * 7;
  const pct = Math.round((totalScore / maxScore) * 100);

  const handleSubmit = () => {
    if (Object.keys(scores).length < ADL_ITEMS.length) {
      Alert.alert('Incomplete', 'Please score all ADL items.'); return;
    }
    Alert.alert('Save Assessment', `ADL Score: ${totalScore}/${maxScore} (${pct}%)\n\nSave for Rakesh Kumar?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Save', onPress: () => Alert.alert('✅ Saved', 'ADL assessment recorded.') },
    ]);
  };

  let currentCategory = '';

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>ADL Assessment</Text>
            <Text style={styles.headerSub}>Rakesh Kumar • Post TKR Right Knee</Text>
          </View>
          <View style={styles.scoreBadge}><Text style={styles.scoreText}>{totalScore}/{maxScore}</Text></View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 120 }}>
          {ADL_ITEMS.map(item => {
            const showCat = item.category !== currentCategory;
            currentCategory = item.category;
            const selected = scores[item.id];
            return (
              <View key={item.id}>
                {showCat && <Text style={styles.catTitle}>{item.category}</Text>}
                <GlassCard style={styles.itemCard}>
                  <Text style={styles.itemName}>{item.item}</Text>
                  <View style={styles.levelRow}>
                    {item.levels.map((level, li) => (
                      <TouchableOpacity key={li} style={[styles.levelChip, selected === li && { backgroundColor: LEVEL_COLORS[li] + '20', borderColor: LEVEL_COLORS[li] }]} onPress={() => setScore(item.id, li)}>
                        <Text style={[styles.levelNum, selected === li && { color: LEVEL_COLORS[li] }]}>{li + 1}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {selected !== undefined && <Text style={[styles.levelLabel, { color: LEVEL_COLORS[selected] }]}>{item.levels[selected]}</Text>}
                </GlassCard>
              </View>
            );
          })}

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.submitGrad}>
              <Send size={18} color="#fff" /><Text style={styles.submitText}>Save Assessment ({pct}%)</Text>
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
  scoreBadge: { backgroundColor: COLORS.primary + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  scoreText: { fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 14 },
  catTitle: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' as any, marginTop: SPACING.m, marginBottom: 8, marginLeft: 4 },
  itemCard: { padding: 12, marginBottom: 8, borderWidth: 0 },
  itemName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14, marginBottom: 8 },
  levelRow: { flexDirection: 'row', gap: 6 },
  levelChip: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border },
  levelNum: { fontFamily: FONTS.bold, color: COLORS.textMuted, fontSize: 14 },
  levelLabel: { fontFamily: FONTS.medium, fontSize: 11, marginTop: 6 },
  submitBtn: { borderRadius: 18, overflow: 'hidden', marginTop: SPACING.l },
  submitGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 18 },
  submitText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 15 },
});
