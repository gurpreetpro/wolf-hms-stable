
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay, runOnJS } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

export default function AnimatedSplash({ onFinish }) {
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.8);

    useEffect(() => {
        // Fade In & Scale Up
        opacity.value = withTiming(1, { duration: 800 });
        scale.value = withTiming(1, { duration: 800 });

        // Exit Animation logic
        const timeout = setTimeout(() => {
             // Fade out slightly before unmounting or just call finish
             onFinish();
        }, 2500); // 2.5s total splash time

        return () => clearTimeout(timeout);
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }]
    }));

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#050a14', '#141e30']} style={StyleSheet.absoluteFill} />
            <View style={styles.center}>
                 <Animated.Image 
                    source={require('../../assets/wolf_logo.png')} 
                    style={[styles.logo, animatedStyle]} 
                    resizeMode="contain"
                 />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    logo: { width: 220, height: 220 }
});
