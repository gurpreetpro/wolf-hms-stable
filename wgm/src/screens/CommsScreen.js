import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Vibration, TouchableOpacity } from 'react-native';
import { Text, TextInput, IconButton } from 'react-native-paper';
import notifee, { AndroidImportance } from '@notifee/react-native';
import ScreenShell from '../components/ScreenShell';
import voiceService from '../services/voiceService';
import chatService from '../services/chatService';
import { COLORS } from '../theme';

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
        try {
            await notifee.displayNotification({
                id: 'wolf-comms',
                title: 'Wolf Comms Active',
                body: 'Maintained secure voice channel.',
                android: {
                    channelId: 'default',
                    asForegroundService: true,
                    importance: AndroidImportance.LOW,
                },
            });
        } catch (e) {
            // Notifee background permission
        }
    };

    const stopForegroundService = async () => {
        try {
            await notifee.stopForegroundService();
        } catch (e) {
            // Notifee cleanup
        }
    };

    const handlePTTPressIn = async () => {
        if (!voiceConnected) return;
        setIsTalking(true);
        Vibration.vibrate(50);
        await voiceService.startTalking();
    };

    const handlePTTPressOut = async () => {
        setIsTalking(false);
        await voiceService.stopTalking();
        Vibration.vibrate(20);
    };

    const handleSend = () => {
        if (!inputText.trim()) return;
        chatService.sendMessage('global', inputText, 'Me');
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
            <Text style={styles.timestamp}>{new Date(item.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
    );

    return (
        <ScreenShell
            title="Wolf Comms"
            badgeText={voiceConnected ? "ONLINE" : "STANDBY"}
            badgeColor={voiceConnected ? COLORS.statusGreen : COLORS.surfaceElevated}
            scrollable={false}
            contentContainerStyle={{ paddingHorizontal: 0, paddingTop: 4 }}
            rightAction={
                <IconButton 
                    icon={voiceConnected ? "microphone" : "microphone-off"} 
                    iconColor={voiceConnected ? COLORS.accent : COLORS.textMuted}
                    size={22}
                    onPress={voiceConnected ? () => { voiceService.disconnect(); setVoiceConnected(false); } : initVoice}
                />
            }
        >
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
                    activeOpacity={0.8}
                >
                    <View style={[styles.pttInner, isTalking && { borderColor: COLORS.statusRed }]}>
                        <Text style={styles.pttText}>{isTalking ? "TRANSMITTING..." : "HOLD TO TALK (PTT)"}</Text>
                    </View>
                </TouchableOpacity>
                {!voiceConnected && (
                    <Text style={styles.connectHint}>Tap 🎙️ icon in top-right to join squad radio</Text>
                )}
            </View>

            {/* Chat Messages Area */}
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                contentContainerStyle={styles.chatList}
                showsVerticalScrollIndicator={false}
            />

            {/* Input Bar */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={styles.inputContainer}>
                    <TextInput
                        placeholder="Broadcast message to channel..."
                        placeholderTextColor={COLORS.textMuted}
                        value={inputText}
                        onChangeText={setInputText}
                        style={styles.chatInput}
                        textColor={COLORS.textPrimary}
                        mode="flat"
                        underlineColor="transparent"
                        activeUnderlineColor="transparent"
                    />
                    <IconButton 
                        icon="send" 
                        iconColor={COLORS.accent} 
                        size={22}
                        onPress={handleSend} 
                    />
                </View>
            </KeyboardAvoidingView>
        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    pttContainer: {
        alignItems: 'center',
        paddingVertical: 14,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    pttButton: {
        width: 220,
        height: 52,
        borderRadius: 26,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.accent,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
    },
    pttActive: {
        backgroundColor: COLORS.dangerDark,
        borderColor: COLORS.statusRed,
    },
    pttDisabled: {
        borderColor: COLORS.border,
        opacity: 0.6,
    },
    pttInner: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    pttText: {
        color: COLORS.textPrimary,
        fontWeight: 'bold',
        fontSize: 13,
        letterSpacing: 0.5,
    },
    connectHint: {
        color: COLORS.textMuted,
        fontSize: 11,
        marginTop: 6,
    },
    chatList: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    messageBubble: {
        padding: 12,
        borderRadius: 14,
        marginBottom: 10,
        maxWidth: '80%',
    },
    myMessage: {
        alignSelf: 'flex-end',
        backgroundColor: COLORS.surfaceElevated,
        borderBottomRightRadius: 2,
    },
    otherMessage: {
        alignSelf: 'flex-start',
        backgroundColor: COLORS.card,
        borderBottomLeftRadius: 2,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    senderName: {
        fontSize: 11,
        color: COLORS.accent,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    messageText: {
        color: COLORS.textPrimary,
        fontSize: 14,
    },
    timestamp: {
        fontSize: 9,
        color: COLORS.textMuted,
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    chatInput: {
        flex: 1,
        backgroundColor: 'transparent',
        fontSize: 14,
        height: 44,
    },
});
