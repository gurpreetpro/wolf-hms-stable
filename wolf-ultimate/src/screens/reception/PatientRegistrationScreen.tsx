import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, UserPlus, Phone, CreditCard, MapPin, Send } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';
import receptionService from '../../services/receptionService';

export const PatientRegistrationScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [form, setForm] = useState({ name: '', phone: '', age: '', gender: 'M', aadhaar: '', abha_id: '', address: '', blood_group: '', guardian_name: '', insurance_provider: '', insurance_id: '' });
  const [regType, setRegType] = useState<'NEW' | 'REVISIT' | 'EMERGENCY'>('NEW');
  const [submitting, setSubmitting] = useState(false);

  const updateField = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleRegister = () => {
    if (!form.name.trim() || !form.phone.trim() || !form.age.trim()) {
      Alert.alert('Required', 'Name, Phone, and Age are mandatory.'); return;
    }
    Alert.alert('Confirm Registration', `Register ${form.name} as ${regType}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Register', onPress: async () => {
        setSubmitting(true);
        try {
          await receptionService.registerPatient({ ...form, age: Number(form.age), gender: form.gender as any, registration_type: regType });
          Alert.alert('✅ Registered', `Patient ${form.name} registered successfully. UHID will be generated.`, [{ text: 'OK', onPress: () => navigation.goBack() }]);
        } catch { Alert.alert('Error', 'Registration failed.'); }
        finally { setSubmitting(false); }
      }},
    ]);
  };

  const InputField = ({ label, value, field, placeholder, keyboardType, icon: Icon }: any) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldRow}>
        {Icon && <Icon size={16} color={COLORS.textMuted} />}
        <TextInput style={styles.fieldInput} value={value} onChangeText={(v: string) => updateField(field, v)} placeholder={placeholder} placeholderTextColor={COLORS.textMuted} keyboardType={keyboardType || 'default'} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Patient Registration</Text>
            <Text style={styles.headerSub}>New OPD / Emergency Registration</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 120 }}>
          {/* Registration Type */}
          <Text style={styles.secTitle}>Registration Type</Text>
          <View style={styles.typeRow}>
            {(['NEW', 'REVISIT', 'EMERGENCY'] as const).map(t => (
              <TouchableOpacity key={t} style={[styles.typeChip, regType === t && styles.typeChipActive]} onPress={() => setRegType(t)}>
                <Text style={[styles.typeText, regType === t && styles.typeTextActive]}>{t === 'NEW' ? '🆕 New' : t === 'REVISIT' ? '🔄 Revisit' : '🚨 Emergency'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Basic Info */}
          <Text style={styles.secTitle}>Basic Information *</Text>
          <GlassCard style={styles.formCard}>
            <InputField label="Full Name *" value={form.name} field="name" placeholder="Patient full name" icon={UserPlus} />
            <InputField label="Phone *" value={form.phone} field="phone" placeholder="10-digit mobile" keyboardType="phone-pad" icon={Phone} />
            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}><InputField label="Age *" value={form.age} field="age" placeholder="Age" keyboardType="numeric" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Gender *</Text>
                <View style={styles.genderRow}>
                  {['M', 'F', 'O'].map(g => (
                    <TouchableOpacity key={g} style={[styles.genderChip, form.gender === g && styles.genderActive]} onPress={() => updateField('gender', g)}>
                      <Text style={[styles.genderText, form.gender === g && styles.genderTextActive]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </GlassCard>

          {/* ID & Insurance */}
          <Text style={[styles.secTitle, { marginTop: SPACING.l }]}>ID & Insurance</Text>
          <GlassCard style={styles.formCard}>
            <InputField label="Aadhaar No." value={form.aadhaar} field="aadhaar" placeholder="12-digit Aadhaar" keyboardType="numeric" icon={CreditCard} />
            <InputField label="ABHA ID" value={form.abha_id} field="abha_id" placeholder="ABHA Health ID" />
            <InputField label="Insurance Provider" value={form.insurance_provider} field="insurance_provider" placeholder="e.g. Star Health, CGHS" />
            <InputField label="Insurance / TPA ID" value={form.insurance_id} field="insurance_id" placeholder="Policy number" />
          </GlassCard>

          {/* Address & Extras */}
          <Text style={[styles.secTitle, { marginTop: SPACING.l }]}>Additional Details</Text>
          <GlassCard style={styles.formCard}>
            <InputField label="Address" value={form.address} field="address" placeholder="Full address" icon={MapPin} />
            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}><InputField label="Blood Group" value={form.blood_group} field="blood_group" placeholder="e.g. O+" /></View>
              <View style={{ flex: 1 }}><InputField label="Guardian Name" value={form.guardian_name} field="guardian_name" placeholder="If minor/dependent" /></View>
            </View>
          </GlassCard>

          {/* Submit */}
          <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleRegister} disabled={submitting}>
            <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.submitGrad}>
              <Send size={20} color="#fff" /><Text style={styles.submitText}>{submitting ? 'Registering...' : 'Register Patient'}</Text>
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
  secTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginBottom: SPACING.s },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.l },
  typeChip: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  typeChipActive: { backgroundColor: '#3b82f620', borderColor: '#3b82f6' },
  typeText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 13 },
  typeTextActive: { color: '#3b82f6' },
  formCard: { padding: SPACING.m, borderWidth: 0 },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 11, letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' as any },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border },
  fieldInput: { flex: 1, fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14 },
  rowFields: { flexDirection: 'row', gap: 12 },
  genderRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  genderChip: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  genderActive: { backgroundColor: '#3b82f620', borderColor: '#3b82f6' },
  genderText: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 14 },
  genderTextActive: { color: '#3b82f6' },
  submitBtn: { marginTop: SPACING.l, borderRadius: 20, overflow: 'hidden' },
  submitGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 20 },
  submitText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 16 },
});
