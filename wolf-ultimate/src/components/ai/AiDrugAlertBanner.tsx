import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle, X, Pill } from 'lucide-react-native';
import { FONTS } from '../../theme/theme';

// ═══════════════════════════════════════
//  AI DRUG ALERT BANNER
//  Shows drug interaction warnings
// ═══════════════════════════════════════

export interface DrugAlert {
  severity: 'critical' | 'major' | 'moderate' | 'minor';
  drug1: string;
  drug2: string;
  description: string;
  recommendation: string;
}

interface AiDrugAlertBannerProps {
  alerts: DrugAlert[];
  onDismiss?: (index: number) => void;
}

const SEVERITY_MAP = {
  critical: { color: '#ef4444', bg: '#ef444415', label: 'CRITICAL' },
  major: { color: '#f97316', bg: '#f9731615', label: 'MAJOR' },
  moderate: { color: '#f59e0b', bg: '#f59e0b15', label: 'MODERATE' },
  minor: { color: '#3b82f6', bg: '#3b82f615', label: 'MINOR' },
};

export const AiDrugAlertBanner: React.FC<AiDrugAlertBannerProps> = ({ alerts, onDismiss }) => {
  if (alerts.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      {alerts.map((alert, i) => {
        const config = SEVERITY_MAP[alert.severity];
        return (
          <View key={`${alert.drug1}-${alert.drug2}`} style={[styles.banner, { backgroundColor: config.bg, borderColor: config.color + '30' }]}>
            <View style={styles.topRow}>
              <View style={styles.iconRow}>
                <AlertTriangle size={14} color={config.color} />
                <View style={[styles.severityBadge, { backgroundColor: config.color }]}>
                  <Text style={styles.severityText}>{config.label}</Text>
                </View>
              </View>
              {onDismiss && (
                <TouchableOpacity onPress={() => onDismiss(i)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <X size={14} color={config.color} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.drugRow}>
              <Pill size={12} color={config.color} />
              <Text style={[styles.drugText, { color: config.color }]}>
                {alert.drug1} ✕ {alert.drug2}
              </Text>
            </View>
            <Text style={[styles.desc, { color: config.color + 'cc' }]}>{alert.description}</Text>
            <Text style={[styles.rec, { color: config.color + '99' }]}>💡 {alert.recommendation}</Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  banner: { borderRadius: 14, padding: 12, borderWidth: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  severityBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  severityText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 8, letterSpacing: 1 },
  drugRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  drugText: { fontFamily: FONTS.bold, fontSize: 13 },
  desc: { fontFamily: FONTS.regular, fontSize: 12, lineHeight: 16, marginBottom: 4 },
  rec: { fontFamily: FONTS.medium, fontSize: 11 },
});
