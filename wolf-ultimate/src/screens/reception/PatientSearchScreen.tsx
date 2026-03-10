import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Search, User, Phone, CreditCard, Calendar, ChevronRight } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

interface PatientResult {
  id: number; uhid: string; name: string; phone: string; age: number;
  gender: 'M' | 'F' | 'O'; last_visit: string; total_visits: number;
  blood_group: string; insurance?: string; aadhaar_last4?: string;
}

const MOCK_PATIENTS: PatientResult[] = [
  { id: 1, uhid: 'UHID-5001', name: 'Rakesh Kumar', phone: '9876543210', age: 52, gender: 'M', last_visit: '2026-03-05', total_visits: 8, blood_group: 'B+', insurance: 'Star Health', aadhaar_last4: '4567' },
  { id: 2, uhid: 'UHID-5002', name: 'Anita Devi', phone: '9876543211', age: 38, gender: 'F', last_visit: '2026-03-04', total_visits: 3, blood_group: 'O+', aadhaar_last4: '8901' },
  { id: 3, uhid: 'UHID-2004', name: 'Priya Nair', phone: '9876543212', age: 28, gender: 'F', last_visit: '2026-03-03', total_visits: 5, blood_group: 'A+', insurance: 'CGHS' },
  { id: 4, uhid: 'UHID-5003', name: 'Vijay Singh', phone: '9876543213', age: 64, gender: 'M', last_visit: '2026-02-28', total_visits: 12, blood_group: 'AB+', aadhaar_last4: '2345' },
  { id: 5, uhid: 'UHID-5004', name: 'Sunita Gupta', phone: '9876543214', age: 45, gender: 'F', last_visit: '2026-03-01', total_visits: 2, blood_group: 'O-' },
  { id: 6, uhid: 'UHID-3001', name: 'Sunil Verma', phone: '9876543215', age: 58, gender: 'M', last_visit: '2026-03-05', total_visits: 15, blood_group: 'B-', insurance: 'Max Bupa', aadhaar_last4: '6789' },
];

export const PatientSearchScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientResult[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = () => {
    if (!query.trim()) return;
    setSearched(true);
    const q = query.toLowerCase();
    setResults(MOCK_PATIENTS.filter(p =>
      p.name.toLowerCase().includes(q) || p.uhid.toLowerCase().includes(q) ||
      p.phone.includes(q) || (p.aadhaar_last4 && p.aadhaar_last4.includes(q))
    ));
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Patient Search</Text>
            <Text style={styles.headerSub}>Search by Name, UHID, Phone, Aadhaar</Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Name / UHID / Phone / Aadhaar..."
              placeholderTextColor={COLORS.textMuted}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Search size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {searched && results.length === 0 && (
            <View style={styles.emptyState}>
              <User size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No patients found</Text>
              <Text style={styles.emptyText}>Try a different name, UHID, or phone number</Text>
            </View>
          )}

          {results.map(patient => (
            <TouchableOpacity key={patient.id}>
              <GlassCard style={styles.patCard}>
                <View style={styles.patTop}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{patient.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patName}>{patient.name}</Text>
                    <Text style={styles.patUhid}>{patient.uhid} • {patient.age}y/{patient.gender} • {patient.blood_group}</Text>
                  </View>
                  <ChevronRight size={16} color={COLORS.textMuted} />
                </View>
                <View style={styles.patDetail}>
                  <View style={styles.detailItem}><Phone size={12} color={COLORS.textMuted} /><Text style={styles.detailText}>{patient.phone}</Text></View>
                  {patient.insurance && <View style={styles.detailItem}><CreditCard size={12} color="#10b981" /><Text style={[styles.detailText, { color: '#10b981' }]}>{patient.insurance}</Text></View>}
                  <View style={styles.detailItem}><Calendar size={12} color={COLORS.textMuted} /><Text style={styles.detailText}>Last: {new Date(patient.last_visit).toLocaleDateString()}</Text></View>
                  <View style={styles.visitBadge}><Text style={styles.visitText}>{patient.total_visits} visits</Text></View>
                </View>
              </GlassCard>
            </TouchableOpacity>
          ))}

          {!searched && (
            <View style={styles.emptyState}>
              <Search size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Power Search</Text>
              <Text style={styles.emptyText}>Search across Name, UHID, Phone, and Aadhaar last 4 digits</Text>
            </View>
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
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: SPACING.m, marginBottom: SPACING.s },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14 },
  searchBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  patCard: { padding: SPACING.m, marginBottom: 10, borderWidth: 0 },
  patTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 18 },
  patName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16 },
  patUhid: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  patDetail: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 11 },
  visitBadge: { backgroundColor: COLORS.primary + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  visitText: { fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 10 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18 },
  emptyText: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },
});
