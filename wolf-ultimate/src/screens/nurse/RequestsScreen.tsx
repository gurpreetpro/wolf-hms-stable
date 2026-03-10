import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Send, Pill, Utensils, SprayCan, X, Check, Clock } from 'lucide-react-native';
import { COLORS, FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import requestService, { Request } from '../../services/requestService';

interface Props {
  route?: { params?: { admissionId?: string; patientName?: string; wardId?: string } };
  navigation?: any;
}

type RequestType = 'pharmacy' | 'housekeeping' | 'dietary';

export const RequestsScreen: React.FC<Props> = ({ route, navigation }) => {
  const admissionId = route?.params?.admissionId;
  const patientName = route?.params?.patientName || 'Ward';
  const wardId = route?.params?.wardId;

  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [requestType, setRequestType] = useState<RequestType>('pharmacy');
  
  // Form state
  const [items, setItems] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [housekeepingType, setHousekeepingType] = useState('cleaning');
  const [dietType, setDietType] = useState('');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner'>('lunch');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await requestService.getPendingRequests();
      setRequests(data);
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type: RequestType) => {
    setRequestType(type);
    setItems('');
    setPriority('normal');
    setNotes('');
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      if (requestType === 'pharmacy') {
        if (!items) {
          Alert.alert('Required', 'Please enter items');
          return;
        }
        await requestService.createPharmacyRequest({
          admission_id: admissionId!,
          items: items.split(',').map(i => i.trim()),
          priority,
          notes: notes || undefined,
        });
      } else if (requestType === 'housekeeping') {
        await requestService.createHousekeepingRequest({
          ward_id: wardId,
          type: housekeepingType as any,
          priority,
          description: notes || undefined,
        });
      } else if (requestType === 'dietary') {
        if (!dietType) {
          Alert.alert('Required', 'Please select diet type');
          return;
        }
        await requestService.createDietaryRequest({
          admission_id: admissionId!,
          meal_type: mealType,
          diet_type: dietType,
          notes: notes || undefined,
        });
      }
      Alert.alert('Success', 'Request sent');
      setModalVisible(false);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to send request');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pharmacy': return <Pill size={16} color={COLORS.primary} />;
      case 'housekeeping': return <SprayCan size={16} color={COLORS.warning} />;
      case 'dietary': return <Utensils size={16} color={COLORS.success} />;
      default: return <Send size={16} color={COLORS.textMuted} />;
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'urgent': return COLORS.error;
      case 'high': return COLORS.warning;
      default: return COLORS.textMuted;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#1f2937']} style={StyleSheet.absoluteFill} />
      <BackgroundOrb color={COLORS.warning} position="top-left" />
      
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Quick Requests</Text>
          <View style={{ width: 50 }} />
        </View>

        <Text style={styles.patientName}>{patientName}</Text>

        {/* Quick Action Cards */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: COLORS.primary + '20' }]} onPress={() => openModal('pharmacy')}>
            <Pill size={28} color={COLORS.primary} />
            <Text style={styles.actionLabel}>Pharmacy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: COLORS.warning + '20' }]} onPress={() => openModal('housekeeping')}>
            <SprayCan size={28} color={COLORS.warning} />
            <Text style={styles.actionLabel}>Housekeeping</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: COLORS.success + '20' }]} onPress={() => openModal('dietary')}>
            <Utensils size={28} color={COLORS.success} />
            <Text style={styles.actionLabel}>Dietary</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          <Text style={styles.sectionTitle}>Pending Requests ({requests.filter(r => r.status === 'pending').length})</Text>

          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : requests.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Send size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No pending requests</Text>
            </GlassCard>
          ) : (
            requests.map((req) => (
              <GlassCard key={req.id} style={styles.requestCard}>
                <View style={styles.reqRow}>
                  {getTypeIcon(req.type)}
                  <View style={styles.reqInfo}>
                    <Text style={styles.reqType}>{req.type.charAt(0).toUpperCase() + req.type.slice(1)}</Text>
                    <Text style={styles.reqDesc}>{req.description}</Text>
                  </View>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(req.priority) + '20' }]}>
                    <Text style={[styles.priorityText, { color: getPriorityColor(req.priority) }]}>{req.priority}</Text>
                  </View>
                </View>
                <View style={styles.reqFooter}>
                  <Clock size={12} color={COLORS.textMuted} />
                  <Text style={styles.reqTime}>{new Date(req.requested_at).toLocaleTimeString()}</Text>
                  <Text style={[styles.reqStatus, { color: req.status === 'in_progress' ? COLORS.warning : COLORS.textMuted }]}>{req.status}</Text>
                </View>
              </GlassCard>
            ))
          )}
        </ScrollView>

        {/* Request Modal */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {requestType === 'pharmacy' ? '💊 Pharmacy Request' : 
                   requestType === 'housekeeping' ? '🧹 Housekeeping' : '🍽️ Dietary Request'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView>
                {requestType === 'pharmacy' && (
                  <>
                    <Text style={styles.label}>Items (comma separated)</Text>
                    <TextInput
                      style={styles.input}
                      value={items}
                      onChangeText={setItems}
                      placeholder="e.g. Paracetamol 500mg, Omeprazole 20mg"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </>
                )}

                {requestType === 'housekeeping' && (
                  <>
                    <Text style={styles.label}>Type</Text>
                    <View style={styles.typeRow}>
                      {requestService.HOUSEKEEPING_TYPES.map((t) => (
                        <TouchableOpacity 
                          key={t.value} 
                          style={[styles.typeItem, housekeepingType === t.value && styles.typeSelected]}
                          onPress={() => setHousekeepingType(t.value)}
                        >
                          <Text style={styles.typeEmoji}>{t.icon}</Text>
                          <Text style={[styles.typeLabel, housekeepingType === t.value && { color: '#fff' }]}>{t.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                {requestType === 'dietary' && (
                  <>
                    <Text style={styles.label}>Meal</Text>
                    <View style={styles.mealRow}>
                      {(['breakfast', 'lunch', 'dinner'] as const).map((m) => (
                        <TouchableOpacity 
                          key={m} 
                          style={[styles.mealItem, mealType === m && styles.mealSelected]}
                          onPress={() => setMealType(m)}
                        >
                          <Text style={[styles.mealText, mealType === m && { color: '#fff' }]}>{m.charAt(0).toUpperCase() + m.slice(1)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.label}>Diet Type</Text>
                    <View style={styles.dietGrid}>
                      {requestService.DIET_TYPES.slice(0, 8).map((d) => (
                        <TouchableOpacity 
                          key={d} 
                          style={[styles.dietItem, dietType === d && styles.dietSelected]}
                          onPress={() => setDietType(d)}
                        >
                          <Text style={[styles.dietText, dietType === d && { color: '#fff' }]}>{d}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                <Text style={styles.label}>Priority</Text>
                <View style={styles.priorityRow}>
                  {(['normal', 'high', 'urgent'] as const).map((p) => (
                    <TouchableOpacity 
                      key={p} 
                      style={[styles.prioItem, priority === p && { backgroundColor: getPriorityColor(p) }]}
                      onPress={() => setPriority(p)}
                    >
                      <Text style={[styles.prioText, priority === p && { color: '#fff' }]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Notes (optional)</Text>
                <TextInput
                  style={[styles.input, { height: 80 }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Additional instructions..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                />

                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                  <LinearGradient 
                    colors={requestType === 'pharmacy' ? [COLORS.primary, COLORS.secondary] : 
                            requestType === 'housekeeping' ? [COLORS.warning, '#d97706'] : 
                            [COLORS.success, '#059669']} 
                    style={styles.submitGradient}
                  >
                    <Send size={20} color="#fff" />
                    <Text style={styles.submitText}>Send Request</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.m, paddingVertical: SPACING.s },
  backBtn: { fontFamily: FONTS.medium, color: COLORS.primary, fontSize: 16 },
  title: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 20 },
  patientName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 24, textAlign: 'center', marginBottom: SPACING.m },
  actionsRow: { flexDirection: 'row', paddingHorizontal: SPACING.m, gap: 12 },
  actionCard: { flex: 1, alignItems: 'center', paddingVertical: 20, borderRadius: 16 },
  actionLabel: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 12, marginTop: 8 },
  sectionTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginBottom: SPACING.m },
  loadingText: { color: COLORS.textSecondary, textAlign: 'center' },
  emptyCard: { padding: SPACING.xl, alignItems: 'center' },
  emptyText: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginTop: SPACING.m },
  requestCard: { padding: SPACING.m, marginBottom: SPACING.s },
  reqRow: { flexDirection: 'row', alignItems: 'center' },
  reqInfo: { flex: 1, marginLeft: 12 },
  reqType: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  reqDesc: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  priorityText: { fontFamily: FONTS.bold, fontSize: 10, textTransform: 'capitalize' },
  reqFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  reqTime: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginLeft: 4, flex: 1 },
  reqStatus: { fontFamily: FONTS.medium, fontSize: 10, textTransform: 'capitalize' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.m, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m },
  modalTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 20 },
  label: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 13, marginBottom: 6, marginTop: SPACING.m },
  input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.m, fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeItem: { alignItems: 'center', padding: 12, backgroundColor: COLORS.surface, borderRadius: 12, width: '30%', borderWidth: 1, borderColor: COLORS.border },
  typeSelected: { backgroundColor: COLORS.warning, borderColor: COLORS.warning },
  typeEmoji: { fontSize: 24 },
  typeLabel: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 9, marginTop: 4, textAlign: 'center' },
  mealRow: { flexDirection: 'row', gap: 8 },
  mealItem: { flex: 1, paddingVertical: 12, backgroundColor: COLORS.surface, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  mealSelected: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  mealText: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 13 },
  dietGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dietItem: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  dietSelected: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  dietText: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 11 },
  priorityRow: { flexDirection: 'row', gap: 8 },
  prioItem: { flex: 1, paddingVertical: 12, backgroundColor: COLORS.surface, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  prioText: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 13 },
  submitBtn: { marginTop: SPACING.l },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, padding: 16 },
  submitText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 16, marginLeft: 8 },
});

export default RequestsScreen;
