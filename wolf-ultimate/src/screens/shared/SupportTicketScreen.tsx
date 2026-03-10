import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LifeBuoy, Plus, Clock, CheckCircle, MessageSquare, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import communicationService from '../../services/communicationService';

interface Ticket { id: string; title: string; category: string; priority: 'low' | 'medium' | 'high' | 'critical'; status: 'open' | 'in_progress' | 'resolved' | 'closed'; created_by: string; created_date: string; assigned_to?: string; replies: number; }

export const SupportTicketScreen = () => {
    const { COLORS } = useTheme();
    const [tab, setTab] = useState<'tickets' | 'new'>('tickets');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [priority, setPriority] = useState('medium');
    const styles = getStyles(COLORS);

    const categories = ['IT / Network', 'Equipment Failure', 'Housekeeping', 'Pharmacy', 'Lab Issue', 'Billing', 'HR / Staffing', 'Patient Complaint', 'Infrastructure', 'Other'];

    const [tickets, setTickets] = useState<Ticket[]>([]);

    const mockTickets: Ticket[] = [
        { id: 'TKT-0042', title: 'OT-2 Monitor not displaying ECG', category: 'Equipment Failure', priority: 'high', status: 'in_progress', created_by: 'Nurse Priya', created_date: '2026-03-02', assigned_to: 'BME Team', replies: 3 },
        { id: 'TKT-0041', title: 'WiFi disconnecting in Ward 2', category: 'IT / Network', priority: 'medium', status: 'open', created_by: 'Dr. Sharma', created_date: '2026-03-01', replies: 1 },
        { id: 'TKT-0040', title: 'AC not working in ICU', category: 'Infrastructure', priority: 'critical', status: 'in_progress', created_by: 'Nurse Kavita', created_date: '2026-03-01', assigned_to: 'Maintenance', replies: 5 },
        { id: 'TKT-0039', title: 'Lab result delay for urgent samples', category: 'Lab Issue', priority: 'high', status: 'resolved', created_by: 'Dr. Nair', created_date: '2026-02-28', assigned_to: 'Lab Manager', replies: 4 },
        { id: 'TKT-0038', title: 'Pharmacy stock-out: Inj. Pantoprazole', category: 'Pharmacy', priority: 'medium', status: 'closed', created_by: 'Nurse Deepa', created_date: '2026-02-27', assigned_to: 'Pharmacy', replies: 2 },
    ];

    useEffect(() => { loadTickets(); }, []);

    const loadTickets = async () => {
        try {
            const data = await communicationService.getTickets();
            if (data.length > 0) {
                setTickets(data.map((t: any) => ({
                    id: t.id, title: t.title, category: t.category,
                    priority: t.priority, status: t.status,
                    created_by: t.created_by, created_date: t.created_at,
                    assigned_to: t.assigned_to, replies: 0,
                })));
            } else { setTickets(mockTickets); }
        } catch { setTickets(mockTickets); }
    };

    const getStatusConfig = (s: string) => {
        switch (s) { case 'open': return { color: COLORS.warning, label: 'Open' }; case 'in_progress': return { color: COLORS.info, label: 'In Progress' }; case 'resolved': return { color: COLORS.success, label: 'Resolved' }; case 'closed': return { color: COLORS.textMuted, label: 'Closed' }; default: return { color: COLORS.textMuted, label: s }; }
    };
    const getPriorityColor = (p: string) => {
        switch (p) { case 'critical': return COLORS.error; case 'high': return '#f59e0b'; case 'medium': return COLORS.info; default: return COLORS.textMuted; }
    };

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <LifeBuoy size={24} color={COLORS.warning} />
                    <Text style={styles.title}>Support Tickets</Text>
                </View>

                <View style={styles.tabRow}>
                    <TouchableOpacity style={[styles.tabBtn, tab === 'tickets' && styles.tabActive]} onPress={() => setTab('tickets')}>
                        <Text style={[styles.tabText, tab === 'tickets' && styles.tabTextActive]}>My Tickets ({tickets.length})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tabBtn, tab === 'new' && styles.tabActive]} onPress={() => setTab('new')}>
                        <Plus size={14} color={tab === 'new' ? COLORS.primary : COLORS.textMuted} />
                        <Text style={[styles.tabText, tab === 'new' && styles.tabTextActive]}>New Ticket</Text>
                    </TouchableOpacity>
                </View>

                {tab === 'tickets' ? (
                    <View style={{ paddingHorizontal: SPACING.m }}>
                        {tickets.map(ticket => {
                            const cfg = getStatusConfig(ticket.status);
                            return (
                                <TouchableOpacity key={ticket.id} onPress={() => Alert.alert(ticket.id, `${ticket.title}\n\nCategory: ${ticket.category}\nPriority: ${ticket.priority}\nStatus: ${cfg.label}\nAssigned: ${ticket.assigned_to || 'Unassigned'}\n\n${ticket.replies} replies`)}>
                                    <GlassCard style={[styles.ticketCard, { borderLeftWidth: 3, borderLeftColor: cfg.color }]}>
                                        <View style={styles.ticketHeader}>
                                            <Text style={styles.ticketId}>{ticket.id}</Text>
                                            <View style={[styles.priBadge, { backgroundColor: getPriorityColor(ticket.priority) + '20' }]}>
                                                <Text style={[styles.priText, { color: getPriorityColor(ticket.priority) }]}>{ticket.priority.toUpperCase()}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.ticketTitle}>{ticket.title}</Text>
                                        <View style={styles.ticketMeta}>
                                            <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
                                                <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                                            </View>
                                            <Text style={styles.ticketInfo}>{ticket.category}</Text>
                                            <View style={styles.replyBadge}>
                                                <MessageSquare size={12} color={COLORS.textMuted} />
                                                <Text style={styles.replyText}>{ticket.replies}</Text>
                                            </View>
                                        </View>
                                    </GlassCard>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ) : (
                    <View style={{ paddingHorizontal: SPACING.m }}>
                        <TextInput style={styles.input} placeholder="Ticket title..." placeholderTextColor={COLORS.textMuted} value={title} onChangeText={setTitle} />
                        <TextInput style={[styles.input, { marginTop: SPACING.s, minHeight: 80, textAlignVertical: 'top' }]} placeholder="Describe the issue..." placeholderTextColor={COLORS.textMuted} value={description} onChangeText={setDescription} multiline />

                        <Text style={styles.fieldLabel}>CATEGORY</Text>
                        <View style={styles.chipRow}>
                            {categories.map(c => (
                                <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
                                    <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.fieldLabel}>PRIORITY</Text>
                        <View style={styles.chipRow}>
                            {['low', 'medium', 'high', 'critical'].map(p => (
                                <TouchableOpacity key={p} style={[styles.chip, priority === p && { backgroundColor: getPriorityColor(p) + '20', borderColor: getPriorityColor(p) }]} onPress={() => setPriority(p)}>
                                    <Text style={[styles.chipText, priority === p && { color: getPriorityColor(p) }]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.submitBtn} onPress={() => { if (!title || !category) { Alert.alert('Required', 'Title and category required'); return; } Alert.alert('Submitted', `Ticket created: ${title}`); setTab('tickets'); }}>
                            <LifeBuoy size={18} color="#fff" />
                            <Text style={styles.submitBtnText}>Submit Ticket</Text>
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
    title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.text },
    tabRow: { flexDirection: 'row', paddingHorizontal: SPACING.m, marginTop: SPACING.m, gap: SPACING.s },
    tabBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.s, paddingHorizontal: SPACING.m, borderRadius: 20, backgroundColor: COLORS.surface, gap: 6 },
    tabActive: { backgroundColor: COLORS.primary + '20', borderWidth: 1, borderColor: COLORS.primary + '40' },
    tabText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textMuted },
    tabTextActive: { color: COLORS.primary },
    ticketCard: { marginTop: SPACING.m },
    ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    ticketId: { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.textMuted },
    priBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    priText: { fontSize: 9, fontFamily: FONTS.bold },
    ticketTitle: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text, marginTop: 4 },
    ticketMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.s, marginTop: SPACING.s },
    statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 10, fontFamily: FONTS.bold },
    ticketInfo: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, flex: 1 },
    replyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    replyText: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textMuted },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.m, color: COLORS.text, fontFamily: FONTS.regular, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
    fieldLabel: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.textMuted, letterSpacing: 1, marginTop: SPACING.m, marginBottom: 6 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.s },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    chipActive: { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary },
    chipText: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textMuted },
    chipTextActive: { color: COLORS.primary },
    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.warning, borderRadius: 14, paddingVertical: 14, marginTop: SPACING.l, gap: 8 },
    submitBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 16 },
});
