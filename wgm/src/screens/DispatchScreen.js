
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Appbar, Card, Chip, ActivityIndicator, Button } from 'react-native-paper';
import securityService from '../services/securityService';

export default function DispatchScreen({ navigation }) {
    const [missions, setMissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchMissions = useCallback(async () => {
        try {
            const res = await securityService.getMissions();
            if (res.data.success) {
                setMissions(res.data.data);
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
            case 'CRITICAL': return '#ff003c';
            case 'HIGH': return '#ff6600';
            default: return '#00f3ff';
        }
    };

    const renderItem = ({ item }) => (
        <Card style={styles.card}>
            <Card.Content>
                <View style={styles.cardHeader}>
                     <Chip 
                        style={{backgroundColor: getPriorityColor(item.priority) + '33'}} 
                        textStyle={{color: getPriorityColor(item.priority)}}
                     >
                        {item.priority || 'NORMAL'}
                     </Chip>
                     <Text style={styles.time}>{new Date(item.created_at).toLocaleTimeString()}</Text>
                </View>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.desc}>{item.description}</Text>
                <View style={styles.footer}>
                     <Text style={styles.meta}>📍 {item.location_name || 'General'}</Text>
                     <Text style={styles.meta}>👤 {item.assigned_guard_name || 'All Units'}</Text>
                </View>
            </Card.Content>
        </Card>
    );

    return (
        <View style={styles.container}>
            <Appbar.Header style={{ backgroundColor: '#050a14' }}>
                <Appbar.BackAction onPress={() => navigation.goBack()} color="#00f3ff" />
                <Appbar.Content 
                    title={<Text style={{color: '#00f3ff', fontWeight: 'bold'}}>DISPATCH LOG</Text>} 
                />
            </Appbar.Header>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator color="#00f3ff" size="large" />
                </View>
            ) : (
                <FlatList
                    data={missions}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={{padding: 20}}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00f3ff" />
                    }
                    ListEmptyComponent={
                        <View style={styles.centered}>
                            <Text style={{color: '#666'}}>No active dispatches.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050a14',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        backgroundColor: '#0a1220',
        borderColor: '#333',
        borderWidth: 1,
        marginBottom: 15,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    time: {
        color: '#666',
        fontSize: 12,
    },
    title: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    desc: {
        color: '#aaa',
        marginBottom: 10,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#333',
        paddingTop: 10,
    },
    meta: {
        color: '#666',
        fontSize: 12,
    }
});
