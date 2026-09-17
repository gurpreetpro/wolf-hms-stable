import React, { useContext } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import ScreenShell from '../components/ScreenShell';
import TacticalIcon from '../components/TacticalIcon';
import { COLORS } from '../theme';

export default function DutySelectionScreen({ navigation }) {
    const { setDutyMode, userData } = useContext(AuthContext);

    const handleSelect = (mode) => {
        setDutyMode(mode);
        // Reset navigation stack so Main is the root
        navigation.reset({
            index: 0,
            routes: [{ name: 'Main' }],
        });
    };

    const DutyCard = ({ stationCode, title, desc, mode, icon, borderColor, iconGradient, tags }) => (
        <TouchableOpacity 
            onPress={() => handleSelect(mode)} 
            style={styles.touchable}
            activeOpacity={0.85}
        >
            <View style={[styles.card, { borderColor }]}>
                {/* Station Code Badge */}
                <View style={styles.cardHeaderRow}>
                    <View style={[styles.codeBadge, { borderColor: `${borderColor}60` }]}>
                        <Text style={[styles.codeBadgeText, { color: borderColor }]}>{stationCode}</Text>
                    </View>
                    <View style={styles.onlinePill}>
                        <View style={[styles.onlineDot, { backgroundColor: COLORS.statusGreen }]} />
                        <Text style={styles.onlineText}>READY</Text>
                    </View>
                </View>

                {/* Main Card Content */}
                <View style={styles.cardBody}>
                    <LinearGradient 
                        colors={iconGradient} 
                        start={{ x: 0, y: 0 }} 
                        end={{ x: 1, y: 1 }} 
                        style={styles.iconBg}
                    >
                        <TacticalIcon name={icon} size={32} color={COLORS.textPrimary} />
                    </LinearGradient>

                    <View style={styles.textContainer}>
                        <Text style={styles.cardTitle}>{title}</Text>
                        <Text style={styles.cardDesc}>{desc}</Text>
                    </View>
                </View>

                {/* Capability Tags Row */}
                <View style={styles.tagRow}>
                    {tags.map((tag, idx) => (
                        <View key={idx} style={styles.capabilityTag}>
                            <Text style={styles.capabilityTagText}>{tag}</Text>
                        </View>
                    ))}
                </View>

                {/* Action Trigger Bar */}
                <View style={[styles.deployRow, { borderTopColor: `${borderColor}30` }]}>
                    <Text style={[styles.deployText, { color: borderColor }]}>DEPLOY TO STATION</Text>
                    <TacticalIcon name="chevron-right" size={18} color={borderColor} />
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <ScreenShell
            title="Station Deployment"
            subtitle="Campus Security Command Terminal"
            showBack={false}
        >
            {/* Officer Security Profile Bar */}
            <View style={styles.officerCard}>
                <View style={styles.officerAvatarWrap}>
                    <TacticalIcon name="shield-account" size={26} color={COLORS.accent} />
                </View>
                <View style={styles.officerInfoCol}>
                    <View style={styles.officerNameRow}>
                        <Text style={styles.officerName}>
                            Officer {userData?.username || 'Kumar'}
                        </Text>
                        <View style={styles.securityClearanceBadge}>
                            <Text style={styles.securityClearanceText}>TIER-2 HIGH-SEC</Text>
                        </View>
                    </View>
                    <Text style={styles.officerMeta}>
                        Badge ID: WG-0{userData?.id || '14'} • Active Shift Authorization
                    </Text>
                </View>
            </View>

            <Text style={styles.sectionHeader}>SELECT ACTIVE DUTY ASSIGNMENT</Text>

            <View style={styles.cardContainer}>
                {/* Option 1: Gate / Parking */}
                <DutyCard
                    stationCode="POST-01 // PERIMETER GATE"
                    title="GATE & VEHICLE ACCESS"
                    desc="Automated ANPR scan, barrier gate control, visitor parking billing & logistics freight check."
                    mode="GATE"
                    icon="boom-gate-up"
                    borderColor={COLORS.accentOrange}
                    iconGradient={[COLORS.accentOrange, COLORS.accentCoral]}
                    tags={['ANPR Plate Scan', 'Barrier Remote', 'Logistics Freight', 'Tariff Billing']}
                />

                {/* Option 2: Premises / Patrol */}
                <DutyCard
                    stationCode="POST-02 // PREMISES PATROL"
                    title="TACTICAL PREMISES PATROL"
                    desc="Real-time GPS guard tracking, NFC checkpoint verification, incident dispatch & SOS emergency beacon."
                    mode="PATROL"
                    icon="shield-account"
                    borderColor={COLORS.accent}
                    iconGradient={[COLORS.accent, COLORS.patrolBlueDark]}
                    tags={['Rounds Tracking', 'Checkpoint NFC', 'Incident Radar', 'Hold SOS']}
                />

                {/* Option 3: Reception / Lobby */}
                <DutyCard
                    stationCode="POST-03 // MAIN LOBBY"
                    title="EXECUTIVE RECEPTION"
                    desc="Guest badge issuance, QR invite verification, VIP host alerts & visitor check-in registry."
                    mode="RECEPTION"
                    icon="desk"
                    borderColor={COLORS.accentPurple}
                    iconGradient={[COLORS.accentPurple, COLORS.accentIndigo]}
                    tags={['Guest Badges', 'QR Pass Verification', 'Host Alerts', 'Logbook']}
                />
            </View>
        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    officerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 14,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.borderHighlight,
    },
    officerAvatarWrap: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: COLORS.card,
        borderWidth: 1.5,
        borderColor: COLORS.accent,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    officerInfoCol: {
        flex: 1,
    },
    officerNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    officerName: {
        color: COLORS.textPrimary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    securityClearanceBadge: {
        backgroundColor: COLORS.glassOverlayWeak,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: COLORS.borderHighlight,
    },
    securityClearanceText: {
        color: COLORS.accent,
        fontSize: 9,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    officerMeta: {
        color: COLORS.textMuted,
        fontSize: 12,
        marginTop: 2,
    },
    sectionHeader: {
        color: COLORS.textMuted,
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 1.2,
        marginBottom: 12,
    },
    cardContainer: { 
        gap: 16,
        paddingBottom: 20,
    },
    touchable: { 
        width: '100%',
    },
    card: { 
        backgroundColor: COLORS.card,
        borderRadius: 20, 
        borderWidth: 1.5, 
        padding: 16,
        elevation: 4,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    codeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        backgroundColor: COLORS.surface,
    },
    codeBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.8,
    },
    onlinePill: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    onlineDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 5,
    },
    onlineText: {
        color: COLORS.statusGreen,
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    cardBody: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBg: { 
        width: 56, 
        height: 56, 
        borderRadius: 16, 
        justifyContent: 'center', 
        alignItems: 'center',
        marginRight: 14,
        elevation: 3,
    },
    textContainer: { 
        flex: 1, 
    },
    cardTitle: { 
        fontSize: 16, 
        fontWeight: 'bold', 
        color: COLORS.textPrimary,
        letterSpacing: 0.3,
    },
    cardDesc: { 
        fontSize: 12, 
        color: COLORS.textMuted, 
        marginTop: 4,
        lineHeight: 16,
    },
    tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 12,
    },
    capabilityTag: {
        backgroundColor: COLORS.surface,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    capabilityTagText: {
        color: COLORS.textMuted,
        fontSize: 10,
        fontWeight: '500',
    },
    deployRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 14,
        paddingTop: 10,
        borderTopWidth: 1,
    },
    deployText: {
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 0.8,
    },
});
