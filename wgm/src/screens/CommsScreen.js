import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Vibration, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, Surface, IconButton, ActivityIndicator } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import voiceService from '../services/voiceService';
import chatService from '../services/chatService';
import notifee, { AndroidImportance } from '@notifee/react-native';

export default function CommsScreen() {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isTalking, setIsTalking] = useState(false);
    const [voiceConnected, setVoiceConnected] = useState(false);
    const flatListRef = useRef(null);

    useEffect(() => {
        // 1. Connect Chat
        chatService.joinRoom('global');
        
        chatService.onHistory((history) => {
            setMessages(history);
            scrollToBottom();
        });

        chatService.onMessage((msg) => {
            setMessages(prev => [...prev, msg]);
            scrollToBottom();
        });

        // 2. Connect Voice (Stub for now, will auto-connect in real app or via toggle)
        // initVoice();
        
        return () => {
            voiceService.disconnect();
            stopForegroundService();
        };
    }, []);

    const initVoice = async () => {
        try {
            await startForegroundService();
            await voiceService.connect('global');
            setVoiceConnected(true);
        } catch (e) {
            console.error(e);
        }
    };

    const startForegroundService = async () => {
        // Required for Background Mic
        await notifee.displayNotification({
            id: 'wolf-comms',
            title: 'Wolf Comms Active',
            body: 'Maintained secure voice channel.',
            android: {
                channelId: 'default',
                asForegroundService: true,
                ongoing: true,
                importance: AndroidImportance.LOW,
            },
        });
    };

    const stopForegroundService = async () => {
        await notifee.stopForegroundService();
    };

    const handlePTTPressIn = async () => {
        Vibration.vibrate(50);
        setIsTalking(true);
        await voiceService.startTalking();
    };

    const handlePTTPressOut = async () => {
        setIsTalking(false);
        await voiceService.stopTalking();
        Vibration.vibrate(20);
    };

    const handleSend = () => {
        if (!inputText.trim()) return;
        chatService.sendMessage('global', inputText, 'Me'); // 'Me' placeholder
        setInputText('');
    };

    const scrollToBottom = () => {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    };

    const renderMessage = ({ item }) => (
        <View style={[
            styles.messageBubble, 
            item.sender_name === 'Me' ? styles.myMessage : styles.otherMessage
        ]}>
            <Text style={styles.senderName}>{item.sender_name}</Text>
            <Text style={styles.messageText}>{item.message_text}</Text>
            <Text style={styles.timestamp}>{new Date(item.created_at || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={StyleSheet.absoluteFill} />
            
            {/* Header */}
            <BlurView intensity={20} style={styles.header}>
                <Text style={styles.headerTitle}>WOLF COMMS: {voiceConnected ? 'ONLINE' : 'OFFLINE'}</Text>
                <IconButton 
                    icon={voiceConnected ? "microphone" : "microphone-off"} 
                    iconColor={voiceConnected ? "#00f3ff" : "gray"}
                    onPress={voiceConnected ? () => voiceService.disconnect() && setVoiceConnected(false) : initVoice}
                />
            </BlurView>

            {/* PTT Button Area */}
            <View style={styles.pttContainer}>
                <TouchableOpacity
                    onPressIn={handlePTTPressIn}
                    onPressOut={handlePTTPressOut}
                    disabled={!voiceConnected}
                    style={[
                        styles.pttButton,
                        isTalking && styles.pttActive,
                        !voiceConnected && styles.pttDisabled
                    ]}
                >
                    <View style={[styles.pttInner, isTalking && {borderColor: 'red'}]}>
                        <Text style={styles.pttText}>{isTalking ? "TRANSMITTING" : "HOLD TO TALK"}</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Chat Area */}
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"} 
                style={styles.chatContainer}
                keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0} 
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item, index) => index.toString()}
                    style={styles.msgList}
                    contentContainerStyle={{paddingBottom: 10}}
                />
                
                <View style={styles.inputBar}>
                    <TextInput
                        mode="outlined"
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Type a message..."
                        right={<TextInput.Icon icon="send" onPress={handleSend} />}
                        style={styles.input}
                        theme={{ colors: { primary: '#00f3ff', onSurfaceVariant: 'gray' }}}
                        textColor="white"
                    />
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { 
        paddingTop: 40, paddingBottom: 10, paddingHorizontal: 20, 
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
    },
    headerTitle: { color: 'white', fontWeight: 'bold', letterSpacing: 1 },
    
    pttContainer: { height: 250, justifyContent: 'center', alignItems: 'center' },
    pttButton: {
        width: 180, height: 180, borderRadius: 90,
        backgroundColor: '#333',
        justifyContent: 'center', alignItems: 'center',
        elevation: 10, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 10
    },
    pttActive: { backgroundColor: '#500000', borderColor: 'red', borderWidth: 2 },
    pttDisabled: { opacity: 0.5 },
    pttInner: {
        width: 160, height: 160, borderRadius: 80,
        borderWidth: 2, borderColor: '#00f3ff', borderStyle: 'dashed',
        justifyContent: 'center', alignItems: 'center'
    },
    pttText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    chatContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    msgList: { flex: 1, padding: 10 },
    messageBubble: {
        padding: 10, borderRadius: 10, marginBottom: 8, maxWidth: '80%',
    },
    myMessage: { alignSelf: 'flex-end', backgroundColor: '#005f73' },
    otherMessage: { alignSelf: 'flex-start', backgroundColor: '#333' },
    senderName: { fontSize: 10, color: '#00f3ff', marginBottom: 2 },
    messageText: { color: 'white', fontSize: 14 },
    timestamp: { alignSelf: 'flex-end', fontSize: 8, color: 'rgba(255,255,255,0.5)', marginTop: 4 },

    inputBar: { padding: 10, backgroundColor: '#1a1a1a' },
    input: { backgroundColor: '#333' }
});
