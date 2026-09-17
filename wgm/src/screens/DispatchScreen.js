import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Chip, ActivityIndicator } from 'react-native-paper';
import ScreenShell from '../components/ScreenShell';
import securityService from '../services/securityService';
import { COLORS } from '../theme';

export default function DispatchScreen({ navigation }) {
    const [missions, setMissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchMissions = useCallback(async () => {
        try {
            const res = await securityService.getMissions();
            if (res.data?.success) {
                setMissions(res.data.data || []);
            }
        } catch (e) {
            console.error('Failed to fetch missions');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchMissions();
    }, [fetchMissions]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchMissions();
    };

    const getPriorityColor = (p) => {
        switch(p?.toUpperCase()) {
            case 'CRITICAL': return COLORS.severityCritical;
            case 'HIGH': return COLORS.severityHigh;
            default: return COLORS.accent;
        }
    };

    const getPriorityGlass = (p) => {
        switch(p?.toUpperCase()) {
            case 'CRITICAL': return COLORS.severityCriticalGlass;
            case 'HIGH': return COLORS.severityHighGlass;
            default: return COLORS.accentGlass;
        }
    };

    const renderItem = ({ item }) => (
        <Card style={styles.card}>
            <Card.Content>
                <View style={styles.cardHeader}>
                     <Chip 
                        style={{ backgroundColor: getPriorityGlass(item.priority) }}
                        textStyle={{ color: getPriorityColor(item.priority), fontWeight: 'bold' }}
                     >
                        {item.priority || 'NORMAL'}
                     </Chip>
                     <Text style={styles.time}>{new Date(item.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.desc}>{item.description}</Text>
                <View style={styles.footer}>
                     <Text style={styles.meta}>📍 {item.location_name || 'General Area'}</Text>
                     <Text style={styles.meta}>👤 {item.assigned_guard_name || 'All Units'}</Text>
                </View>
            </Card.Content>
        </Card>
    );

    return (
        <ScreenShell
            title="Dispatch Log"
            scrollable={false}
            contentContainerStyle={{ paddingHorizontal: 0, paddingTop: 8 }}
        >
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator color={COLORS.accent} size="large" />
                </View>
            ) : (
                <FlatList
                    data={missions}
                    renderItem={renderItem}
                    keyExtractor={item => item.id?.toString() || String(Math.random())}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
                    }
                    ListEmptyComponent={
                        <View style={styles.centered}>
                            <Text style={{ color: COLORS.textMuted }}>No active dispatches found.</Text>
                        </View>
                    }
                />
            )}
        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    card: {
        backgroundColor: COLORS.card,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: 16,
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    time: {
        color: COLORS.textMuted,
        fontSize: 12,
        fontWeight: '500',
    },
    title: {
        color: COLORS.textPrimary,
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    desc: {
        color: COLORS.textMuted,
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 10,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 8,
        marginTop: 4,
    },
    meta: {
        color: COLORS.textMuted,
        fontSize: 12,
    },
});
