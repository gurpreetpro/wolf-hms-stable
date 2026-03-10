import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FlaskConical, Plus, Search, X, Check, Clock, AlertTriangle, ChevronDown } from 'lucide-react-native';
import { COLORS, FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import labService, { LabOrder, LabTest, LabResult } from '../../services/labService';

interface Props {
  route?: { params?: { patientId?: string; patientName?: string; visitId?: string } };
  navigation?: any;
}

export const LabOrderScreen: React.FC<Props> = ({ route, navigation }) => {
  const patientId = route?.params?.patientId;
  const patientName = route?.params?.patientName || 'Patient';
  const visitId = route?.params?.visitId;
  
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [resultsModalVisible, setResultsModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [results, setResults] = useState<LabResult[]>([]);
  
  // Create order state
  const [availableTests, setAvailableTests] = useState<LabTest[]>([]);
  const [selectedTests, setSelectedTests] = useState<LabTest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [priority, setPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [clinicalNotes, setClinicalNotes] = useState('');

  useEffect(() => {
    if (patientId) {
      loadOrders();
    }
    loadAvailableTests();
  }, [patientId]);

  const loadOrders = async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const data = await labService.getPatientLabOrders(patientId);
      setOrders(data);
    } catch (error) {
      console.error('Failed to load lab orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTests = async () => {
    try {
      const tests = await labService.getAvailableTests();
      setAvailableTests(tests);
    } catch (error) {
      console.error('Failed to load lab tests:', error);
    }
  };

  const viewResults = async (order: LabOrder) => {
    setSelectedOrder(order);
    try {
      const resultData = await labService.getLabResults(order.id);
      setResults(resultData);
      setResultsModalVisible(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to load lab results');
    }
  };

  const toggleTestSelection = (test: LabTest) => {
    if (selectedTests.find(t => t.id === test.id)) {
      setSelectedTests(selectedTests.filter(t => t.id !== test.id));
    } else {
      setSelectedTests([...selectedTests, test]);
    }
  };

  const submitOrder = async () => {
    if (selectedTests.length === 0) {
      Alert.alert('Select Tests', 'Please select at least one lab test');
      return;
    }
    try {
      await labService.createLabOrder({
        patient_id: patientId!,
        visit_id: visitId,
        test_ids: selectedTests.map(t => t.id),
        priority,
        clinical_notes: clinicalNotes,
      });
      Alert.alert('Success', 'Lab order created successfully');
      setModalVisible(false);
      setSelectedTests([]);
      setClinicalNotes('');
      loadOrders();
    } catch (error) {
      Alert.alert('Error', 'Failed to create lab order');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return COLORS.success;
      case 'processing': return COLORS.warning;
      case 'sample_collected': return COLORS.info || COLORS.primary;
      default: return COLORS.textMuted;
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'stat': return COLORS.error;
      case 'urgent': return COLORS.warning;
      default: return COLORS.textMuted;
    }
  };

  const filteredTests = availableTests.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#111827']} style={StyleSheet.absoluteFill} />
      <BackgroundOrb color={COLORS.primary} position="top-right" />
      
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Lab Orders</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Plus size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <Text style={styles.patientName}>{patientName}</Text>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {loading ? (
            <Text style={styles.loadingText}>Loading lab orders...</Text>
          ) : orders.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <FlaskConical size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No lab orders yet</Text>
              <Text style={styles.emptySubtext}>Tap + to order lab tests</Text>
            </GlassCard>
          ) : (
            orders.map((order) => (
              <TouchableOpacity key={order.id} onPress={() => order.status === 'completed' && viewResults(order)}>
                <GlassCard style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <View style={styles.orderIconWrap}>
                      <FlaskConical size={18} color={getStatusColor(order.status)} />
                    </View>
                    <View style={{ flex: 1, marginLeft: SPACING.s }}>
                      <Text style={styles.orderDate}>{new Date(order.created_at).toLocaleDateString()}</Text>
                      <Text style={styles.testCount}>{order.tests?.length || 0} tests</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '30' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                          {order.status.replace('_', ' ')}
                        </Text>
                      </View>
                      {order.priority !== 'routine' && (
                        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(order.priority) + '20' }]}>
                          <AlertTriangle size={10} color={getPriorityColor(order.priority)} />
                          <Text style={[styles.priorityText, { color: getPriorityColor(order.priority) }]}>{order.priority}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.testList}>
                    {order.tests?.slice(0, 3).map((test, idx) => (
                      <Text key={idx} style={styles.testItem}>• {test.test_name}</Text>
                    ))}
                    {order.tests?.length > 3 && (
                      <Text style={styles.moreText}>+{order.tests.length - 3} more</Text>
                    )}
                  </View>
                  {order.status === 'completed' && (
                    <View style={styles.viewResultsHint}>
                      <Text style={styles.viewResultsText}>Tap to view results →</Text>
                    </View>
                  )}
                </GlassCard>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Create Lab Order Modal */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Order Lab Tests</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              {/* Priority Selector */}
              <Text style={styles.label}>Priority</Text>
              <View style={styles.priorityRow}>
                {(['routine', 'urgent', 'stat'] as const).map((p) => (
                  <TouchableOpacity key={p} style={[styles.priorityBtn, priority === p && styles.priorityBtnActive]} onPress={() => setPriority(p)}>
                    <Text style={[styles.priorityBtnText, priority === p && styles.priorityBtnTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Search Tests */}
              <Text style={styles.label}>Search Tests</Text>
              <View style={styles.searchWrap}>
                <Search size={18} color={COLORS.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search lab tests..."
                  placeholderTextColor={COLORS.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {/* Test List */}
              <ScrollView style={{ maxHeight: 200, marginTop: SPACING.s }}>
                {filteredTests.map((test) => (
                  <TouchableOpacity key={test.id} style={styles.testRow} onPress={() => toggleTestSelection(test)}>
                    <View style={[styles.checkbox, selectedTests.find(t => t.id === test.id) && styles.checkboxSelected]}>
                      {selectedTests.find(t => t.id === test.id) && <Check size={14} color="#fff" />}
                    </View>
                    <View style={{ flex: 1, marginLeft: SPACING.s }}>
                      <Text style={styles.testName}>{test.name}</Text>
                      <Text style={styles.testCategory}>{test.category} • ₹{test.price}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Selected Count */}
              <Text style={styles.selectedCount}>{selectedTests.length} tests selected</Text>

              {/* Clinical Notes */}
              <Text style={[styles.label, { marginTop: SPACING.m }]}>Clinical Notes (Optional)</Text>
              <TextInput
                style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                placeholder="Reason for ordering..."
                placeholderTextColor={COLORS.textMuted}
                value={clinicalNotes}
                onChangeText={setClinicalNotes}
                multiline
              />

              {/* Submit Button */}
              <TouchableOpacity style={styles.submitBtn} onPress={submitOrder}>
                <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.submitGradient}>
                  <Check size={20} color="#fff" />
                  <Text style={styles.submitText}>Create Lab Order</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Results Modal */}
        <Modal visible={resultsModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Lab Results</Text>
                <TouchableOpacity onPress={() => setResultsModalVisible(false)}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView>
                {results.map((result) => (
                  <GlassCard key={result.id} style={[styles.resultCard, result.is_abnormal && styles.abnormalCard]}>
                    <View style={styles.resultHeader}>
                      <Text style={styles.resultName}>{result.test_name}</Text>
                      {result.is_abnormal && (
                        <View style={styles.abnormalBadge}>
                          <AlertTriangle size={12} color={COLORS.error} />
                          <Text style={styles.abnormalText}>Abnormal</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.resultValueRow}>
                      <Text style={[styles.resultValue, result.is_abnormal && { color: COLORS.error }]}>
                        {result.value} {result.unit}
                      </Text>
                      <Text style={styles.normalRange}>Normal: {result.normal_range}</Text>
                    </View>
                    {result.notes && <Text style={styles.resultNotes}>{result.notes}</Text>}
                  </GlassCard>
                ))}
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
  addBtn: { padding: 8, backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  patientName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 24, paddingHorizontal: SPACING.m, marginBottom: SPACING.s },
  loadingText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 40 },
  emptyCard: { padding: SPACING.xl, alignItems: 'center' },
  emptyText: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginTop: SPACING.m },
  emptySubtext: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 14, marginTop: SPACING.xs },
  orderCard: { padding: SPACING.m, marginBottom: SPACING.m },
  orderHeader: { flexDirection: 'row', alignItems: 'center' },
  orderIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center' },
  orderDate: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16 },
  testCount: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontFamily: FONTS.medium, fontSize: 11, textTransform: 'capitalize' },
  priorityBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  priorityText: { fontFamily: FONTS.bold, fontSize: 9, marginLeft: 2, textTransform: 'uppercase' },
  testList: { marginTop: SPACING.s, paddingLeft: 44 },
  testItem: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 13, marginBottom: 2 },
  moreText: { fontFamily: FONTS.medium, color: COLORS.primary, fontSize: 12, marginTop: 4 },
  viewResultsHint: { marginTop: SPACING.s, paddingTop: SPACING.s, borderTopWidth: 1, borderTopColor: COLORS.border },
  viewResultsText: { fontFamily: FONTS.medium, color: COLORS.primary, fontSize: 12, textAlign: 'right' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.m, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m },
  modalTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 20 },
  label: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 13, marginBottom: SPACING.xs },
  priorityRow: { flexDirection: 'row', marginBottom: SPACING.m },
  priorityBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.surface, marginHorizontal: 4, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  priorityBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  priorityBtnText: { fontFamily: FONTS.medium, color: COLORS.textMuted, fontSize: 13, textTransform: 'capitalize' },
  priorityBtnTextActive: { color: '#fff' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: SPACING.m, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, fontFamily: FONTS.regular, color: COLORS.text, fontSize: 15, paddingVertical: SPACING.m, marginLeft: 8 },
  testRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.s, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  checkboxSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  testName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  testCategory: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12 },
  selectedCount: { fontFamily: FONTS.medium, color: COLORS.primary, fontSize: 13, marginTop: SPACING.s },
  input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.m, fontFamily: FONTS.regular, color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.m },
  submitBtn: { marginTop: SPACING.m },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, padding: 16 },
  submitText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 16, marginLeft: 8 },
  resultCard: { padding: SPACING.m, marginBottom: SPACING.s },
  abnormalCard: { borderWidth: 1, borderColor: COLORS.error + '50' },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  abnormalBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.error + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  abnormalText: { fontFamily: FONTS.bold, color: COLORS.error, fontSize: 10, marginLeft: 4 },
  resultValueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: SPACING.xs },
  resultValue: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 20 },
  normalRange: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12 },
  resultNotes: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 13, marginTop: SPACING.xs, fontStyle: 'italic' },
});

export default LabOrderScreen;
