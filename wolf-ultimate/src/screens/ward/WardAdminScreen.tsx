import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Building2, BedDouble, Plus, X, Check, Edit, Trash2, Settings } from 'lucide-react-native';
import { COLORS, FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import admissionService, { Ward, Bed } from '../../services/admissionService';

interface Props {
  navigation?: any;
}

export const WardAdminScreen: React.FC<Props> = ({ navigation }) => {
  const [wards, setWards] = useState<Ward[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);
  const [wardModalVisible, setWardModalVisible] = useState(false);
  const [bedModalVisible, setBedModalVisible] = useState(false);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  
  // Ward form
  const [wardName, setWardName] = useState('');
  const [wardFloor, setWardFloor] = useState('');
  const [wardCapacity, setWardCapacity] = useState('');
  
  // Bed form
  const [bedNumber, setBedNumber] = useState('');
  const [bedType, setBedType] = useState('general');
  const [bedWardId, setBedWardId] = useState('');
  const [dailyRate, setDailyRate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [wardData, bedData] = await Promise.all([
        admissionService.getWards(),
        admissionService.getAllBeds(),
      ]);
      setWards(wardData);
      setBeds(bedData);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openWardModal = (ward?: Ward) => {
    if (ward) {
      setWardName(ward.name);
      setWardFloor(ward.floor?.toString() || '');
      setWardCapacity(ward.capacity?.toString() || '');
      setSelectedWard(ward);
    } else {
      setWardName('');
      setWardFloor('');
      setWardCapacity('');
      setSelectedWard(null);
    }
    setWardModalVisible(true);
  };

  const openBedModal = (wardId?: string) => {
    setBedNumber('');
    setBedType('general');
    setBedWardId(wardId || (wards.length > 0 ? wards[0].id : ''));
    setDailyRate('');
    setBedModalVisible(true);
  };

  const handleSaveWard = async () => {
    if (!wardName) {
      Alert.alert('Required', 'Please enter ward name');
      return;
    }
    Alert.alert('Success', 'Ward saved (API integration pending)');
    setWardModalVisible(false);
    loadData();
  };

  const handleSaveBed = async () => {
    if (!bedNumber || !bedWardId) {
      Alert.alert('Required', 'Please enter bed number and select ward');
      return;
    }
    Alert.alert('Success', 'Bed saved (API integration pending)');
    setBedModalVisible(false);
    loadData();
  };

  const handleDeleteWard = (ward: Ward) => {
    Alert.alert('Delete Ward', `Delete ${ward.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Deleted', 'Ward removed (API integration pending)');
          loadData();
        },
      },
    ]);
  };

  const getWardBeds = (wardId: string) => beds.filter(b => b.ward_id === wardId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return COLORS.success;
      case 'occupied': return COLORS.primary;
      case 'maintenance': return COLORS.warning;
      default: return COLORS.textMuted;
    }
  };

  const BED_TYPES = ['general', 'icu', 'private', 'semi_private', 'pediatric'];

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#1e2746']} style={StyleSheet.absoluteFill} />
      <BackgroundOrb color={COLORS.secondary} position="bottom-right" />
      
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Ward Admin</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => openWardModal()}>
            <Plus size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: COLORS.primary + '20' }]}>
            <Building2 size={20} color={COLORS.primary} />
            <Text style={[styles.statValue, { color: COLORS.primary }]}>{wards.length}</Text>
            <Text style={styles.statLabel}>Wards</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: COLORS.success + '20' }]}>
            <BedDouble size={20} color={COLORS.success} />
            <Text style={[styles.statValue, { color: COLORS.success }]}>{beds.filter(b => b.status === 'available').length}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: COLORS.warning + '20' }]}>
            <Settings size={20} color={COLORS.warning} />
            <Text style={[styles.statValue, { color: COLORS.warning }]}>{beds.filter(b => b.status === 'maintenance').length}</Text>
            <Text style={styles.statLabel}>Maintenance</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : wards.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Building2 size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No wards configured</Text>
              <Text style={styles.emptySubtext}>Tap + to add a ward</Text>
            </GlassCard>
          ) : (
            wards.map((ward) => {
              const wardBeds = getWardBeds(ward.id);
              return (
                <GlassCard key={ward.id} style={styles.wardCard}>
                  <View style={styles.wardHeader}>
                    <View style={styles.wardIcon}>
                      <Building2 size={20} color={COLORS.primary} />
                    </View>
                    <View style={styles.wardInfo}>
                      <Text style={styles.wardName}>{ward.name}</Text>
                      <Text style={styles.wardMeta}>Floor {ward.floor || 1} • {wardBeds.length} beds</Text>
                    </View>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openWardModal(ward)}>
                      <Edit size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteWard(ward)}>
                      <Trash2 size={16} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>

                  {/* Bed Grid */}
                  <View style={styles.bedGrid}>
                    {wardBeds.slice(0, 8).map((bed) => (
                      <View key={bed.id} style={[styles.bedItem, { backgroundColor: getStatusColor(bed.status) + '30' }]}>
                        <BedDouble size={14} color={getStatusColor(bed.status)} />
                        <Text style={[styles.bedNum, { color: getStatusColor(bed.status) }]}>{bed.bed_number}</Text>
                      </View>
                    ))}
                    <TouchableOpacity style={styles.addBedBtn} onPress={() => openBedModal(ward.id)}>
                      <Plus size={14} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.wardStats}>
                    <Text style={styles.wardStatText}>
                      <Text style={{ color: COLORS.success }}>{wardBeds.filter(b => b.status === 'available').length}</Text> available • 
                      <Text style={{ color: COLORS.primary }}> {wardBeds.filter(b => b.status === 'occupied').length}</Text> occupied
                    </Text>
                  </View>
                </GlassCard>
              );
            })
          )}
        </ScrollView>

        {/* Ward Modal */}
        <Modal visible={wardModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedWard ? 'Edit Ward' : 'Add Ward'}</Text>
                <TouchableOpacity onPress={() => setWardModalVisible(false)}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Ward Name</Text>
              <TextInput
                style={styles.input}
                value={wardName}
                onChangeText={setWardName}
                placeholder="e.g. General Ward, ICU, NICU"
                placeholderTextColor={COLORS.textMuted}
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Floor</Text>
                  <TextInput
                    style={styles.input}
                    value={wardFloor}
                    onChangeText={setWardFloor}
                    placeholder="1"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.label}>Capacity</Text>
                  <TextInput
                    style={styles.input}
                    value={wardCapacity}
                    onChangeText={setWardCapacity}
                    placeholder="20"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveWard}>
                <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.submitGradient}>
                  <Check size={20} color="#fff" />
                  <Text style={styles.submitText}>{selectedWard ? 'Update Ward' : 'Create Ward'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Bed Modal */}
        <Modal visible={bedModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Bed</Text>
                <TouchableOpacity onPress={() => setBedModalVisible(false)}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Bed Number</Text>
              <TextInput
                style={styles.input}
                value={bedNumber}
                onChangeText={setBedNumber}
                placeholder="e.g. 101, A-12"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.label}>Ward</Text>
              <ScrollView horizontal style={styles.wardSelector}>
                {wards.map((w) => (
                  <TouchableOpacity 
                    key={w.id} 
                    style={[styles.wardChip, bedWardId === w.id && styles.wardChipSelected]}
                    onPress={() => setBedWardId(w.id)}
                  >
                    <Text style={[styles.wardChipText, bedWardId === w.id && { color: '#fff' }]}>{w.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Bed Type</Text>
              <View style={styles.typeRow}>
                {BED_TYPES.map((t) => (
                  <TouchableOpacity 
                    key={t} 
                    style={[styles.typeChip, bedType === t && styles.typeChipSelected]}
                    onPress={() => setBedType(t)}
                  >
                    <Text style={[styles.typeChipText, bedType === t && { color: '#fff' }]}>{t.replace('_', ' ')}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Daily Rate (₹)</Text>
              <TextInput
                style={styles.input}
                value={dailyRate}
                onChangeText={setDailyRate}
                placeholder="e.g. 500"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveBed}>
                <LinearGradient colors={[COLORS.success, '#059669']} style={styles.submitGradient}>
                  <Check size={20} color="#fff" />
                  <Text style={styles.submitText}>Add Bed</Text>
                </LinearGradient>
              </TouchableOpacity>
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
  statsRow: { flexDirection: 'row', paddingHorizontal: SPACING.m, marginBottom: SPACING.m },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, marginHorizontal: 4 },
  statValue: { fontFamily: FONTS.bold, fontSize: 20, marginTop: 4 },
  statLabel: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10 },
  loadingText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 40 },
  emptyCard: { padding: SPACING.xl, alignItems: 'center' },
  emptyText: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginTop: SPACING.m },
  emptySubtext: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 13 },
  wardCard: { padding: SPACING.m, marginBottom: SPACING.m },
  wardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.m },
  wardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center' },
  wardInfo: { flex: 1, marginLeft: 12 },
  wardName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16 },
  wardMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12 },
  editBtn: { padding: 8, backgroundColor: COLORS.primary + '20', borderRadius: 8, marginRight: 6 },
  deleteBtn: { padding: 8, backgroundColor: COLORS.error + '20', borderRadius: 8 },
  bedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bedItem: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  bedNum: { fontFamily: FONTS.bold, fontSize: 11, marginLeft: 4 },
  addBedBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.primary + '20' },
  wardStats: { marginTop: SPACING.m, paddingTop: SPACING.s, borderTopWidth: 1, borderTopColor: COLORS.border },
  wardStatText: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.m },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m },
  modalTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 20 },
  label: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 13, marginBottom: 6, marginTop: SPACING.m },
  input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.m, fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  row: { flexDirection: 'row' },
  wardSelector: { flexDirection: 'row' },
  wardChip: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: COLORS.surface, borderRadius: 10, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
  wardChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  wardChipText: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 13 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  typeChipSelected: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  typeChipText: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 11, textTransform: 'capitalize' },
  submitBtn: { marginTop: SPACING.l },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, padding: 16 },
  submitText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 16, marginLeft: 8 },
});

export default WardAdminScreen;
