import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Plus, Send } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

const FOOD_LIBRARY = [
  { name: 'Brown Rice', cal: 216, protein: 5, carbs: 45, fat: 2, category: 'Grains' },
  { name: 'Oats Roti', cal: 120, protein: 4, carbs: 20, fat: 3, category: 'Grains' },
  { name: 'Chicken Curry', cal: 250, protein: 28, carbs: 8, fat: 12, category: 'Protein' },
  { name: 'Paneer Bhurji', cal: 200, protein: 14, carbs: 6, fat: 14, category: 'Protein' },
  { name: 'Dal Tadka', cal: 150, protein: 9, carbs: 22, fat: 4, category: 'Protein' },
  { name: 'Egg White Omelette', cal: 70, protein: 11, carbs: 1, fat: 0, category: 'Protein' },
  { name: 'Steamed Fish', cal: 130, protein: 22, carbs: 0, fat: 4, category: 'Protein' },
  { name: 'Lauki Sabzi', cal: 60, protein: 2, carbs: 10, fat: 2, category: 'Vegetable' },
  { name: 'Palak', cal: 45, protein: 3, carbs: 6, fat: 1, category: 'Vegetable' },
  { name: 'Mixed Salad', cal: 30, protein: 1, carbs: 6, fat: 0, category: 'Vegetable' },
  { name: 'Curd (Low-fat)', cal: 60, protein: 4, carbs: 5, fat: 2, category: 'Dairy' },
  { name: 'Buttermilk', cal: 40, protein: 3, carbs: 5, fat: 1, category: 'Dairy' },
  { name: 'Apple', cal: 52, protein: 0, carbs: 14, fat: 0, category: 'Fruit' },
  { name: 'Banana', cal: 89, protein: 1, carbs: 23, fat: 0, category: 'Fruit' },
];

const CAT_COLORS: Record<string, string> = { Grains: '#f59e0b', Protein: '#ef4444', Vegetable: '#10b981', Dairy: '#3b82f6', Fruit: '#8b5cf6' };
type MealKey = 'breakfast' | 'lunch' | 'dinner' | 'snacks';
const MEALS: MealKey[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

export const MealPlanningScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [activeMeal, setActiveMeal] = useState<MealKey>('lunch');
  const [plan, setPlan] = useState<Record<MealKey, typeof FOOD_LIBRARY>>({ breakfast: [], lunch: [], dinner: [], snacks: [] });

  const addItem = (item: typeof FOOD_LIBRARY[0]) => {
    setPlan(prev => ({ ...prev, [activeMeal]: [...prev[activeMeal], item] }));
  };

  const totalCal = Object.values(plan).flat().reduce((s, i) => s + i.cal, 0);
  const totalProtein = Object.values(plan).flat().reduce((s, i) => s + i.protein, 0);
  const target = 2200;

  const handleSubmit = () => {
    Alert.alert('Save Meal Plan', `Total: ${totalCal} kcal / ${target} target\n\nSend to kitchen for Rakesh Kumar?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Save & Send', onPress: () => Alert.alert('✅ Meal Plan Saved', 'Kitchen notified. Tray card generated.') },
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Meal Plan</Text>
            <Text style={styles.headerSub}>Rakesh Kumar • HIGH PROTEIN • 2200 kcal</Text>
          </View>
        </View>

        {/* Calorie Bar */}
        <View style={styles.calBar}>
          <Text style={styles.calText}>{totalCal} / {target} kcal</Text>
          <View style={styles.barTrack}><View style={[styles.barFill, { width: `${Math.min(100, (totalCal / target) * 100)}%` as any, backgroundColor: totalCal > target ? '#ef4444' : '#10b981' }]} /></View>
          <Text style={styles.macroText}>P: {totalProtein}g</Text>
        </View>

        {/* Meal Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mealTabs} contentContainerStyle={{ paddingHorizontal: SPACING.m, gap: 8 }}>
          {MEALS.map(m => (
            <TouchableOpacity key={m} style={[styles.mealTab, activeMeal === m && styles.mealTabActive]} onPress={() => setActiveMeal(m)}>
              <Text style={[styles.mealTabText, activeMeal === m && styles.mealTabTextActive]}>{m.charAt(0).toUpperCase() + m.slice(1)} ({plan[m].length})</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 120 }}>
          {/* Current Meal Items */}
          {plan[activeMeal].length > 0 && (
            <GlassCard style={styles.mealCard}>
              {plan[activeMeal].map((item, i) => (
                <View key={i} style={styles.mealItem}>
                  <View style={[styles.catDot, { backgroundColor: CAT_COLORS[item.category] || '#3b82f6' }]} />
                  <Text style={styles.mealItemName}>{item.name}</Text>
                  <Text style={styles.mealItemCal}>{item.cal} kcal</Text>
                </View>
              ))}
            </GlassCard>
          )}

          {/* Food Library */}
          <Text style={styles.secTitle}>Add Food Items</Text>
          <View style={styles.foodGrid}>
            {FOOD_LIBRARY.map((item, i) => (
              <TouchableOpacity key={i} style={styles.foodCard} onPress={() => addItem(item)}>
                <View style={[styles.catDot, { backgroundColor: CAT_COLORS[item.category] || '#3b82f6' }]} />
                <Text style={styles.foodName}>{item.name}</Text>
                <Text style={styles.foodCal}>{item.cal} kcal • P{item.protein}</Text>
                <Plus size={14} color={COLORS.primary} style={{ position: 'absolute', top: 6, right: 6 }} />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <LinearGradient colors={['#10b981', '#059669']} style={styles.submitGrad}>
              <Send size={18} color="#fff" /><Text style={styles.submitText}>Save & Send to Kitchen</Text>
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
  calBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: SPACING.m, marginBottom: SPACING.s },
  calText: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 13, minWidth: 100 },
  barTrack: { flex: 1, height: 6, backgroundColor: COLORS.surface, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%' as any, borderRadius: 3 },
  macroText: { fontFamily: FONTS.bold, color: '#8b5cf6', fontSize: 11 },
  mealTabs: { maxHeight: 42, marginBottom: 4 },
  mealTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  mealTabActive: { backgroundColor: '#10b98120', borderColor: '#10b981' },
  mealTabText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12 },
  mealTabTextActive: { color: '#10b981', fontFamily: FONTS.bold },
  mealCard: { padding: 12, marginBottom: SPACING.m, borderWidth: 0 },
  mealItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  mealItemName: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 13, flex: 1 },
  mealItemCal: { fontFamily: FONTS.bold, color: COLORS.textMuted, fontSize: 11 },
  secTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginBottom: SPACING.s },
  foodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.l },
  foodCard: { width: '47%' as any, flexGrow: 1, padding: 12, borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  foodName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 12, marginTop: 4 },
  foodCal: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  submitBtn: { borderRadius: 18, overflow: 'hidden' },
  submitGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 18 },
  submitText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 15 },
});
