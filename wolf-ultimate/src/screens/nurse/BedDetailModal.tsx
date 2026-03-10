import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { X, BedDouble, Activity, CheckCircle2, MoreHorizontal } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, SHADOWS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { Bed } from '../../services/nurseService';

interface Props {
  visible: boolean;
  onClose: () => void;
  bed: Bed | null;
}

export const BedDetailModal = ({ visible, onClose, bed }: Props) => {
  const navigation = useNavigation<any>();
  if (!bed) return null;

  const isOccupied = bed.status === 'Occupied';
  const statusColor = isOccupied ? COLORS.primary : 
                      bed.status === 'Available' ? COLORS.success : COLORS.warning;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={20} tint="dark" style={styles.blur} />
        
        <View style={styles.modalContent}>
            <View style={styles.header}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <BedDouble size={24} color={COLORS.text} style={{marginRight: 10}} />
                    <Text style={styles.title}>Bed {bed.bed_number}</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <X size={24} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: SPACING.m }}>
                
                {/* Status Card */}
                <GlassCard style={{ marginBottom: SPACING.m, borderColor: statusColor }} intensity={20}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                         <Text style={styles.label}>Current Status</Text>
                         <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: statusColor + '20', borderRadius: 8 }}>
                             <Text style={{ fontFamily: FONTS.bold, color: statusColor }}>{bed.status}</Text>
                         </View>
                    </View>
                </GlassCard>

                {/* Patient Info (If Occupied) */}
                {isOccupied ? (
                    <>
                        <Text style={styles.sectionHeader}>Patient Information</Text>
                        <GlassCard style={{ marginBottom: SPACING.m }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{bed.patient_name?.charAt(0) || '?'}</Text>
                                </View>
                                <View style={{ marginLeft: 16 }}>
                                    <Text style={styles.name}>{bed.patient_name}</Text>
                                    <Text style={styles.subText}>Admitted: Today, 09:00 AM</Text> 
                                </View>
                            </View>
                            
                            <View style={styles.divider} />
                            
                            <View style={{flexDirection: 'row', justifyContent: 'space-around', marginTop: 12}}>
                                 <View style={{alignItems: 'center'}}>
                                     <Activity size={20} color={COLORS.success} />
                                     <Text style={styles.statValue}>98%</Text>
                                     <Text style={styles.statLabel}>Trauma</Text>
                                 </View>
                                 <View style={{alignItems: 'center'}}>
                                     <Text style={{fontSize: 20}}>🩸</Text>
                                     <Text style={styles.statValue}>AB+</Text>
                                     <Text style={styles.statLabel}>Blood</Text>
                                 </View>
                            </View>
                        </GlassCard>

                        {/* Quick Actions */}
                        <Text style={styles.sectionHeader}>Actions</Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity 
                                style={[styles.actionBtn, {backgroundColor: COLORS.primary}]}
                                onPress={() => {
                                    onClose();
                                    // @ts-ignore
                                    navigation.navigate('Vitals', {
                                        admissionId: bed.admission_id,
                                        patientName: bed.patient_name,
                                        bedNumber: bed.bed_number
                                    });
                                }}
                            >
                                <Activity size={18} color="#fff" />
                                <Text style={styles.actionBtnText}>Log Vitals</Text>
                            </TouchableOpacity>
                             <TouchableOpacity style={[styles.actionBtn, {backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border}]}>
                                <MoreHorizontal size={18} color={COLORS.text} />
                                <Text style={[styles.actionBtnText, {color: COLORS.text}]}>More</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                ) : (
                    <GlassCard>
                        <Text style={{ color: COLORS.textSecondary, textAlign: 'center', marginVertical: 20 }}>
                            Bed is currently empty and ready for allocation.
                        </Text>
                         <TouchableOpacity style={[styles.actionBtn, {backgroundColor: COLORS.success, alignSelf: 'center', width: '100%'}]}>
                            <CheckCircle2 size={18} color="#fff" />
                            <Text style={styles.actionBtnText}>Mark for Cleaning</Text>
                        </TouchableOpacity>
                    </GlassCard>
                )}

            </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '60%',
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.text,
  },
  closeBtn: {
    padding: 4,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: '#fff',
  },
  name: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.text,
  },
  subText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  sectionHeader: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.text,
    marginTop: SPACING.m,
    marginBottom: 12,
  },
  statValue: {
      fontFamily: FONTS.bold,
      color: COLORS.text,
      marginTop: 4
  },
  statLabel: {
      fontSize: 10,
      color: COLORS.textSecondary
  },
  divider: {
      height: 1,
      backgroundColor: COLORS.border,
      marginVertical: 12
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    ...SHADOWS.glow,
    gap: 8
  },
  actionBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#fff',
  },
});
