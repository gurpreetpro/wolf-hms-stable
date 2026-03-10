import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Upload, Image, FileText, Camera, Film, Download, Trash2, Eye } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';

interface FileItem { id: string; name: string; type: 'image' | 'pdf' | 'video' | 'report'; size: string; uploaded_by: string; uploaded_date: string; patient_name: string; category: string; }

export const FileUploadScreen = () => {
    const { COLORS } = useTheme();
    const [selectedCategory, setSelectedCategory] = useState('All');
    const styles = getStyles(COLORS);

    const categories = ['All', 'Lab Reports', 'Imaging', 'Consent', 'Discharge', 'Photos', 'Other'];

    const files: FileItem[] = [
        { id: '1', name: 'CBC_Report_02Mar.pdf', type: 'pdf', size: '245 KB', uploaded_by: 'Nurse Priya', uploaded_date: '2026-03-02', patient_name: 'Meena Gupta', category: 'Lab Reports' },
        { id: '2', name: 'Chest_Xray_PA.jpg', type: 'image', size: '1.2 MB', uploaded_by: 'Radiology', uploaded_date: '2026-03-01', patient_name: 'Rajesh Kumar', category: 'Imaging' },
        { id: '3', name: 'Consent_Surgery.pdf', type: 'pdf', size: '180 KB', uploaded_by: 'Nurse Kavita', uploaded_date: '2026-03-01', patient_name: 'Amit Patel', category: 'Consent' },
        { id: '4', name: 'Wound_Progress.jpg', type: 'image', size: '890 KB', uploaded_by: 'Nurse Priya', uploaded_date: '2026-03-02', patient_name: 'Ravi Verma', category: 'Photos' },
        { id: '5', name: 'CT_Brain.pdf', type: 'pdf', size: '3.4 MB', uploaded_by: 'Radiology', uploaded_date: '2026-03-02', patient_name: 'Sunita Devi', category: 'Imaging' },
    ];

    const filtered = selectedCategory === 'All' ? files : files.filter(f => f.category === selectedCategory);

    const getTypeIcon = (t: string) => {
        switch (t) { case 'image': return Image; case 'pdf': return FileText; case 'video': return Film; default: return FileText; }
    };
    const getTypeColor = (t: string) => {
        switch (t) { case 'image': return '#10b981'; case 'pdf': return '#ef4444'; case 'video': return '#8b5cf6'; default: return COLORS.textMuted; }
    };

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <Upload size={24} color={COLORS.primary} />
                    <Text style={styles.title}>File Manager</Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
                    {categories.map(c => (
                        <TouchableOpacity key={c} style={[styles.catChip, selectedCategory === c && styles.catActive]} onPress={() => setSelectedCategory(c)}>
                            <Text style={[styles.catText, selectedCategory === c && styles.catTextActive]}>{c}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.uploadRow}>
                    <TouchableOpacity style={styles.uploadBtn} onPress={() => Alert.alert('Camera', 'Open camera to capture')}>
                        <Camera size={20} color={COLORS.primary} />
                        <Text style={styles.uploadBtnText}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.uploadBtn} onPress={() => Alert.alert('Upload', 'Select file from device')}>
                        <Upload size={20} color={COLORS.success} />
                        <Text style={styles.uploadBtnText}>Upload File</Text>
                    </TouchableOpacity>
                </View>

                {filtered.map(file => {
                    const Icon = getTypeIcon(file.type);
                    const color = getTypeColor(file.type);
                    return (
                        <GlassCard key={file.id} style={styles.fileCard}>
                            <View style={styles.fileRow}>
                                <View style={[styles.fileIcon, { backgroundColor: color + '15' }]}>
                                    <Icon size={20} color={color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.fileName}>{file.name}</Text>
                                    <Text style={styles.fileMeta}>{file.patient_name} · {file.size} · {file.uploaded_date}</Text>
                                    <Text style={styles.fileUploader}>By: {file.uploaded_by}</Text>
                                </View>
                                <View style={styles.fileActions}>
                                    <TouchableOpacity onPress={() => Alert.alert('View', file.name)}><Eye size={16} color={COLORS.info} /></TouchableOpacity>
                                    <TouchableOpacity onPress={() => Alert.alert('Download', file.name)}><Download size={16} color={COLORS.success} /></TouchableOpacity>
                                </View>
                            </View>
                        </GlassCard>
                    );
                })}
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.l, paddingTop: SPACING.m, gap: SPACING.s },
    title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.text },
    catRow: { paddingHorizontal: SPACING.m, paddingVertical: SPACING.m, gap: SPACING.s },
    catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface },
    catActive: { backgroundColor: COLORS.primary + '20' },
    catText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textMuted },
    catTextActive: { color: COLORS.primary },
    uploadRow: { flexDirection: 'row', paddingHorizontal: SPACING.m, gap: SPACING.m, marginBottom: SPACING.m },
    uploadBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed' },
    uploadBtnText: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.text },
    fileCard: { marginHorizontal: SPACING.m, marginBottom: SPACING.s },
    fileRow: { flexDirection: 'row', alignItems: 'center' },
    fileIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.m },
    fileName: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text },
    fileMeta: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
    fileUploader: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 1 },
    fileActions: { flexDirection: 'row', gap: SPACING.m },
});
