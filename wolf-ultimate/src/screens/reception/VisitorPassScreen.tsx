import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, UserCheck, Clock, CheckCircle2, XCircle, Printer, Send } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

interface VisitorPass {
  id: number; visitor_name: string; visitor_phone: string; purpose: string;
  patient_name: string; patient_uhid: string; ward: string;
  issued_at: string; valid_until: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
}

const MOCK_PASSES: VisitorPass[] = [
  { id: 1, visitor_name: 'Anil Kumar', visitor_phone: '9876500001', purpose: 'Patient Visit', patient_name: 'Rakesh Kumar', patient_uhid: 'UHID-5001', ward: 'Ward A', issued_at: '2026-03-05T09:00:00Z', valid_until: '2026-03-05T11:00:00Z', status: 'ACTIVE' },
  { id: 2, visitor_name: 'Meena Sharma', visitor_phone: '9876500002', purpose: 'Patient Visit', patient_name: 'Sunita Gupta', patient_uhid: 'UHID-5004', ward: 'ICU', issued_at: '2026-03-05T08:30:00Z', valid_until: '2026-03-05T09:30:00Z', status: 'EXPIRED' },
  { id: 3, visitor_name: 'Ravi Tiwari', visitor_phone: '9876500003', purpose: 'Discharge Formalities', patient_name: 'Vijay Singh', patient_uhid: 'UHID-5003', ward: 'Ward B', issued_at: '2026-03-05T09:15:00Z', valid_until: '2026-03-05T12:00:00Z', status: 'ACTIVE' },
];

const STATUS_CFG: Record<string, { color: string; label: string }> = {
  ACTIVE: { color: '#10b981', label: 'Active' },
  EXPIRED: { color: '#64748b', label: 'Expired' },
  REVOKED: { color: '#ef4444', label: 'Revoked' },
};

