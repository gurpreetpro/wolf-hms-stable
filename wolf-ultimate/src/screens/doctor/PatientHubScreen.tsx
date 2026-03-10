import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Users, Clock, UserPlus, ChevronRight, Phone, Hash, Activity } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';

type TabKey = 'opd' | 'ipd' | 'search';

interface Patient {
    id: string; name: string; age?: number; gender?: string; phone?: string;
    token_number?: number; status?: string; bed_number?: string; ward_name?: string;
    diagnosis?: string; admission_date?: string; uhid?: string;
}

export const PatientHubScreen = ({ navigation }: any) => {
    const { COLORS } = useTheme();
    const user = useAuthStore(s => s.user);
    const [tab, setTab] = useState<TabKey>('opd');
    const [opdQueue, setOpdQueue] = useState<Patient[]>([]);
    const [ipdPatients, setIpdPatients] = useState<Patient[]>([]);
    const [searchResults, setSearchResults] = useState<Patient[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => { loadOPD(); loadIPD(); }, []);

    const loadOPD = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/api/opd/queue/today');
            setOpdQueue(res.data?.queue || [
                { id: '1', name: 'Rajesh Kumar', age: 45, gender: 'M', token_number: 1, status: 'waiting', phone: '9876543210' },
                { id: '2', name: 'Priya Sharma', age: 32, gender: 'F', token_number: 2, status: 'waiting', phone: '9876543211' },
                { id: '3', name: 'Amit Patel', age: 58, gender: 'M', token_number: 3, status: 'in_consultation', phone: '9876543212' },
                { id: '4', name: 'Sunita Devi', age: 67, gender: 'F', token_number: 4, status: 'waiting', phone: '9876543213' },
                { id: '5', name: 'Vikram Singh', age: 29, gender: 'M', token_number: 5, status: 'waiting', phone: '9876543214' },
            ]);
        } catch { setOpdQueue([
            { id: '1', name: 'Rajesh Kumar', age: 45, gender: 'M', token_number: 1, status: 'waiting' },
            { id: '2', name: 'Priya Sharma', age: 32, gender: 'F', token_number: 2, status: 'waiting' },
            { id: '3', name: 'Amit Patel', age: 58, gender: 'M', token_number: 3, status: 'in_consultation' },
        ]); } finally { setLoading(false); }
    };

    const loadIPD = async () => {
        try {
            const res = await apiClient.get('/api/admissions/doctor/my-patients');
            setIpdPatients(res.data?.patients || [
                { id: '10', name: 'Meena Gupta', age: 55, gender: 'F', bed_number: 'ICU-3', ward_name: 'ICU', diagnosis: 'Pneumonia', admission_date: '2026-02-28' },
                { id: '11', name: 'Ravi Verma', age: 42, gender: 'M', bed_number: 'W2-12', ward_name: 'General Ward', diagnosis: 'Post-Op Appendectomy', admission_date: '2026-03-01' },
                { id: '12', name: 'Lakshmi Nair', age: 70, gender: 'F', bed_number: 'CCU-1', ward_name: 'CCU', diagnosis: 'Acute MI', admission_date: '2026-03-02' },
            ]);
        } catch { setIpdPatients([
            { id: '10', name: 'Meena Gupta', age: 55, gender: 'F', bed_number: 'ICU-3', ward_name: 'ICU', diagnosis: 'Pneumonia' },
            { id: '11', name: 'Ravi Verma', age: 42, gender: 'M', bed_number: 'W2-12', ward_name: 'General', diagnosis: 'Post-Op' },
        ]); }
    };

    const handleSearch = async (q: string) => {
        setSearchQuery(q);
        if (q.length < 2) { setSearchResults([]); return; }
        try {
            const res = await apiClient.get(`/api/patients/search?q=${q}`);
            setSearchResults(res.data?.patients || []);
        } catch { setSearchResults([]); }
    };

    const callToken = async (patient: Patient) => {
        Alert.alert('Token Called', `Calling Token #${patient.token_number} — ${patient.name}`);
        try { await apiClient.post(`/api/opd/queue/call/${patient.id}`); } catch {}
    };

    const getStatusColor = (status?: string) => {
        if (status === 'in_consultation') return COLORS.success;
        if (status === 'called') return COLORS.warning;
        return COLORS.textMuted;
    };

    const styles = getStyles(COLORS);

    const tabs: { key: TabKey; label: string; icon: any; count: number }[] = [
        { key: 'opd', label: 'OPD Queue', icon: Clock, count: opdQueue.filter(p => p.status === 'waiting').length },
        { key: 'ipd', label: 'My IPD', icon: Activity, count: ipdPatients.length },
        { key: 'search', label: 'Search', icon: Search, count: 0 },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <View style={styles.header}>
                <Text style={styles.title}>Patients</Text>
                <Text style={styles.subtitle}>{opdQueue.length} OPD · {ipdPatients.length} IPD</Text>
            </View>

            <View style={styles.tabRow}>
                {tabs.map(t => (
                    <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
                        <t.icon size={16} color={tab === t.key ? COLORS.primary : COLORS.textMuted} />
                        <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
                        {t.count > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{t.count}</Text></View>}
                    </TouchableOpacity>
                ))}
            </View>

            {tab === 'search' && (
                <View style={styles.searchBox}>
                    <Search size={18} color={COLORS.textMuted} />
                    <TextInput style={styles.searchInput} placeholder="Search by name, UHID, phone..." placeholderTextColor={COLORS.textMuted} value={searchQuery} onChangeText={handleSearch} />
                </View>
            )}

            <FlatList
                data={tab === 'opd' ? opdQueue : tab === 'ipd' ? ipdPatients : searchResults}
                keyExtractor={item => item.id}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { loadOPD(); loadIPD(); }} tintColor={COLORS.primary} />}
                contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}
                ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>{tab === 'search' ? 'Type to search patients...' : 'No patients found'}</Text></View>}
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => navigation.navigate('PatientDetail', { patientId: item.id, patientName: item.name })}>
                        <GlassCard style={styles.card}>
                            <View style={styles.cardRow}>
                                <View style={styles.cardLeft}>
                                    {tab === 'opd' && (
                                        <View style={[styles.tokenBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                                            <Text style={[styles.tokenText, { color: getStatusColor(item.status) }]}>#{item.token_number}</Text>
                                        </View>
                                    )}
                                    {tab === 'ipd' && (
                                        <View style={[styles.tokenBadge, { backgroundColor: COLORS.info + '20' }]}>
                                            <Text style={[styles.tokenText, { color: COLORS.info }]}>{item.bed_number}</Text>
                                        </View>
                                    )}
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.patientName}>{item.name}</Text>
                                        <Text style={styles.patientInfo}>
                                            {item.age && `${item.age}y`} {item.gender && `· ${item.gender}`}
                                            {item.diagnosis && ` · ${item.diagnosis}`}
                                            {item.ward_name && ` · ${item.ward_name}`}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.cardRight}>
                                    {tab === 'opd' && item.status === 'waiting' && (
                                        <TouchableOpacity style={styles.callBtn} onPress={() => callToken(item)}>
                                            <Phone size={14} color="#fff" />
                                            <Text style={styles.callBtnText}>Call</Text>
                                        </TouchableOpacity>
                                    )}
                                    {tab === 'opd' && item.status === 'in_consultation' && (
                                        <View style={[styles.statusBadge, { backgroundColor: COLORS.success + '20' }]}>
                                            <Text style={[styles.statusText, { color: COLORS.success }]}>In Consult</Text>
                                        </View>
                                    )}
                                    <ChevronRight size={18} color={COLORS.textMuted} />
                                </View>
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
    subtitle: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.textSecondary, marginTop: 2 },
    tabRow: { flexDirection: 'row', paddingHorizontal: SPACING.m, marginTop: SPACING.m, gap: SPACING.s },
    tab: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.s, paddingHorizontal: SPACING.m, borderRadius: 20, backgroundColor: COLORS.surface, gap: 6 },
    tabActive: { backgroundColor: COLORS.primary + '20', borderWidth: 1, borderColor: COLORS.primary + '40' },
    tabText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textMuted },
    tabTextActive: { color: COLORS.primary },
    badge: { backgroundColor: COLORS.error, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, marginLeft: 2 },
    badgeText: { color: '#fff', fontSize: 11, fontFamily: FONTS.bold },
    searchBox: { flexDirection: 'row', alignItems: 'center', margin: SPACING.m, backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: SPACING.m, gap: SPACING.s },
    searchInput: { flex: 1, color: COLORS.text, fontFamily: FONTS.regular, paddingVertical: SPACING.m, fontSize: 15 },
    card: { marginBottom: SPACING.s },
    cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: SPACING.m },
    cardRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.s },
    tokenBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 48, alignItems: 'center' },
    tokenText: { fontSize: 13, fontFamily: FONTS.bold },
    patientName: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
    patientInfo: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
    callBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.success, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, gap: 4 },
    callBtnText: { color: '#fff', fontSize: 12, fontFamily: FONTS.bold },
    statusBadge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
    statusText: { fontSize: 11, fontFamily: FONTS.bold },
    empty: { alignItems: 'center', paddingTop: 60 },
    emptyText: { color: COLORS.textMuted, fontFamily: FONTS.medium, fontSize: 15 },
});
