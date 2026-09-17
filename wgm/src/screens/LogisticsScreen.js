import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Card, Avatar, Button, Modal, Portal, Provider, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenShell from '../components/ScreenShell';
import api from '../services/api';
import { COLORS } from '../theme';

export default function LogisticsScreen({ navigation }) {
    const [viewMode, setViewMode] = useState('MENU'); // MENU, KEYS, PACKAGES
    const [loading, setLoading] = useState(false);
    
    // Key Data
    const [keys, setKeys] = useState([]);
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [selectedKey, setSelectedKey] = useState(null);
    const [holderName, setHolderName] = useState('');

    // Package Data
    const [packages, setPackages] = useState([]);
    const [pkgForm, setPkgForm] = useState({ recipient: '', courier: '', track: '' });

    const fetchKeys = async () => {
        setLoading(true);
        try {
            const res = await api.get('/logistics/keys');
            setKeys(res.data.data);
        } catch (e) { 
            console.error(e); 
        } finally { 
            setLoading(false); 
        }
    };

    const fetchPackages = async () => {
        setLoading(true);
        try {
            const res = await api.get('/logistics/packages');
            setPackages(res.data.data);
        } catch (e) { 
            console.error(e); 
        } finally { 
            setLoading(false); 
        }
    };

    const handleKeyAction = async () => {
        if (!selectedKey) return;
        setLoading(true);
        try {
            if (selectedKey.status === 'AVAILABLE') {
                await api.post('/logistics/keys/checkout', { key_id: selectedKey.id, holder_name: holderName });
            } else {
                await api.post('/logistics/keys/return', { key_id: selectedKey.id });
            }
            setShowKeyModal(false);
            fetchKeys();
        } catch (e) {
            console.error('Key Action Failed');
        } finally { 
            setLoading(false); 
        }
    };

    const submitPackage = async () => {
        setLoading(true);
        try {
            await api.post('/logistics/packages', {
                recipient_name: pkgForm.recipient,
                courier_name: pkgForm.courier,
                tracking_number: pkgForm.track
            });
            setPkgForm({ recipient: '', courier: '', track: '' });
            fetchPackages();
        } catch (e) { 
            console.error(e); 
        } finally { 
            setLoading(false); 
        }
    };

    const renderMenu = () => (
        <View style={styles.grid}>
            <TouchableOpacity 
                style={[styles.gridItem, { backgroundColor: COLORS.accentOrange }]} 
                onPress={() => { setViewMode('KEYS'); fetchKeys(); }}
                activeOpacity={0.8}
            >
                <MaterialCommunityIcons name="key-variant" size={40} color={COLORS.textPrimary} />
                <Text style={styles.gridLabel}>Key Vault</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={[styles.gridItem, { backgroundColor: COLORS.accentBlue }]} 
                onPress={() => { setViewMode('PACKAGES'); fetchPackages(); }}
                activeOpacity={0.8}
            >
                <MaterialCommunityIcons name="truck-delivery" size={40} color={COLORS.textPrimary} />
                <Text style={styles.gridLabel}>Courier / Packages</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.gridItem, { backgroundColor: COLORS.accentPurple }, styles.gridItemDisabled]} 
                disabled={true} 
                onPress={() => {}}
            >
                <MaterialCommunityIcons name="bag-suitcase" size={40} color={COLORS.textPrimary} style={styles.dimmedIcon} />
                <Text style={styles.gridLabel}>Lost & Found</Text>
                <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>COMING SOON</Text>
                </View>
            </TouchableOpacity>
        </View>
    );

    const renderKeys = () => (
        <View>
            <Button icon="refresh" mode="text" onPress={fetchKeys} textColor={COLORS.accent}>
                Refresh Inventory
            </Button>
            {keys.map(k => (
                <Card 
                    key={k.id} 
                    style={styles.card} 
                    onPress={() => { setSelectedKey(k); setShowKeyModal(true); }}
                >
                    <Card.Title
                        title={k.key_name}
                        titleStyle={{ color: COLORS.textPrimary, fontWeight: 'bold' }}
                        subtitle={k.status === 'AVAILABLE' ? 'In Cabinet' : `With: ${k.current_holder}`}
                        subtitleStyle={{ color: COLORS.textMuted }}
                        left={(props) => (
                            <Avatar.Icon 
                                {...props} 
                                icon="key" 
                                style={{ backgroundColor: k.status === 'AVAILABLE' ? COLORS.statusGreen : COLORS.statusRed }} 
                                color={COLORS.textPrimary}
                            />
                        )}
                    />
                </Card>
            ))}
        </View>
    );

    const renderPackages = () => (
        <View>
            <Card style={styles.card}>
                <Card.Content>
                    <Text style={{ color: COLORS.textPrimary, marginBottom: 10, fontWeight: 'bold' }}>
                        LOG INCOMING PACKAGE
                    </Text>
                    <TextInput 
                        label="Recipient Name (e.g. 302 Mr. Smith)" 
                        value={pkgForm.recipient} 
                        onChangeText={t => setPkgForm({...pkgForm, recipient: t})} 
                        style={styles.input} 
                        mode="outlined"
                        textColor={COLORS.textPrimary}
                    />
                    <TextInput 
                        label="Courier (e.g. Amazon / BlueDart)" 
                        value={pkgForm.courier} 
                        onChangeText={t => setPkgForm({...pkgForm, courier: t})} 
                        style={styles.input} 
                        mode="outlined"
                        textColor={COLORS.textPrimary}
                    />
                    <Button 
                        mode="contained" 
                        onPress={submitPackage} 
                        loading={loading} 
                        style={{ marginTop: 10, backgroundColor: COLORS.accentBlue }}
                    >
                        LOG ARRIVAL
                    </Button>
                </Card.Content>
            </Card>
            
            <Text style={{ color: COLORS.textMuted, marginVertical: 12, fontWeight: 'bold', letterSpacing: 0.5 }}>
                RECENT ARRIVALS
            </Text>
            {packages.map(p => (
                <View key={p.id} style={styles.pkgItem}>
                    <View>
                        <Text style={{ color: COLORS.textPrimary, fontWeight: 'bold' }}>{p.recipient_name}</Text>
                        <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
                            {p.courier_name} • {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                    <MaterialCommunityIcons name="check-circle" color={COLORS.statusGreen} size={22} />
                </View>
            ))}
        </View>
    );

    return (
        <Provider>
            <ScreenShell
                title={viewMode === 'MENU' ? 'Logistics & Access' : viewMode === 'KEYS' ? 'Key Vault' : 'Package Log'}
                badgeText="GATE"
                badgeColor={COLORS.accentOrange}
                showBack={true}
                onBack={viewMode === 'MENU' ? () => navigation.goBack() : () => setViewMode('MENU')}
            >
                {viewMode === 'MENU' && renderMenu()}
                {viewMode === 'KEYS' && renderKeys()}
                {viewMode === 'PACKAGES' && renderPackages()}

                {/* Key Checkout Modal */}
                <Portal>
                    <Modal 
                        visible={showKeyModal} 
                        onDismiss={() => setShowKeyModal(false)} 
                        contentContainerStyle={styles.modal}
                    >
                        <Text style={styles.modalTitle}>{selectedKey?.key_name}</Text>
                        <Text style={{ color: COLORS.textMuted, marginBottom: 15, textAlign: 'center' }}>
                            Status: {selectedKey?.status}
                        </Text>
                        
                        {selectedKey?.status === 'AVAILABLE' ? (
                            <View>
                                <TextInput 
                                    label="Guard / Holder Name" 
                                    value={holderName} 
                                    onChangeText={setHolderName}
                                    style={{ marginBottom: 15, backgroundColor: COLORS.surface }}
                                    mode="outlined"
                                    textColor={COLORS.textPrimary}
                                />
                                <Button 
                                    mode="contained" 
                                    onPress={handleKeyAction} 
                                    loading={loading}
                                    style={{ backgroundColor: COLORS.accentOrange }}
                                >
                                    CHECKOUT KEY
                                </Button>
                            </View>
                        ) : (
                            <Button 
                                mode="contained" 
                                onPress={handleKeyAction} 
                                loading={loading}
                                style={{ backgroundColor: COLORS.statusGreen }}
                            >
                                RETURN KEY TO CABINET
                            </Button>
                        )}
                        <Button onPress={() => setShowKeyModal(false)} style={{ marginTop: 10 }}>
                            Cancel
                        </Button>
                    </Modal>
                </Portal>
            </ScreenShell>
        </Provider>
    );
}