export const VisitorPassScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [passes, setPasses] = useState(MOCK_PASSES);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ visitor_name: '', visitor_phone: '', purpose: 'Patient Visit', patient_name: '', patient_uhid: '', ward: '' });

  const activePasses = passes.filter(p => p.status === 'ACTIVE').length;

  const handleIssue = () => {
    if (!form.visitor_name.trim() || !form.patient_name.trim() || !form.ward.trim()) {
      Alert.alert('Required', 'Visitor name, patient name, and ward are mandatory.'); return;
    }
    const newPass: VisitorPass = {
      id: Date.now(), ...form, visitor_phone: form.visitor_phone, patient_uhid: form.patient_uhid || 'UHID-NEW',
      issued_at: new Date().toISOString(), valid_until: new Date(Date.now() + 2 * 3600000).toISOString(), status: 'ACTIVE',
    };
    setPasses(prev => [newPass, ...prev]);
    setShowForm(false);
    setForm({ visitor_name: '', visitor_phone: '', purpose: 'Patient Visit', patient_name: '', patient_uhid: '', ward: '' });
    Alert.alert('✅ Pass Issued', `Visitor pass for ${form.visitor_name} — valid 2 hours.`);
  };

  const handleRevoke = (pass: VisitorPass) => {
    Alert.alert('Revoke Pass', `Revoke visitor pass for ${pass.visitor_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: () => setPasses(prev => prev.map(p => p.id === pass.id ? { ...p, status: 'REVOKED' as const } : p)) },
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Visitor Passes</Text>
            <Text style={styles.headerSub}>{activePasses} active passes</Text>
          </View>
          <TouchableOpacity style={styles.issueBtn} onPress={() => setShowForm(!showForm)}>
            <UserCheck size={18} color="#fff" /><Text style={styles.issueBtnText}>Issue</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {/* Issue Form */}
          {showForm && (
            <GlassCard style={styles.formCard}>
              <Text style={styles.formTitle}>🎫 Issue New Visitor Pass</Text>
              {[
                { label: 'Visitor Name *', field: 'visitor_name', placeholder: 'Full name' },
                { label: 'Visitor Phone', field: 'visitor_phone', placeholder: 'Mobile number' },
                { label: 'Purpose', field: 'purpose', placeholder: 'Patient Visit / Discharge' },
                { label: 'Patient Name *', field: 'patient_name', placeholder: 'Patient being visited' },
                { label: 'Patient UHID', field: 'patient_uhid', placeholder: 'UHID (if known)' },
                { label: 'Ward / Room *', field: 'ward', placeholder: 'e.g. Ward A, ICU, Room 201' },
              ].map(f => (
                <View key={f.field} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder={f.placeholder}
                    placeholderTextColor={COLORS.textMuted}
                    value={(form as any)[f.field]}
                    onChangeText={v => setForm(prev => ({ ...prev, [f.field]: v }))}
                  />
                </View>
              ))}
              <TouchableOpacity style={styles.issuePassBtn} onPress={handleIssue}>
                <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.issuePassGrad}>
                  <Send size={18} color="#fff" /><Text style={styles.issuePassText}>Issue Pass (2hr validity)</Text>
                </LinearGradient>
              </TouchableOpacity>
            </GlassCard>
          )}

          {/* Passes List */}
          {passes.map(pass => {
            const st = STATUS_CFG[pass.status];
            return (
              <GlassCard key={pass.id} style={styles.passCard}>
                <View style={styles.passTop}>
                  <View style={styles.passAvatar}><UserCheck size={18} color={st.color} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.passVisitor}>{pass.visitor_name}</Text>
                    <Text style={styles.passMeta}>→ {pass.patient_name} • {pass.ward}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: st.color + '20' }]}>
                    <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>
                <View style={styles.passDetail}>
                  <View style={styles.timeItem}><Clock size={11} color={COLORS.textMuted} /><Text style={styles.timeText}>Issued: {new Date(pass.issued_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></View>
                  <View style={styles.timeItem}><Clock size={11} color={pass.status === 'EXPIRED' ? '#ef4444' : COLORS.textMuted} /><Text style={[styles.timeText, pass.status === 'EXPIRED' && { color: '#ef4444' }]}>Until: {new Date(pass.valid_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></View>
                  <Text style={styles.purposeText}>{pass.purpose}</Text>
                </View>
                {pass.status === 'ACTIVE' && (
                  <View style={styles.passActions}>
                    <TouchableOpacity style={styles.printBtn}><Printer size={14} color={COLORS.primary} /><Text style={styles.printText}>Print</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.revokeBtn} onPress={() => handleRevoke(pass)}><XCircle size={14} color="#ef4444" /><Text style={styles.revokeText}>Revoke</Text></TouchableOpacity>
                  </View>
                )}
              </GlassCard>
            );
          })}
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
  issueBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  issueBtnText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 13 },
  formCard: { padding: SPACING.m, marginBottom: SPACING.l, borderWidth: 0 },
  formTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginBottom: 14 },
  fieldGroup: { marginBottom: 12 },
  fieldLabel: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 11, letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' as any },
  fieldInput: { fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14, backgroundColor: COLORS.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border },
  issuePassBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  issuePassGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  issuePassText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 14 },
  passCard: { padding: SPACING.m, marginBottom: 10, borderWidth: 0 },
  passTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  passAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  passVisitor: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  passMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10 },
  passDetail: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  timeItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeText: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 11 },
  purposeText: { fontFamily: FONTS.medium, color: COLORS.textMuted, fontSize: 11 },
  passActions: { flexDirection: 'row', gap: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  printBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.primary + '15', borderWidth: 1, borderColor: COLORS.primary + '30' },
  printText: { fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 12 },
  revokeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#ef444415', borderWidth: 1, borderColor: '#ef444430' },
  revokeText: { fontFamily: FONTS.bold, color: '#ef4444', fontSize: 12 },
});
