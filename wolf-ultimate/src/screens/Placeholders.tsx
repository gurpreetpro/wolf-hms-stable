import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../theme/theme';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  text: { color: COLORS.text, fontFamily: FONTS.bold, fontSize: 24 }
});

export const DoctorHome = () => (
  <View style={styles.container}><Text style={styles.text}>Doctor Dashboard</Text></View>
);

export const NurseHome = () => (
    <View style={styles.container}><Text style={styles.text}>Nurse Dashboard</Text></View>
);
  
export const WardHome = () => (
    <View style={styles.container}><Text style={styles.text}>Ward Management</Text></View>
);
