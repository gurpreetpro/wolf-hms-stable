import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Sparkles, FileText, CheckCircle2 } from 'lucide-react-native';
import { FONTS } from '../../theme/theme';
import { useTheme } from '../../theme/ThemeContext';

// ═══════════════════════════════════════════════
//  AI HANDOVER GENERATOR — Auto-fill SBAR
// ═══════════════════════════════════════════════

interface AiHandoverGeneratorProps {
  onGenerate: (sbar: { situation: string; background: string; assessment: string; recommendation: string }) => void;
  disabled?: boolean;
}

export const AiHandoverGenerator: React.FC<AiHandoverGeneratorProps> = ({ onGenerate, disabled }) => {
  const { theme: COLORS } = useTheme();
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handlePress = async () => {
    if (loading || disabled) return;
    setLoading(true);
    // Simulate AI generation from patient data
    setTimeout(() => {
      onGenerate({
        situation: 'Evening shift handover. 24 patients across Ward A, Ward B, and ICU. 3 critical patients require close monitoring. 1 active escalation pending consultant response.',
        background: 'Ward A: 10 patients (2 post-op, 1 febrile). Ward B: 8 patients (1 AKI under nephrology review). ICU: 6 patients (1 on BiPAP with declining SpO₂, 2 on ventilators stable).',
        assessment: 'ICU Bed 3 highest priority — SpO₂ trending down despite BiPAP, may need intubation. Ward B Rm 204 creatinine rising, nephrology consulted but pending. Ward A Rm 112 post-op fever may indicate SSI.',
        recommendation: 'Monitor ICU Bed 3 ABG at 22:00. If SpO₂ <85%, escalate to Dr. Rao. Follow up nephrology for Ward B Rm 204. Start empirical antibiotics for Ward A Rm 112 if fever persists.',
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
              {loading ? 'AI Generating SBAR...' : generated ? 'SBAR Generated ✓' : 'AI Auto-Generate SBAR'}
            </Text>
            <Text style={[styles.sub, { color: generated ? '#22c55e80' : 'rgba(167,139,250,0.5)' }]}>
              {generated ? 'Review and edit as needed' : 'Summarize your shift from clinical data'}
            </Text>
          </View>
          <FileText size={16} color={generated ? '#22c55e' : '#a78bfa'} />
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
