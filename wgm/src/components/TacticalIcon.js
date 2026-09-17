import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Rect, Line, G, Polygon } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme';

/**
 * TacticalIcon — Enterprise Mission-Critical Vector Icon Component
 * 
 * Provides crisp, resolution-independent pure SVG vectors for all primary
 * mission icons. Completely immune to native font loading race conditions or
 * release bundle font omissions. Falls back to MaterialCommunityIcons for any
 * extended glyphs.
 */
export default function TacticalIcon({ name, size = 24, color = COLORS.textPrimary, style }) {
    const s = size;
    const c = color;

    switch (name) {
        case 'arrow-left':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style}>
                    <Path d="M19 12H5M5 12L12 19M5 12L12 5" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            );

        case 'chevron-right':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style}>
                    <Path d="M9 18L15 12L9 6" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            );

        case 'shield-account':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style}>
                    <Path d="M12 2L3 6V11C3 16.5 6.8 21.7 12 23C17.2 21.7 21 16.5 21 11V6L12 2Z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <Circle cx="12" cy="10" r="3" stroke={c} strokeWidth="1.8" />
                    <Path d="M7.5 17C7.5 14.8 9.5 13.5 12 13.5C14.5 13.5 16.5 14.8 16.5 17" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
                </Svg>
            );

        case 'shield-home':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style}>
                    <Path d="M12 2L3 6V11C3 16.5 6.8 21.7 12 23C17.2 21.7 21 16.5 21 11V6L12 2Z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <Path d="M8 12L12 8.5L16 12V16.5H8V12Z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
                </Svg>
            );

        case 'boom-gate':
        case 'boom-gate-up':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style}>
                    <Rect x="3" y="10" width="4" height="11" rx="1" fill={c} opacity={0.3} />
                    <Rect x="3" y="10" width="4" height="11" rx="1" stroke={c} strokeWidth="1.8" />
                    <Circle cx="5" cy="12" r="1.5" fill={c} />
                    <Path d="M6 12L21 6" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
                    <Line x1="10" y1="10.5" x2="11" y2="8" stroke={c} strokeWidth="1.5" opacity={0.6} />
                    <Line x1="15" y1="8.5" x2="16" y2="6" stroke={c} strokeWidth="1.5" opacity={0.6} />
                    <Line x1="1" y1="21" x2="9" y2="21" stroke={c} strokeWidth="2" strokeLinecap="round" />
                </Svg>
            );

        case 'desk':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style}>
                    <Rect x="2" y="10" width="20" height="3" rx="1" fill={c} opacity={0.3} />
                    <Rect x="2" y="10" width="20" height="3" rx="1" stroke={c} strokeWidth="1.6" />
                    <Path d="M4 13V20M20 13V20M14 13V20" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
                    <Rect x="7" y="4" width="7" height="5" rx="0.8" stroke={c} strokeWidth="1.5" />
                    <Path d="M9 9H12M10.5 9V10" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
                </Svg>
            );

        case 'alarm-light':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style}>
                    <Path d="M6 15C6 10 8.5 6 12 6C15.5 6 18 10 18 15H6Z" fill={c} opacity={0.25} />
                    <Path d="M6 15C6 10 8.5 6 12 6C15.5 6 18 10 18 15H6Z" stroke={c} strokeWidth="2" strokeLinejoin="round" />
                    <Rect x="4" y="15" width="16" height="4" rx="1" stroke={c} strokeWidth="1.8" fill={c} opacity={0.4} />
                    <Path d="M12 2V4M4 5L5.5 6.5M20 5L18.5 6.5" stroke={c} strokeWidth="2" strokeLinecap="round" />
                </Svg>
            );

        case 'qrcode-scan':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style}>
                    <Path d="M4 8V4H8M20 8V4H16M4 16V20H8M20 16V20H16" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    <Line x1="5" y1="12" x2="19" y2="12" stroke={c} strokeWidth="2" strokeLinecap="round" opacity={0.9} />
                    <Circle cx="9" cy="9" r="1.5" fill={c} />
                    <Circle cx="15" cy="9" r="1.5" fill={c} />
                    <Circle cx="9" cy="15" r="1.5" fill={c} />
                    <Circle cx="15" cy="15" r="1.5" fill={c} />
                </Svg>
            );

        case 'swap-horizontal':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style}>
                    <Path d="M21 8L17 4M21 8L17 12M21 8H7M3 16L7 12M3 16L7 20M3 16H17" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            );

        case 'notebook':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style}>
                    <Rect x="5" y="3" width="15" height="18" rx="2" stroke={c} strokeWidth="2" />
                    <Line x1="9" y1="7" x2="16" y2="7" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
                    <Line x1="9" y1="11" x2="16" y2="11" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
                    <Line x1="9" y1="15" x2="13" y2="15" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
                    <Path d="M3 6H6M3 10H6M3 14H6M3 18H6" stroke={c} strokeWidth="2" strokeLinecap="round" />
                </Svg>
            );

        case 'camera':
        case 'camera-plus':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style}>
                    <Path d="M23 19C23 19.5 22.8 20 22.4 20.4C22 20.8 21.5 21 21 21H3C2.5 21 2 20.8 1.6 20.4C1.2 20 1 19.5 1 19V8C1 7.5 1.2 7 1.6 6.6C2 6.2 2.5 6 3 6H7L9 3H15L17 6H21C21.5 6 22 6.2 22.4 6.6C22.8 7 23 7.5 23 8V19Z" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <Circle cx="12" cy="13" r="4" stroke={c} strokeWidth="1.8" />
                </Svg>
            );

        case 'flashlight':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style}>
                    <Path d="M18 10L14 3H10L6 10L8 21H16L18 10Z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
                    <Circle cx="12" cy="14" r="1.5" fill={c} />
                    <Line x1="8" y1="10" x2="16" y2="10" stroke={c} strokeWidth="1.5" />
                </Svg>
            );

        case 'flashlight-off':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style}>
                    <Path d="M18 10L14 3H10L6 10L8 21H16L18 10Z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" opacity={0.5} />
                    <Line x1="2" y1="2" x2="22" y2="22" stroke={c} strokeWidth="2" strokeLinecap="round" />
                </Svg>
            );

        case 'radio-handheld':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style}>
                    <Line x1="8" y1="1" x2="8" y2="7" stroke={c} strokeWidth="2" strokeLinecap="round" />
                    <Line x1="14" y1="4" x2="14" y2="7" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
                    <Rect x="5" y="7" width="14" height="16" rx="2" stroke={c} strokeWidth="1.8" />
                    <Rect x="8" y="10" width="8" height="4" rx="0.8" fill={c} opacity={0.2} stroke={c} strokeWidth="1" />
                    <Line x1="8" y1="17" x2="16" y2="17" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
                    <Line x1="9" y1="19.5" x2="15" y2="19.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
                </Svg>
            );

        case 'package':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style}>
                    <Path d="M12 2L2 7L12 12L22 7L12 2Z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
                    <Path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
                </Svg>
            );

        case 'alert-octagon':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style}>
                    <Polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" stroke={c} strokeWidth="2" strokeLinejoin="round" />
                    <Line x1="12" y1="8" x2="12" y2="12" stroke={c} strokeWidth="2" strokeLinecap="round" />
                    <Circle cx="12" cy="16" r="1.2" fill={c} />
                </Svg>
            );

        case 'account-cog':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style}>
                    <Circle cx="9" cy="8" r="4" stroke={c} strokeWidth="1.8" />
                    <Path d="M2 20C2 16.5 5 14 9 14C10.5 14 11.9 14.4 13 15.1" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
                    <Circle cx="18" cy="18" r="2" stroke={c} strokeWidth="1.8" />
                    <Path d="M18 14V15M18 21V22M14 18H15M21 18H22" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
                </Svg>
            );

        case 'clipboard-text-clock':
        case 'clipboard-text-clock-outline':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style}>
                    <Path d="M16 4H18C19.1 4 20 4.9 20 6V11" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
                    <Path d="M8 4H6C4.9 4 4 4.9 4 6V20C4 21.1 4.9 22 6 22H11" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
                    <Rect x="8" y="2" width="8" height="4" rx="1" stroke={c} strokeWidth="1.6" />
                    <Line x1="8" y1="10" x2="14" y2="10" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
                    <Line x1="8" y1="14" x2="11" y2="14" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
                    <Circle cx="17" cy="17" r="4.5" stroke={c} strokeWidth="1.8" />
                    <Path d="M17 15V17L18.5 18.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
                </Svg>
            );

        case 'check-circle':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style}>
                    <Circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2" />
                    <Path d="M8 12L11 15L16 9" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            );

        case 'radar':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style}>
                    <Circle cx="12" cy="12" r="9.5" stroke={c} strokeWidth="1.8" />
                    <Circle cx="12" cy="12" r="6" stroke={c} strokeWidth="1.4" opacity={0.6} />
                    <Circle cx="12" cy="12" r="2.5" stroke={c} strokeWidth="1.4" opacity={0.8} />
                    <Line x1="12" y1="2.5" x2="12" y2="12" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
                    <Line x1="12" y1="12" x2="19.5" y2="12" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
                </Svg>
            );

        case 'car':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style}>
                    <Path d="M3 12L5 6H19L21 12M3 12H21M3 12V18H5M21 12V18H19" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <Circle cx="7.5" cy="17.5" r="2" fill={c} />
                    <Circle cx="16.5" cy="17.5" r="2" fill={c} />
                </Svg>
            );

        case 'motorbike':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style}>
                    <Circle cx="5" cy="16" r="3" stroke={c} strokeWidth="1.8" />
                    <Circle cx="19" cy="16" r="3" stroke={c} strokeWidth="1.8" />
                    <Path d="M5 16L10 10H14L19 16M14 10L16 6H18" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            );

        case 'truck':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style}>
                    <Rect x="1" y="6" width="14" height="11" rx="1" stroke={c} strokeWidth="1.8" />
                    <Path d="M15 9H19L22 13V17H15V9Z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
                    <Circle cx="5.5" cy="17.5" r="2" fill={c} />
                    <Circle cx="18.5" cy="17.5" r="2" fill={c} />
                </Svg>
            );

        case 'account-plus':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style}>
                    <Circle cx="9" cy="8" r="4" stroke={c} strokeWidth="1.8" />
                    <Path d="M2 20C2 16.5 5 14 9 14C11 14 12.8 14.7 14 16" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
                    <Path d="M19 8V14M16 11H22" stroke={c} strokeWidth="2" strokeLinecap="round" />
                </Svg>
            );

        case 'account-group':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style}>
                    <Circle cx="9" cy="7" r="3" stroke={c} strokeWidth="1.8" />
                    <Path d="M3 18C3 15 5.5 13 9 13C12.5 13 15 15 15 18" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
                    <Circle cx="16" cy="7" r="2.5" stroke={c} strokeWidth="1.5" />
                    <Path d="M16 12C18 12.3 20 13.5 20 16" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
                </Svg>
            );

        case 'car-wrench':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style}>
                    <Path d="M3 11L5 6H19L21 11M3 11H21M3 11V17H5M21 11V17H19" stroke={c} strokeWidth="1.6" />
                    <Circle cx="7" cy="16" r="1.5" fill={c} />
                    <Circle cx="17" cy="16" r="1.5" fill={c} />
                    <Path d="M12 2L14 4L11 7L9 5L12 2Z" stroke={c} strokeWidth="1.5" />
                </Svg>
            );

        default:
            return <MaterialCommunityIcons name={name} size={size} color={color} style={style} />;
    }
}
