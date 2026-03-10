import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, User, Phone, Calendar, ChevronRight, Filter } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import apiClient from '../../api/client';

interface Patient {
    id: string; uhid: string; name: string; age: number; gender: string;
    phone: string; last_visit?: string; blood_group?: string; active_admission?: boolean;
}

export const PatientSearchScreen = ({ navigation }: any) => {
    const { COLORS } = useTheme();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const styles = getStyles(COLORS);

    const demoPatients: Patient[] = [
        { id: '1', uhid: 'WH-2024-001', name: 'Rajesh Kumar', age: 45, gender: 'M', phone: '9876543210', last_visit: '2026-03-01', blood_group: 'B+', active_admission: false },
        { id: '2', uhid: 'WH-2024-002', name: 'Priya Sharma', age: 32, gender: 'F', phone: '9876543211', last_visit: '2026-02-28', blood_group: 'O+', active_admission: false },
        { id: '3', uhid: 'WH-2024-003', name: 'Amit Patel', age: 58, gender: 'M', phone: '9876543212', last_visit: '2026-03-02', blood_group: 'A+', active_admission: true },
        { id: '4', uhid: 'WH-2024-004', name: 'Sunita Devi', age: 67, gender: 'F', phone: '9876543213', last_visit: '2026-02-25', blood_group: 'AB+' },
        { id: '5', uhid: 'WH-2024-005', name: 'Vikram Singh', age: 29, gender: 'M', phone: '9876543214', blood_group: 'B-' },
        { id: '6', uhid: 'WH-2024-006', name: 'Lakshmi Nair', age: 41, gender: 'F', phone: '9876543215', last_visit: '2026-01-15', blood_group: 'O-' },
        { id: '7', uhid: 'WH-2024-007', name: 'Gopal Das', age: 55, gender: 'M', phone: '9876543216', last_visit: '2026-03-01', blood_group: 'A-', active_admission: true },
    ];

    const searchPatients = async (q: string) => {
        setQuery(q);
        if (q.length < 2) { setResults([]); setSearched(false); return; }
        setSearched(true);
        setLoading(true);
        try {
            const res = await apiClient.get(`/api/patients/search?q=${q}`);
            setResults(res.data?.patients || demoPatients.filter(p => 
                p.name.toLowerCase().includes(q.toLowerCase()) ||
                p.uhid.toLowerCase().includes(q.toLowerCase()) ||
                p.phone.includes(q)
            ));
        } catch {
            setResults(demoPatients.filter(p => 
                p.name.toLowerCase().includes(q.toLowerCase()) ||
                p.uhid.toLowerCase().includes(q.toLowerCase()) ||
                p.phone.includes(q)
            ));
        } finally { setLoading(false); }
    };

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <View style={styles.header}>
                <Text style={styles.title}>Patient Search</Text>
            </View>

            <View style={styles.searchBox}>
                <Search size={20} color={COLORS.textMuted} />
                <TextInput style={styles.searchInput} placeholder="Search by name, UHID, phone number..." placeholderTextColor={COLORS.textMuted} value={query} onChangeText={searchPatients} autoFocus />
            </View>

            <FlatList
                data={results}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingHorizontal: SPACING.m, paddingBottom: 100 }}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Search size={48} color={COLORS.textMuted} />
                        <Text style={styles.emptyText}>{searched ? 'No patients found' : 'Search by name, UHID, or phone'}</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => navigation.navigate('PatientDetail', { patientId: item.id, patientName: item.name })}>
                        <GlassCard style={styles.card}>
                            <View style={styles.cardRow}>
                                <View style={styles.avatar}>
                                    <User size={20} color={COLORS.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={styles.nameRow}>
                                        <Text style={styles.patientName}>{item.name}</Text>
                                        {item.active_admission && (
                                            <View style={[styles.admBadge, { backgroundColor: COLORS.error + '20' }]}>
                                                <Text style={[styles.admText, { color: COLORS.error }]}>IPD</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.uhid}>{item.uhid} · {item.age}y/{item.gender} · {item.blood_group}</Text>
                                    <View style={styles.metaRow}>
                                        <Phone size={12} color={COLORS.textMuted} />
                                        <Text style={styles.metaText}>{item.phone}</Text>
                                        {item.last_visit && (
                                            <>
                                                <Calendar size={12} color={COLORS.textMuted} />
                                                <Text style={styles.metaText}>Last: {item.last_visit}</Text>
                                            </>
                                        )}
                                    </View>
                                </View>
                                <ChevronRight size={18} color={COLORS.textMuted} />
                            </View>
                        </GlassCard>
                    </TouchableOpacity>
                )}
            />
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { paddingHorizontal: SPACING.l, paddingTop: SPACING.m },
    title: { fontSize: 28, fontFamily: FONTS.bold, color: COLORS.text },
    searchBox: { flexDirection: 'row', alignItems: 'center', margin: SPACING.m, backgroundColor: COLORS.surface, borderRadius: 14, paddingHorizontal: SPACING.m, gap: SPACING.s, borderWidth: 1, borderColor: COLORS.border },
    searchInput: { flex: 1, color: COLORS.text, fontFamily: FONTS.regular, paddingVertical: 14, fontSize: 15 },
    card: { marginBottom: SPACING.s },
    cardRow: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: SPACING.m },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    patientName: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
    uhid: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textSecondary, marginTop: 2 },
    admBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
    admText: { fontSize: 10, fontFamily: FONTS.bold },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    metaText: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textMuted },
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyText: { fontSize: 15, fontFamily: FONTS.medium, color: COLORS.textMuted, marginTop: SPACING.m },
});
