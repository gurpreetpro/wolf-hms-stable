import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Sparkles, FileEdit, CheckCircle2 } from 'lucide-react-native';
import { FONTS } from '../../theme/theme';

// ═══════════════════════════════════════════
//  AI ROUND SCRIBE — Auto-generate notes
// ═══════════════════════════════════════════

interface AiRoundScribeProps {
  onGenerate: (note: { content: string; orders: string }) => void;
  patientContext?: string;
  disabled?: boolean;
}

export const AiRoundScribe: React.FC<AiRoundScribeProps> = ({ onGenerate, patientContext, disabled }) => {
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handlePress = async () => {
    if (loading || disabled) return;
    setLoading(true);
    setTimeout(() => {
      onGenerate({
        content:
          'Patient reviewed during ward round. Alert and oriented.\n\n' +
          'SUBJECTIVE: Complains of mild abdominal discomfort, no nausea/vomiting. Tolerating oral feeds.\n\n' +
          'OBJECTIVE: Vitals stable — HR 88, BP 120/80, SpO₂ 96%, Temp 99.2°F. Abdomen soft, wound site clean, no erythema. Drain output minimal (20ml serous). Bowel sounds present.\n\n' +
          'ASSESSMENT: Post-op Day 1 — progressing well. Low-grade fever likely inflammatory.\n\n' +
          'PLAN: Continue current antibiotics. Encourage ambulation. Remove drain if output <30ml in next 12hrs. Monitor temperature.',
        orders: '1. Continue IV Ceftriaxone 1g BD\n2. Paracetamol 650mg SOS\n3. Encourage ambulation\n4. Drain removal assessment at 6am\n5. Repeat CBC + CRP tomorrow',
      });
      setLoading(false);
      setGenerated(true);
    }, 1500);
  };

  return (
    <TouchableOpacity onPress={handlePress} disabled={loading || disabled}>
      <View style={[styles.container, { backgroundColor: generated ? '#22c55e10' : '#312e8115', borderColor: generated ? '#22c55e30' : 'rgba(167,139,250,0.2)' }]}>
        <View style={styles.row}>
          {loading ? (
            <ActivityIndicator size="small" color="#a78bfa" />
          ) : generated ? (
            <CheckCircle2 size={18} color="#22c55e" />
          ) : (
            <Sparkles size={18} color="#a78bfa" />
          )}
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.title, { color: generated ? '#22c55e' : '#a78bfa' }]}>
              {loading ? 'AI Writing Note...' : generated ? 'Note Generated ✓' : 'AI Ward Round Scribe'}
            </Text>
            <Text style={[styles.sub, { color: generated ? '#22c55e80' : 'rgba(167,139,250,0.5)' }]}>
              {generated ? 'Review and sign off' : 'Auto-generate structured clinical note'}
            </Text>
          </View>
          <FileEdit size={16} color={generated ? '#22c55e' : '#a78bfa'} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { borderRadius: 16, padding: 14, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { fontFamily: FONTS.bold, fontSize: 13 },
  sub: { fontFamily: FONTS.regular, fontSize: 11, marginTop: 2 },
});