const styles = StyleSheet.create({
    grid: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        gap: 16, 
        justifyContent: 'space-between',
        paddingTop: 8,
    },
    gridItem: { 
        width: '47%', 
        height: 120, 
        borderRadius: 18, 
        justifyContent: 'center', 
        alignItems: 'center',
        elevation: 3,
    },
    gridItemDisabled: { 
        opacity: 0.5 
    },
    dimmedIcon: { 
        opacity: 0.7 
    },
    gridLabel: { 
        color: COLORS.textPrimary, 
        fontWeight: 'bold', 
        marginTop: 10, 
        fontSize: 14 
    },
    comingSoonBadge: { 
        position: 'absolute', 
        top: 8, 
        right: 8, 
        backgroundColor: COLORS.surfaceElevated, 
        paddingHorizontal: 6, 
        paddingVertical: 2, 
        borderRadius: 4 
    },
    comingSoonText: { 
        color: COLORS.accentOrange, 
        fontSize: 9, 
        fontWeight: 'bold' 
    },
    card: { 
        marginBottom: 12, 
        backgroundColor: COLORS.surface, 
        borderColor: COLORS.border, 
        borderWidth: 1,
        borderRadius: 16,
    },
    input: { 
        marginBottom: 12, 
        backgroundColor: COLORS.surface 
    },
    pkgItem: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        backgroundColor: COLORS.surface, 
        padding: 14, 
        borderRadius: 12, 
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    modal: { 
        backgroundColor: COLORS.surface, 
        padding: 20, 
        margin: 20, 
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    modalTitle: { 
        color: COLORS.textPrimary, 
        fontSize: 20, 
        fontWeight: 'bold', 
        textAlign: 'center' 
    }
});
