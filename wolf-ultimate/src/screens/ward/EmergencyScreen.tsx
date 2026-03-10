import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, X, Check, Phone, Siren, History } from 'lucide-react-native';
import { COLORS, FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import emergencyService, { Emergency } from '../../services/emergencyService';

interface Props {
  route?: { params?: { wardId?: string; wardName?: string } };
  navigation?: any;
}

export const EmergencyScreen: React.FC<Props> = ({ route, navigation }) => {
  const wardId = route?.params?.wardId;
  const wardName = route?.params?.wardName || 'Ward';

  const [activeEmergencies, setActiveEmergencies] = useState<Emergency[]>([]);
  const [history, setHistory] = useState<Emergency[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggerModalVisible, setTriggerModalVisible] = useState(false);
  const [selectedCode, setSelectedCode] = useState<Emergency['code'] | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [active, hist] = await Promise.all([
        emergencyService.getActiveEmergencies(),
        emergencyService.getEmergencyHistory(),
      ]);
      setActiveEmergencies(active);
      setHistory(hist.filter(e => e.status === 'resolved'));
    } catch (error) {
      console.error('Failed to load emergencies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrigger = async (code: Emergency['code']) => {
    Vibration.vibrate([0, 100, 100, 100]); // Alert vibration
    
    Alert.alert(
      `Trigger ${emergencyService.CODES[code].name}?`,
      `This will alert all staff in ${wardName}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'TRIGGER',
          style: 'destructive',
          onPress: async () => {
            try {
              await emergencyService.triggerEmergency({
                code,
                location: wardName,
                ward_id: wardId,
              });
              Alert.alert('Emergency Triggered', `${emergencyService.CODES[code].name} has been activated`);
              setTriggerModalVisible(false);
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to trigger emergency');
            }
          },
        },
      ]
    );
  };

  const handleRespond = async (emergency: Emergency) => {
    try {
      await emergencyService.respondToEmergency(emergency.id);
      Alert.alert('Responding', 'Your response has been recorded');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to respond');
    }
  };

  const handleResolve = async (emergency: Emergency) => {
    Alert.alert('Resolve Emergency', 'Mark this emergency as resolved?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resolve',
        onPress: async () => {
          try {
            await emergencyService.resolveEmergency(emergency.id);
            Alert.alert('Resolved', 'Emergency has been resolved');
            loadData();
          } catch (error) {
            Alert.alert('Error', 'Failed to resolve');
          }
        },
      },
    ]);
  };

  const codes = Object.entries(emergencyService.CODES);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#1f1f2e']} style={StyleSheet.absoluteFill} />
      <BackgroundOrb color={COLORS.error} position="top-right" />
      
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Emergency</Text>
          <TouchableOpacity style={styles.triggerBtn} onPress={() => setTriggerModalVisible(true)}>
            <Siren size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Active Emergency Banner */}
        {activeEmergencies.length > 0 && (
          <View style={styles.activeBanner}>
            <AlertTriangle size={24} color="#fff" />
            <Text style={styles.activeCount}>{activeEmergencies.length} Active Emergency</Text>
          </View>
        )}

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {/* Active Emergencies */}
          {activeEmergencies.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>🚨 Active Emergencies</Text>
              {activeEmergencies.map((em) => {
                const codeInfo = emergencyService.CODES[em.code];
                return (
                  <GlassCard key={em.id} style={[styles.emergencyCard, { borderColor: codeInfo.color }]}>
                    <View style={[styles.codeHeader, { backgroundColor: codeInfo.color }]}>
                      <Text style={styles.codeEmoji}>{codeInfo.icon}</Text>
                      <Text style={styles.codeName}>{codeInfo.name}</Text>
                    </View>
                    <View style={styles.emergencyBody}>
                      <Text style={styles.emergencyLocation}>{em.location}</Text>
                      <Text style={styles.emergencyTime}>Triggered {new Date(em.triggered_at).toLocaleTimeString()}</Text>
                      <View style={styles.emergencyActions}>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success }]} onPress={() => handleRespond(em)}>
                          <Phone size={18} color="#fff" />
                          <Text style={styles.actionText}>Responding</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.textMuted }]} onPress={() => handleResolve(em)}>
                          <Check size={18} color="#fff" />
                          <Text style={styles.actionText}>Resolve</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </GlassCard>
                );
              })}
            </>
          )}

          {/* Quick Trigger Buttons */}
          <Text style={styles.sectionTitle}>Quick Trigger</Text>
          <View style={styles.codeGrid}>
            {codes.map(([code, info]) => (
              <TouchableOpacity 
                key={code} 
                style={[styles.codeCard, { backgroundColor: info.color }]}
                onPress={() => handleTrigger(code as Emergency['code'])}
              >
                <Text style={styles.codeCardEmoji}>{info.icon}</Text>
                <Text style={styles.codeCardName}>{info.name}</Text>
                <Text style={styles.codeCardDesc}>{info.description}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* History */}
          <View style={styles.historyHeader}>
            <History size={18} color={COLORS.textMuted} />
            <Text style={styles.historyTitle}>Recent History</Text>
          </View>
          {history.length === 0 ? (
            <Text style={styles.noHistory}>No recent emergencies</Text>
          ) : (
            history.slice(0, 5).map((em) => {
              const codeInfo = emergencyService.CODES[em.code];
              return (
                <GlassCard key={em.id} style={styles.historyCard}>
                  <View style={[styles.historyDot, { backgroundColor: codeInfo.color }]} />
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyName}>{codeInfo.name}</Text>
                    <Text style={styles.historyLoc}>{em.location}</Text>
                  </View>
                  <Text style={styles.historyDate}>{new Date(em.triggered_at).toLocaleDateString()}</Text>
                </GlassCard>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.m, paddingVertical: SPACING.s },
  backBtn: { fontFamily: FONTS.medium, color: COLORS.primary, fontSize: 16 },
  title: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 20 },
  triggerBtn: { padding: 10, backgroundColor: COLORS.error, borderRadius: 12 },
  activeBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.error, padding: 12, marginHorizontal: SPACING.m, borderRadius: 12, marginBottom: SPACING.m },
  activeCount: { fontFamily: FONTS.bold, color: '#fff', fontSize: 16, marginLeft: 8 },
  sectionTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginBottom: SPACING.m },
  emergencyCard: { marginBottom: SPACING.m, borderWidth: 2, overflow: 'hidden' },
  codeHeader: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  codeEmoji: { fontSize: 24 },
  codeName: { fontFamily: FONTS.bold, color: '#fff', fontSize: 18, marginLeft: 8 },
  emergencyBody: { padding: SPACING.m },
  emergencyLocation: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16 },
  emergencyTime: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  emergencyActions: { flexDirection: 'row', marginTop: SPACING.m, gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10 },
  actionText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 14, marginLeft: 6 },
  codeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  codeCard: { width: '47%', padding: SPACING.m, borderRadius: 16, alignItems: 'center' },
  codeCardEmoji: { fontSize: 32 },
  codeCardName: { fontFamily: FONTS.bold, color: '#fff', fontSize: 14, marginTop: 8 },
  codeCardDesc: { fontFamily: FONTS.regular, color: 'rgba(255,255,255,0.8)', fontSize: 10, textAlign: 'center' },
  historyHeader: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.l, marginBottom: SPACING.m },
  historyTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginLeft: 8 },
  noHistory: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 13 },
  historyCard: { flexDirection: 'row', alignItems: 'center', padding: SPACING.m, marginBottom: SPACING.s },
  historyDot: { width: 12, height: 12, borderRadius: 6 },
  historyInfo: { flex: 1, marginLeft: 12 },
  historyName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  historyLoc: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11 },
  historyDate: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10 },
});

export default EmergencyScreen;
