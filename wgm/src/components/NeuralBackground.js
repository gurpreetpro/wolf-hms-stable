import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const NeuralBackground = () => {
    const { theme } = useTheme();
    const colors = theme.colors;

    return (
        <View style={StyleSheet.absoluteFill}>
            <LinearGradient
                colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
                style={StyleSheet.absoluteFill}
            />
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                <Defs>
                    <RadialGradient id="glow1" cx="50%" cy="50%" r="50%">
                        <Stop offset="0%" stopColor={colors.cyan} stopOpacity="0.4" />
                        <Stop offset="100%" stopColor={colors.cyan} stopOpacity="0" />
                    </RadialGradient>
                    <RadialGradient id="glow2" cx="50%" cy="50%" r="50%">
                        <Stop offset="0%" stopColor={colors.accent} stopOpacity="0.3" />
                        <Stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
                    </RadialGradient>
                </Defs>
                
                {/* Neural nodes */}
                <Circle cx="60" cy="120" r="20" fill="url(#glow1)" />
                <Circle cx="60" cy="120" r="4" fill={colors.cyan} opacity={0.8} />
                
                <Circle cx="320" cy="80" r="15" fill="url(#glow2)" />
                <Circle cx="320" cy="80" r="3" fill={colors.accent} opacity={0.6} />
                
                <Circle cx="180" cy="200" r="18" fill="url(#glow1)" />
                <Circle cx="180" cy="200" r="4" fill={colors.primary} opacity={0.7} />
                
                <Circle cx="40" cy="350" r="12" fill="url(#glow2)" />
                <Circle cx="40" cy="350" r="3" fill={colors.secondary} opacity={0.5} />
                
                <Circle cx="350" cy="450" r="16" fill="url(#glow1)" />
                <Circle cx="350" cy="450" r="4" fill={colors.cyan} opacity={0.6} />
                
                <Circle cx="100" cy="550" r="14" fill="url(#glow2)" />
                <Circle cx="100" cy="550" r="3" fill={colors.accent} opacity={0.5} />
                
                <Circle cx="280" cy="280" r="10" fill="url(#glow1)" />
                <Circle cx="280" cy="280" r="2" fill={colors.primary} opacity={0.6} />
                
                {/* Connection lines */}
                <Line x1="60" y1="120" x2="180" y2="200" stroke={colors.cyan} strokeWidth="1" opacity={0.3} />
                <Line x1="180" y1="200" x2="320" y2="80" stroke={colors.primary} strokeWidth="1" opacity={0.2} />
                <Line x1="180" y1="200" x2="280" y2="280" stroke={colors.accent} strokeWidth="0.5" opacity={0.3} />
                <Line x1="280" y1="280" x2="350" y2="450" stroke={colors.secondary} strokeWidth="0.5" opacity={0.2} />
                <Line x1="40" y1="350" x2="100" y2="550" stroke={colors.cyan} strokeWidth="0.5" opacity={0.3} />
                
                {/* Decorative circuit patterns */}
                <Path
                    d="M20 650 L60 650 L60 620 L100 620"
                    stroke={colors.primary}
                    strokeWidth="1"
                    fill="none"
                    opacity={0.3}
                />
                <Path
                    d="M350 700 L320 700 L320 670 L280 670"
                    stroke={colors.cyan}
                    strokeWidth="1"
                    fill="none"
                    opacity={0.2}
                />
            </Svg>
        </View>
    );
};

export default NeuralBackground;
