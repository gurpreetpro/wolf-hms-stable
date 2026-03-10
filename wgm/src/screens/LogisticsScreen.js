import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Avatar, Button, Modal, Portal, Provider, TextInput, RadioButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../services/api';

export default function LogisticsScreen({ navigation }) {
    const [viewMode, setViewMode] = useState('MENU'); // MENU, KEYS, PACKAGES, LOSTFOUND
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
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const fetchPackages = async () => {
        setLoading(true);
        try {
            const res = await api.get('/logistics/packages');
            setPackages(res.data.data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
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
        } finally { setLoading(false); }
    };

    const submitPackage = async () => {
        setLoading(true);
        try {
            await api.post('/logistics/packages', {
                recipient_name: pkgForm.recipient,
                courier_name: pkgForm.courier,
                tracking_no: pkgForm.track
            });
            setPkgForm({ recipient: '', courier: '', track: '' });
            fetchPackages(); // refresh list
            alert("Package Logged");
        } catch (e) { alert("Failed"); } finally { setLoading(false); }
    };

    // --- Renderers ---

    const renderMenu = () => (
        <View style={styles.grid}>
            <TouchableOpacity style={[styles.gridItem, {backgroundColor: '#FF9500'}]} onPress={() => { setViewMode('KEYS'); fetchKeys(); }}>
                <MaterialCommunityIcons name="key-chain" size={40} color="white" />
                <Text style={styles.gridLabel}>Key Management</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.gridItem, {backgroundColor: '#32ADE6'}]} onPress={() => { setViewMode('PACKAGES'); fetchPackages(); }}>
                <MaterialCommunityIcons name="package-variant" size={40} color="white" />
                <Text style={styles.gridLabel}>Courier / Packages</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.gridItem, {backgroundColor: '#AF52DE'}]} onPress={() => { setViewMode('LOSTFOUND'); }}>
                <MaterialCommunityIcons name="bag-suitcase" size={40} color="white" />
                <Text style={styles.gridLabel}>Lost & Found</Text>
            </TouchableOpacity>
        </View>
    );

    const renderKeys = () => (
        <View>
            <Button icon="refresh" mode="text" onPress={fetchKeys}>Refresh Inventory</Button>
            {keys.map(k => (
                <Card key={k.id} style={styles.card} onPress={() => { setSelectedKey(k); setShowKeyModal(true); }}>
                    <Card.Title
                        title={k.key_name}
                        subtitle={k.status === 'AVAILABLE' ? 'In Cabinet' : `With: ${k.current_holder}`}
                        left={(props) => <Avatar.Icon {...props} icon="key" style={{backgroundColor: k.status === 'AVAILABLE' ? '#4CD964' : '#FF3B30'}} />}
                    />
                </Card>
            ))}
        </View>
    );

    const renderPackages = () => (
        <View>
            <Card style={styles.card}>
                <Card.Content>
                    <Text style={{color:'white', marginBottom: 10, fontWeight: 'bold'}}>LOG INCOMING PACKAGE</Text>
                    <TextInput label="Recipient Name (e.g. 302 Mr. Smith)" value={pkgForm.recipient} onChangeText={t => setPkgForm({...pkgForm, recipient: t})} style={styles.input} />
                    <TextInput label="Courier (e.g. Amazon)" value={pkgForm.courier} onChangeText={t => setPkgForm({...pkgForm, courier: t})} style={styles.input} />
                    <Button mode="contained" onPress={submitPackage} loading={loading} style={{marginTop: 10}}>LOG ARRIVAL</Button>
                </Card.Content>
            </Card>
            
            <Text style={{color:'gray', margin: 10}}>RECENT ARRIVALS</Text>
            {packages.map(p => (
                <View key={p.id} style={styles.pkgItem}>
                    <View>
                        <Text style={{color:'white', fontWeight:'bold'}}>{p.recipient_name}</Text>
                        <Text style={{color:'#aaa', fontSize: 12}}>{p.courier_name} • {new Date(p.created_at).toLocaleTimeString()}</Text>
                    </View>
                    <MaterialCommunityIcons name="check-circle" color="#4CD964" size={20} />
                </View>
            ))}
        </View>
    );

    return (
        <Provider>
            <View style={styles.container}>
                <View style={styles.header}>
                    {viewMode === 'MENU' ? (
                         <TouchableOpacity onPress={() => navigation.goBack()}>
                            <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={() => setViewMode('MENU')}>
                            <MaterialCommunityIcons name="menu" size={28} color="white" />
                        </TouchableOpacity>
                    )}
                    <Text style={styles.headerTitle}>
                        {viewMode === 'MENU' ? 'Site Logistics' : viewMode}
                    </Text>
                    <View style={{width: 28}} />
                </View>

                <ScrollView style={styles.content}>
                    {viewMode === 'MENU' && renderMenu()}
                    {viewMode === 'KEYS' && renderKeys()}
                    {viewMode === 'PACKAGES' && renderPackages()}
                    {viewMode === 'LOSTFOUND' && <Text style={{color:'white', textAlign:'center', marginTop: 50}}>Feature Coming in v2.1</Text>}
                </ScrollView>

                {/* Key Modal */}
                <Portal>
                    <Modal visible={showKeyModal} onDismiss={() => setShowKeyModal(false)} contentContainerStyle={styles.modal}>
                        <Text style={styles.modalTitle}>{selectedKey?.key_name}</Text>
                        <Text style={{color:'#aaa', textAlign:'center', marginBottom: 20}}>
                            Currently: {selectedKey?.status}
                        </Text>
                        
                        {selectedKey?.status === 'AVAILABLE' ? (
                            <>
                                <TextInput label="Checkout To (Name)" value={holderName} onChangeText={setHolderName} />
                                <Button mode="contained" onPress={handleKeyAction} style={styles.modalBtn}>CHECK OUT</Button>
                            </>
                        ) : (
                            <Button mode="contained" onPress={handleKeyAction} style={styles.modalBtn} buttonColor="#4CD964">MARK RETURNED</Button>
                        )}
                        <Button onPress={() => setShowKeyModal(false)} style={{marginTop: 10}}>Cancel</Button>
                    </Modal>
                </Portal>
            </View>
        </Provider>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#1c1c1e' },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    content: { padding: 20 },
    
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    gridItem: { width: '48%', aspectRatio: 1, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    gridLabel: { color: 'white', marginTop: 10, fontWeight: 'bold', textAlign: 'center' },

    card: { backgroundColor: '#111', marginBottom: 10, borderColor:'#333', borderWidth: 1 },
    input: { marginBottom: 10, backgroundColor: '#222' },
    
    pkgItem: { flexDirection: 'row', justifyContent:'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#222' },

    modal: { backgroundColor: '#222', padding: 20, margin: 20, borderRadius: 10 },
    modalTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
    modalBtn: { marginTop: 20 }
});
