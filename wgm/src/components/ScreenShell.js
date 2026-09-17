import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import TacticalIcon from './TacticalIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS } from '../theme';

const TAB_ROUTE_NAMES = ['Command', 'DispatchList', 'Scan', 'Comms', 'Report', 'ProfileTab'];

/**
 * ScreenShell — Universal Screen Layout for Wolf Guard Mobile
 * 
 * @param {string} title - Primary header title
 * @param {string} [subtitle] - Optional subtitle under the header title
 * @param {string} [badgeText] - Optional badge chip text (e.g. 'GATE', 'PATROL')
 * @param {string} [badgeColor] - Color for badge background (defaults to COLORS.accentOrange)
 * @param {React.ReactNode} [badge] - Optional custom badge component
 * @param {React.ReactNode} [rightAction] - Optional right header action element
 * @param {boolean} [showBack] - Explicitly show or hide the back button
 * @param {() => void} [onBack] - Custom back handler (defaults to navigation.goBack)
 * @param {boolean} [scrollable=true] - Wrap content in ScrollView
 * @param {'default' | 'overlay'} [variant='default'] - Header variant ('overlay' for camera scrim)
 * @param {object} [contentContainerStyle] - Extra styling for content wrapper
 * @param {React.ReactNode} [refreshControl] - RefreshControl element for ScrollView
 * @param {React.ReactNode} children - Screen body content
 */
export default function ScreenShell({
    title,
    subtitle,
    badgeText,
    badgeColor = COLORS.accentOrange,
    badge,
    rightAction,
    showBack,
    onBack,
    scrollable = true,
    variant = 'default',
    contentContainerStyle,
    refreshControl,
    style,
    children,
}) {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    let route;
    try {
        route = useRoute();
    } catch (e) {
        route = null;
    }

    const isTab = route?.name ? TAB_ROUTE_NAMES.includes(route.name) : false;
    const shouldShowBack = showBack !== undefined 
        ? showBack 
        : (!isTab && navigation?.canGoBack?.());

    const isOverlay = variant === 'overlay';

    return (
        <View style={[styles.container, style]}>
            {/* Standard or Overlay Header */}
            <View 
                style={[
                    styles.header,
                    isOverlay ? styles.headerOverlay : styles.headerDefault,
                    { paddingTop: insets.top + (isOverlay ? 6 : 10) }
                ]}
            >
                <View style={styles.headerRow}>
                    {/* Left Slot: Back Button or Spacer */}
                    <View style={styles.leftSlot}>
                        {shouldShowBack ? (
                            <TouchableOpacity 
                                onPress={onBack || (() => navigation?.goBack?.())} 
                                style={[styles.backButton, isOverlay && styles.backButtonOverlay]}
                                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                activeOpacity={0.7}
                            >
                                <TacticalIcon 
                                    name="arrow-left" 
                                    size={22} 
                                    color={isOverlay ? COLORS.textPrimary : COLORS.accent} 
                                />
                            </TouchableOpacity>
                        ) : null}
                    </View>

                    {/* Center Slot: Title & Badges */}
                    <View style={styles.centerSlot}>
                        <View style={styles.titleRow}>
                            {title ? (
                                <Text 
                                    numberOfLines={1} 
                                    style={[styles.headerTitle, isOverlay && styles.headerTitleOverlay]}
                                >
                                    {title}
                                </Text>
                            ) : null}
                            {badgeText ? (
                                <View style={[styles.badgeChip, { backgroundColor: badgeColor }]}>
                                    <Text style={styles.badgeChipText}>{badgeText}</Text>
                                </View>
                            ) : badge || null}
                        </View>
                        {subtitle ? (
                            <Text numberOfLines={1} style={styles.headerSubtitle}>
                                {subtitle}
                            </Text>
                        ) : null}
                    </View>

                    {/* Right Slot: Action or Spacer */}
                    <View style={styles.rightSlot}>
                        {rightAction ? rightAction : (
                            shouldShowBack ? <View style={styles.backButtonSpacer} /> : null
                        )}
                    </View>
                </View>
            </View>

            {/* Content Area */}
            {scrollable ? (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { 
                            paddingBottom: isTab 
                                ? 85 + insets.bottom + 16 
                                : insets.bottom + 24 
                        },
                        isOverlay && { paddingTop: insets.top + 60 },
                        contentContainerStyle
                    ]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={refreshControl}
                    keyboardShouldPersistTaps="handled"
                >
                    {children}
                </ScrollView>
            ) : (
                <View 
                    style={[
                        styles.staticContent, 
                        { 
                            paddingBottom: isTab 
                                ? 85 + insets.bottom + 16 
                                : insets.bottom + 16 
                        },
                        isOverlay && { paddingTop: insets.top + 60 },
                        contentContainerStyle
                    ]}
                >
                    {children}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    headerDefault: {
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'transparent',
        zIndex: 20,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 40,
    },
    leftSlot: {
        width: 44,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    centerSlot: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    rightSlot: {
        minWidth: 44,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    backButton: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonOverlay: {
        backgroundColor: COLORS.scrim,
        borderColor: COLORS.glassOverlayWeak,
    },
    backButtonSpacer: {
        width: 38,
        height: 38,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        color: COLORS.textPrimary,
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.3,
    },
    headerTitleOverlay: {
        textShadowColor: COLORS.onAccent,
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    headerSubtitle: {
        color: COLORS.textMuted,
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    badgeChip: {
        marginLeft: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeChipText: {
        color: COLORS.textPrimary,
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    staticContent: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
});
