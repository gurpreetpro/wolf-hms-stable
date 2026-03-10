import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fingerprint, Link2, Search, CheckCircle, QrCode, Share2 } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import abdmService from '../../services/abdmService';

interface ABHARecord { id: string; patient_name: string; abha_number: string; abha_address: string; linked: boolean; consent_status: 'pending' | 'granted' | 'revoked'; records_shared: number; last_sync?: string; }

export const ABDMScreen = () => {
    const { COLORS } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [tab, setTab] = useState<'linked' | 'create'>('linked');
    const styles = getStyles(COLORS);

    const [records, setRecords] = useState<ABHARecord[]>([]);

    const mockRecords: ABHARecord[] = [
        { id: '1', patient_name: 'Rajesh Kumar', abha_number: '91-4521-7890-1234', abha_address: 'rajesh.kumar@abdm', linked: true, consent_status: 'granted', records_shared: 5, last_sync: '2026-03-02' },
        { id: '2', patient_name: 'Meena Gupta', abha_number: '91-4510-5678-9012', abha_address: 'meena.gupta@abdm', linked: true, consent_status: 'granted', records_shared: 3, last_sync: '2026-03-01' },
        { id: '3', patient_name: 'Sunita Devi', abha_number: '91-4530-3456-7890', abha_address: 'sunita.devi@abdm', linked: true, consent_status: 'pending', records_shared: 0 },
        { id: '4', patient_name: 'Ravi Verma', abha_number: '', abha_address: '', linked: false, consent_status: 'pending', records_shared: 0 },
    ];

    useEffect(() => { loadRecords(); }, []);

    const loadRecords = async () => {
        try {
            const data = await abdmService.getLinkedRecords();
            if (data.length > 0) {
                setRecords(data.map((r: any) => ({
                    id: r.id, patient_name: r.patient_name,
                    abha_number: r.abha_number, abha_address: r.abha_address || '',
                    linked: true, consent_status: r.consent_status,
                    records_shared: r.records_count || 0, last_sync: r.linked_date,
                })));
            } else { setRecords(mockRecords); }
        } catch { setRecords(mockRecords); }
    };

    const filtered = records.filter(r => r.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) || r.abha_number.includes(searchQuery));

    const getConsentColor = (s: string) => s === 'granted' ? COLORS.success : s === 'revoked' ? COLORS.error : COLORS.warning;

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <Fingerprint size={24} color="#059669" />
                    <View>
                        <Text style={styles.title}>ABDM / ABHA</Text>
                        <Text style={styles.subtitle}>Ayushman Bharat Digital Health Mission</Text>
                    </View>
                </View>

                <GlassCard style={styles.statsCard}>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: COLORS.success }]}>{records.filter(r => r.linked).length}</Text>
                            <Text style={styles.statLabel}>Linked</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: COLORS.warning }]}>{records.filter(r => !r.linked).length}</Text>
                            <Text style={styles.statLabel}>Not Linked</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: COLORS.info }]}>{records.reduce((s, r) => s + r.records_shared, 0)}</Text>
                            <Text style={styles.statLabel}>Records Shared</Text>
                        </View>
                    </View>
                </GlassCard>

                <View style={styles.tabRow}>
                    <TouchableOpacity style={[styles.tabBtn, tab === 'linked' && styles.tabActive]} onPress={() => setTab('linked')}>
                        <Text style={[styles.tabText, tab === 'linked' && styles.tabTextActive]}>Patient Records</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tabBtn, tab === 'create' && styles.tabActive]} onPress={() => setTab('create')}>
                        <Text style={[styles.tabText, tab === 'create' && styles.tabTextActive]}>Create ABHA</Text>
                    </TouchableOpacity>
                </View>

                {tab === 'linked' ? (
                    <View style={{ paddingHorizontal: SPACING.m }}>
                        <View style={styles.searchRow}>
                            <Search size={16} color={COLORS.textMuted} />
                            <TextInput style={styles.searchInput} placeholder="Search by name or ABHA..." placeholderTextColor={COLORS.textMuted} value={searchQuery} onChangeText={setSearchQuery} />
                        </View>

                        {filtered.map(rec => (
                            <GlassCard key={rec.id} style={[styles.recCard, rec.linked && { borderLeftWidth: 3, borderLeftColor: COLORS.success }]}>
                                <View style={styles.recHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.recName}>{rec.patient_name}</Text>
                                        {rec.linked ? (
                                            <>
                                                <Text style={styles.recAbha}>{rec.abha_number}</Text>
                                                <Text style={styles.recAddr}>{rec.abha_address}</Text>
                                            </>
                                        ) : (
                                            <Text style={[styles.recAbha, { color: COLORS.warning }]}>ABHA not linked</Text>
                                        )}
                                    </View>
                                    {rec.linked ? (
                                        <View style={styles.recRight}>
                                            <View style={[styles.consentBadge, { backgroundColor: getConsentColor(rec.consent_status) + '20' }]}>
                                                <Text style={[styles.consentText, { color: getConsentColor(rec.consent_status) }]}>Consent: {rec.consent_status}</Text>
                                            </View>
                                            {rec.records_shared > 0 && <Text style={styles.sharedText}>{rec.records_shared} records</Text>}
                                        </View>
                                    ) : (
                                        <TouchableOpacity style={styles.linkBtn} onPress={() => Alert.alert('Link ABHA', `Create/link ABHA for ${rec.patient_name}`)}>
                                            <Link2 size={14} color={COLORS.primary} />
                                            <Text style={[styles.linkBtnText, { color: COLORS.primary }]}>Link</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                                {rec.linked && (
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('QR', 'Show ABHA QR code')}>
                                            <QrCode size={14} color={COLORS.textMuted} /><Text style={styles.actionText}>QR</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('Share', 'Share health records via ABDM')}>
                                            <Share2 size={14} color={COLORS.textMuted} /><Text style={styles.actionText}>Share</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </GlassCard>
                        ))}
                    </View>
                ) : (
                    <View style={{ paddingHorizontal: SPACING.m }}>
                        <GlassCard style={styles.createCard}>
                            <Text style={styles.createTitle}>Create New ABHA Number</Text>
                            <Text style={styles.createDesc}>Generate ABHA using Aadhaar OTP or Driving License</Text>
                            <TextInput style={styles.input} placeholder="Patient UHID..." placeholderTextColor={COLORS.textMuted} />
                            <TextInput style={[styles.input, { marginTop: SPACING.s }]} placeholder="Aadhaar number..." placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
                            <TouchableOpacity style={styles.createBtn} onPress={() => Alert.alert('OTP Sent', 'Aadhaar OTP sent to registered mobile')}>
                                <Fingerprint size={18} color="#fff" />
                                <Text style={styles.createBtnText}>Send Aadhaar OTP</Text>
                            </TouchableOpacity>
                        </GlassCard>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.l, paddingTop: SPACING.m, gap: SPACING.s },
    title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.text },
    subtitle: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary },
    statsCard: { marginHorizontal: SPACING.m, marginTop: SPACING.m },
    statsRow: { flexDirection: 'row' },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 20, fontFamily: FONTS.bold },
    statLabel: { fontSize: 11, fontFamily: FONTS.medium, color: COLORS.textMuted, marginTop: 2 },
    tabRow: { flexDirection: 'row', paddingHorizontal: SPACING.m, marginTop: SPACING.m, gap: SPACING.s },
    tabBtn: { flex: 1, paddingVertical: SPACING.s, borderRadius: 20, backgroundColor: COLORS.surface, alignItems: 'center' },
    tabActive: { backgroundColor: '#059669' + '20' },
    tabText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textMuted },
    tabTextActive: { color: '#059669' },
    searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: SPACING.m, marginTop: SPACING.m, gap: 8 },
    searchInput: { flex: 1, paddingVertical: 10, color: COLORS.text, fontFamily: FONTS.regular, fontSize: 14 },
    recCard: { marginTop: SPACING.m },
    recHeader: { flexDirection: 'row' },
    recName: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
    recAbha: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textSecondary, marginTop: 2, fontVariant: ['tabular-nums'] },
    recAddr: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 1 },
    recRight: { alignItems: 'flex-end' },
    consentBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    consentText: { fontSize: 10, fontFamily: FONTS.bold },
    sharedText: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 4 },
    linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: COLORS.primary + '15' },
    linkBtnText: { fontSize: 13, fontFamily: FONTS.bold },
    actionRow: { flexDirection: 'row', gap: SPACING.m, marginTop: SPACING.s },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: COLORS.background },
    actionText: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textMuted },
    createCard: { marginTop: SPACING.m },
    createTitle: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text },
    createDesc: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 4, marginBottom: SPACING.m },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.m, color: COLORS.text, fontFamily: FONTS.regular, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
    createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#059669', borderRadius: 14, paddingVertical: 14, marginTop: SPACING.m, gap: 8 },
    createBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 16 },
});
