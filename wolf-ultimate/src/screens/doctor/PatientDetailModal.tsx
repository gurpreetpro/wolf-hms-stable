import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { X, User, Activity, Clock, Calendar, FileText, ChevronRight } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, SHADOWS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { OPDQueueItem } from '../../services/doctorService';

interface Props {
  visible: boolean;
  onClose: () => void;
  patient: OPDQueueItem | null;
}

export const PatientDetailModal = ({ visible, onClose, patient }: Props) => {
  const navigation = useNavigation<any>();
  if (!patient) return null;

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
                <Text style={styles.title}>Patient Details</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <X size={24} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: SPACING.m }}>
                {/* ID Card */}
                <GlassCard style={{ marginBottom: SPACING.m }} intensity={20}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                         <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{patient.patient_name.charAt(0)}</Text>
                         </View>
                         <View style={{ marginLeft: 16 }}>
                             <Text style={styles.name}>{patient.patient_name}</Text>
                             <Text style={styles.subText}>UHID: {patient.uhid}</Text>
                             <Text style={styles.subText}>{patient.gender}, Age: 30</Text> 
                         </View>
                    </View>
                </GlassCard>

                {/* Queue Info */}
                <View style={styles.row}>
                    <GlassCard style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.label}>Token</Text>
                        <Text style={styles.value}>#{patient.token_number}</Text>
                    </GlassCard>
                    <GlassCard style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.label}>Status</Text>
                        <Text style={[styles.value, { color: COLORS.primary }]}>{patient.status}</Text>
                    </GlassCard>
                </View>

                {/* Medical Info */}
                <Text style={styles.sectionHeader}>Medical Info</Text>
                <GlassCard style={{ marginBottom: SPACING.m }}>
                    <View style={styles.infoRow}>
                        <Activity size={20} color={COLORS.textSecondary} />
                        <Text style={styles.infoText}>Vital Signs Stable</Text>
                    </View>
                    <View style={[styles.infoRow, { marginTop: 12 }]}>
                        <FileText size={20} color={COLORS.textSecondary} />
                        <Text style={styles.infoText}>Reason: Fever & Body Pain</Text>
                    </View>
                </GlassCard>

                {/* Action Button */}
                <TouchableOpacity 
                    style={styles.actionBtn} 
                    activeOpacity={0.8}
                    onPress={() => {
                        onClose();
                        // @ts-ignore - Easy way for now, strict type would need useNavigation hook typing
                        navigation.navigate('ClinicalNotes', { 
                            patientId: patient.id,
                            patientName: patient.patient_name,
                            visitId: patient.id // ID is the visit_id based on service definition
                        });
                    }}
                >
                    <Text style={styles.actionBtnText}>Start Consultation</Text>
                    <ChevronRight size={20} color="#fff" />
                </TouchableOpacity>

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
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
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
  row: {
    flexDirection: 'row',
    marginBottom: SPACING.m,
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  value: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
    marginTop: 4,
  },
  sectionHeader: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 12,
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: SPACING.m,
    ...SHADOWS.glow,
  },
  actionBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#fff',
    marginRight: 8,
  },
});
