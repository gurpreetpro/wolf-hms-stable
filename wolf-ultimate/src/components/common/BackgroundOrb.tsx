import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../../theme/theme';

interface BackgroundOrbProps {
    color?: string;
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    style?: ViewStyle;
}

export const BackgroundOrb = ({ color = COLORS.primary, position = 'top-right', style }: BackgroundOrbProps) => {
    
    const getPositionStyle = () => {
        switch (position) {
            case 'top-right': return { top: -100, right: -50 };
            case 'top-left': return { top: -100, left: -50 };
            case 'bottom-right': return { bottom: -100, right: -50 };
            case 'bottom-left': return { bottom: -100, left: -50 };
            default: return { top: -100, right: -50 };
        }
    };

    return (
        <View 
            style={[
                styles.orb, 
                getPositionStyle(),
                { backgroundColor: color },
                style
            ]} 
        />
    );
};

const styles = StyleSheet.create({
    orb: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        opacity: 0.05,
    }
});
