import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, UserPlus, Clock, CheckCircle, X, LogOut, LogIn } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';

interface Visitor { id: string; name: string; relation: string; patient_name: string; bed: string; phone: string; check_in: string; check_out?: string; status: 'active' | 'left' | 'denied'; pass_no: string; }

export const VisitorScreen = () => {
    const { COLORS } = useTheme();
    const [tab, setTab] = useState<'active' | 'register'>('active');
    const [visitorName, setVisitorName] = useState('');
    const [relation, setRelation] = useState('');
    const [phone, setPhone] = useState('');
    const styles = getStyles(COLORS);

    const relations = ['Spouse', 'Parent', 'Child', 'Sibling', 'Friend', 'Relative', 'Colleague', 'Other'];

    const visitors: Visitor[] = [
        { id: '1', name: 'Suresh Kumar', relation: 'Spouse', patient_name: 'Meena Gupta', bed: 'ICU-3', phone: '9876543210', check_in: '10:00 AM', status: 'active', pass_no: 'VP-042' },
        { id: '2', name: 'Aarti Sharma', relation: 'Daughter', patient_name: 'Rajesh Kumar', bed: 'W1-5', phone: '9876543211', check_in: '10:30 AM', status: 'active', pass_no: 'VP-043' },
        { id: '3', name: 'Vikram Singh', relation: 'Friend', patient_name: 'Ravi Verma', bed: 'W2-12', phone: '9876543212', check_in: '09:00 AM', check_out: '11:00 AM', status: 'left', pass_no: 'VP-041' },
    ];

    const activeCount = visitors.filter(v => v.status === 'active').length;

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <Users size={24} color={COLORS.info} />
                    <Text style={styles.title}>Visitors</Text>
                    <View style={styles.countBadge}><Text style={styles.countText}>{activeCount} in</Text></View>
                </View>

                <View style={styles.tabRow}>
                    <TouchableOpacity style={[styles.tab, tab === 'active' && styles.tabActive]} onPress={() => setTab('active')}>
                        <Text style={[styles.tabText, tab === 'active' && styles.tabTextActive]}>Active ({activeCount})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tab, tab === 'register' && styles.tabActive]} onPress={() => setTab('register')}>
                        <UserPlus size={14} color={tab === 'register' ? COLORS.primary : COLORS.textMuted} />
                        <Text style={[styles.tabText, tab === 'register' && styles.tabTextActive]}>Register</Text>
                    </TouchableOpacity>
                </View>

                {tab === 'active' ? (
                    <View style={{ paddingHorizontal: SPACING.m }}>
                        {visitors.map(v => (
                            <GlassCard key={v.id} style={[styles.visitorCard, v.status === 'left' && { opacity: 0.5 }]}>
                                <View style={styles.visitorHeader}>
                                    <View style={[styles.avatar, { backgroundColor: v.status === 'active' ? COLORS.success : COLORS.textMuted }]}>
                                        <Text style={styles.avatarText}>{v.name[0]}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.visitorName}>{v.name}</Text>
                                        <Text style={styles.visitorRelation}>{v.relation} of {v.patient_name} ({v.bed})</Text>
                                        <Text style={styles.visitorMeta}>Pass: {v.pass_no} · In: {v.check_in}{v.check_out ? ` · Out: ${v.check_out}` : ''}</Text>
                                    </View>
                                    {v.status === 'active' && (
                                        <TouchableOpacity style={styles.checkoutBtn} onPress={() => Alert.alert('Check Out', `Check out ${v.name}?`)}>
                                            <LogOut size={14} color={COLORS.error} />
                                            <Text style={[styles.checkoutText, { color: COLORS.error }]}>Out</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </GlassCard>
                        ))}
                    </View>
                ) : (
                    <View style={{ paddingHorizontal: SPACING.m }}>
                        <TextInput style={styles.input} placeholder="Visitor name..." placeholderTextColor={COLORS.textMuted} value={visitorName} onChangeText={setVisitorName} />
                        <TextInput style={[styles.input, { marginTop: SPACING.s }]} placeholder="Phone number..." placeholderTextColor={COLORS.textMuted} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

                        <Text style={styles.fieldLabel}>RELATION</Text>
                        <View style={styles.chipRow}>
                            {relations.map(r => (
                                <TouchableOpacity key={r} style={[styles.chip, relation === r && styles.chipActive]} onPress={() => setRelation(r)}>
                                    <Text style={[styles.chipText, relation === r && styles.chipTextActive]}>{r}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.registerBtn} onPress={() => { if (!visitorName || !relation) { Alert.alert('Required', 'Name and relation required'); return; } Alert.alert('Registered', `Visitor pass issued for ${visitorName}`); }}>
                            <LogIn size={18} color="#fff" />
                            <Text style={styles.registerBtnText}>Check In Visitor</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.l, paddingTop: SPACING.m, gap: SPACING.s },
    title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.text, flex: 1 },
    countBadge: { backgroundColor: COLORS.success + '20', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    countText: { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.success },
    tabRow: { flexDirection: 'row', paddingHorizontal: SPACING.m, marginTop: SPACING.m, gap: SPACING.s },
    tab: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.s, paddingHorizontal: SPACING.m, borderRadius: 20, backgroundColor: COLORS.surface, gap: 6 },
    tabActive: { backgroundColor: COLORS.primary + '20', borderWidth: 1, borderColor: COLORS.primary + '40' },
    tabText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textMuted },
    tabTextActive: { color: COLORS.primary },
    visitorCard: { marginTop: SPACING.m },
    visitorHeader: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.m },
    avatarText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 16 },
    visitorName: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
    visitorRelation: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 1 },
    visitorMeta: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 2 },
    checkoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.error + '15' },
    checkoutText: { fontSize: 12, fontFamily: FONTS.bold },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.m, color: COLORS.text, fontFamily: FONTS.regular, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
    fieldLabel: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.textMuted, letterSpacing: 1, marginTop: SPACING.m, marginBottom: 6 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.s },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    chipActive: { backgroundColor: COLORS.info + '20', borderColor: COLORS.info },
    chipText: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textMuted },
    chipTextActive: { color: COLORS.info },
    registerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.success, borderRadius: 14, paddingVertical: 14, marginTop: SPACING.l, gap: 8 },
    registerBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 16 },
});
