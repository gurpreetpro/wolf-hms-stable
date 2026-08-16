import React, { useState, useCallback, useRef, Component } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Dimensions,
  Vibration,
  Platform,
} from 'react-native';

// ---------------------------------------------------------------------------
// React‑Native Error Boundary (Web compatible API port)
// ---------------------------------------------------------------------------
interface EBProps { children: React.ReactNode; name?: string }
interface EBState { hasError: boolean; errorMessage: string }

class WidgetErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }
  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, errorMessage: error?.message || 'Unknown error' };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn(`[WidgetErrorBoundary] ${this.props.name || 'Widget'} failed`, error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={estyles.errorFallback}>
          <Text style={estyles.errorIcon}>⚠️</Text>
          <Text style={estyles.errorTitle}>
            {this.props.name || 'Widget'} Offline
          </Text>
          <Text style={estyles.errorMessage}>{this.state.errorMessage}</Text>
          <TouchableOpacity
            style={estyles.retryBtn}
            onPress={() => this.setState({ hasError: false, errorMessage: '' })}
          >
            <Text style={estyles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CAMERA_HEIGHT = SCREEN_HEIGHT * 0.38;
const PLATE_REGEX = /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{1,4}$/i;
const KEY_ROWS: string[][] = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
  ['SPACE', 'CLR'],
];
const TARIFFS: Record<string, number> = {
  CAR: 50,
  BIKE: 20,
  SUV: 80,
  BUS: 150,
  AUTO: 30,
  UNKNOWN: 50,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const detectVehicleCategory = (plate: string): string => {
  const clean = plate.replace(/\s/g, '').toUpperCase();
  if (/^[A-Z]{2}\d{2}[A-Z]{1,2}\d{1,4}$/.test(clean)) return 'CAR';
  if (/^[A-Z]{2}\d{2}[A-Z]\d{4}$/.test(clean)) return 'CAR';
  if (/^\d{1,4}[A-Z]{1,3}$/.test(clean)) return 'BIKE';
  return 'UNKNOWN';
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function ParkingTerminalScreen() {
  // -- State --
  const [mode, setMode] = useState<'plate' | 'qr'>('plate');
  const [plateInput, setPlateInput] = useState('');
  const [detectedPlate, setDetectedPlate] = useState('');
  const [category, setCategory] = useState('—');
  const [fee, setFee] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const inputRef = useRef(plateInput);

  // -- Keypad handler --
  const handleKeyPress = useCallback((key: string) => {
    Vibration.vibrate(Platform.OS === 'android' ? 10 : 0);
    setLastAction(null);
    setPlateInput((prev) => {
      let next = prev;
      switch (key) {
        case '⌫':
          next = prev.slice(0, -1);
          break;
        case 'CLR':
          next = '';
          break;
        case 'SPACE':
          next = prev + ' ';
          break;
        default:
          if (next.length < 15) next = prev + key;
      }
      inputRef.current = next;

      // Real‑time detection
      const cat = next.trim() ? detectVehicleCategory(next) : '—';
      const calculatedFee = next.trim() ? TARIFFS[cat] || 50 : 0;
      setDetectedPlate(next.trim());
      setCategory(cat);
      setFee(calculatedFee);
      return next;
    });
  }, []);

  // -- Mock camera scan trigger --
  const simulateCameraScan = useCallback(() => {
    setProcessing(true);
    setLastAction('Scanning camera feed…');
    const mockPlates = [
      'MH14AB1234',
      'DL3CAB5678',
      'KA05MN9090',
      'GJ01HH4321',
      'TN22XY1111',
      '1234ABC',
    ];
    setTimeout(() => {
      const randomPlate = mockPlates[Math.floor(Math.random() * mockPlates.length)];
      const cat = detectVehicleCategory(randomPlate);
      setPlateInput(randomPlate);
      setDetectedPlate(randomPlate);
      setCategory(cat);
      setFee(TARIFFS[cat] || 50);
      setProcessing(false);
      setLastAction(`ANPR hit → ${randomPlate}`);
      Vibration.vibrate(Platform.OS === 'android' ? 50 : 0);
    }, 1200);
  }, []);

  // -- Actions --
  const handleCollectCash = useCallback(() => {
    if (!detectedPlate) return;
    setLastAction(`CASH ₹${fee} collected for ${detectedPlate}`);
    Vibration.vibrate([0, 100, 100, 100]);
  }, [detectedPlate, fee]);

  const handleCollectUPI = useCallback(() => {
    if (!detectedPlate) return;
    setLastAction(`UPI ₹${fee} initiated for ${detectedPlate}`);
    Vibration.vibrate([0, 100, 100, 100]);
  }, [detectedPlate, fee]);

  const handleGateOverride = useCallback(() => {
    setLastAction('⚠️ MANUAL GATE OVERRIDE — boom barrier raised');
    Vibration.vibrate([200, 200, 200]);
  }, []);

  // -- Toggle mode handler --
  const toggleMode = useCallback((val: boolean) => {
    setMode(val ? 'qr' : 'plate');
    setLastAction(val ? 'Switched to WOLF Care QR mode' : 'Switched to Plate Scanner mode');
  }, []);

  // -- Build key row elements --
  const renderKeyRow = (keys: string[], rowIdx: number) => (
    <View style={styles.keyRow} key={`row-${rowIdx}`}>
      {keys.map((k) => {
        const isWide = k === 'SPACE' || k === 'CLR';
        const isDel = k === '⌫';
        const isAction = isDel || k === 'CLR';
        return (
          <TouchableOpacity
            key={k}
            style={[
              styles.keyButton,
              isWide && styles.keyButtonWide,
              isAction && styles.keyButtonAction,
            ]}
            onPress={() => handleKeyPress(k)}
            activeOpacity={0.6}
          >
            <Text
              style={[
                styles.keyText,
                isWide && styles.keyTextWide,
                isDel && styles.keyTextDel,
              ]}
            >
              {k === 'SPACE' ? '␣ SPACE' : k === 'CLR' ? 'CLEAR' : k}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <WidgetErrorBoundary name="ParkingTerminal">
      <View style={styles.container}>
        {/* ============================================================ */}
        {/* TOP 38% — Camera / Scanner Placeholder                       */}
        {/* ============================================================ */}
        <View style={styles.cameraContainer}>
          {/* Dark gray camera view */}
          <View style={styles.cameraPlaceholder}>
            <Text style={styles.cameraLabel}>
              {mode === 'plate' ? 'ANPR / QR Scanner Live' : 'WOLF Care QR Scanner Live'}
            </Text>
            <View style={styles.cameraOverlay}>
              <View style={[styles.cameraCorner, styles.cornerTL]} />
              <View style={[styles.cameraCorner, styles.cornerTR]} />
              <View style={[styles.cameraCorner, styles.cornerBL]} />
              <View style={[styles.cameraCorner, styles.cornerBR]} />
              <Text style={styles.cameraHint}>
                {processing
                  ? '⏳ Scanning…'
                  : mode === 'plate'
                  ? 'Align vehicle plate within brackets'
                  : 'Point camera at WOLF Care QR code'}
              </Text>
            </View>
            {/* Simulate scan button */}
            <TouchableOpacity
              style={styles.scanButton}
              onPress={simulateCameraScan}
              disabled={processing}
              activeOpacity={0.7}
            >
              <Text style={styles.scanButtonText}>
                {processing ? 'SCANNING…' : '📷 SIMULATE SCAN'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ============================================================ */}
        {/* BOTTOM 62% — Controls & Keypad                               */}
        {/* ============================================================ */}
        <ScrollView
          style={styles.controlsContainer}
          contentContainerStyle={styles.controlsContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ---- Mode Toggle ---- */}
          <View style={styles.modeToggleRow}>
            <View style={styles.modeLabelGroup}>
              <Text
                style={[
                  styles.modeLabel,
                  mode === 'plate' && styles.modeLabelActive,
                ]}
              >
                📷 Plate Scanner
              </Text>
              <Switch
                value={mode === 'qr'}
                onValueChange={toggleMode}
                trackColor={{ false: '#334155', true: '#10b981' }}
                thumbColor={mode === 'qr' ? '#ecfdf5' : '#94a3b8'}
                ios_backgroundColor="#334155"
              />
              <Text
                style={[
                  styles.modeLabel,
                  mode === 'qr' && styles.modeLabelActive,
                ]}
              >
                🔲 WOLF Care QR
              </Text>
            </View>
          </View>

          {/* ---- Manual Input Display ---- */}
          <View style={styles.inputDisplayContainer}>
            <Text style={styles.inputDisplayLabel}>
              {mode === 'plate' ? 'Plate Number' : 'QR / Patient ID'}
            </Text>
            <View style={styles.inputDisplayBox}>
              <Text style={styles.inputDisplayText}>
                {plateInput || '—'}
              </Text>
              <View style={styles.inputCursor} />
            </View>
          </View>

          {/* ---- Custom Alphanumeric Keypad ---- */}
          <View style={styles.keypadContainer}>
            {KEY_ROWS.map((row, idx) => renderKeyRow(row, idx))}
          </View>

          {/* ---- Ticket Summary ---- */}
          <View style={styles.ticketSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Plate Number</Text>
              <Text style={styles.summaryValue}>
                {detectedPlate || '—'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Detected Category</Text>
              <Text style={styles.summaryValue}>{category}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Fee</Text>
              <Text style={styles.summaryValueFee}>₹{fee}</Text>
            </View>
          </View>

          {/* ---- Action Buttons ---- */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnCash]}
              onPress={handleCollectCash}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>💵 COLLECT CASH</Text>
              <Text style={styles.actionBtnSub}>₹{fee}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnUPI]}
              onPress={handleCollectUPI}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>📲 COLLECT UPI</Text>
              <Text style={styles.actionBtnSub}>₹{fee}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnOverride]}
              onPress={handleGateOverride}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>
                🔓 MANUAL GATE OVERRIDE
              </Text>
              <Text style={styles.actionBtnSub}>Boom Barrier</Text>
            </TouchableOpacity>
          </View>

          {/* ---- Last Action Feedback ---- */}
          {lastAction && (
            <View
              style={[
                styles.feedbackBanner,
                lastAction.includes('⚠️') && styles.feedbackBannerDanger,
              ]}
            >
              <Text style={styles.feedbackText}>{lastAction}</Text>
            </View>
          )}

          {/* Bottom spacer for scroll */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </WidgetErrorBoundary>
  );
}

// ===========================================================================
// STYLES — Tactical Dark Mode (Mint‑Fresh)
// ===========================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },

  /* ---- Camera ---- */
  cameraContainer: {
    height: CAMERA_HEIGHT,
    backgroundColor: '#020617',
    borderBottomWidth: 2,
    borderBottomColor: '#1e293b',
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraLabel: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  cameraOverlay: {
    width: SCREEN_WIDTH * 0.75,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraCorner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#10b981',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  cameraHint: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  scanButton: {
    position: 'absolute',
    bottom: 16,
    backgroundColor: '#10b981',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  scanButtonText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1,
  },

  /* ---- Controls Scroll ---- */
  controlsContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  controlsContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 100,
  },

  /* ---- Mode Toggle ---- */
  modeToggleRow: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  modeLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeLabel: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  modeLabelActive: {
    color: '#10b981',
    fontWeight: '800',
  },

  /* ---- Input Display ---- */
  inputDisplayContainer: {
    marginBottom: 10,
  },
  inputDisplayLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputDisplayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputDisplayText: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  inputCursor: {
    width: 2,
    height: 24,
    backgroundColor: '#10b981',
    marginLeft: 2,
  },

  /* ---- Custom Keypad ---- */
  keypadContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 8,
    marginBottom: 12,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 2,
  },
  keyButton: {
    flex: 1,
    maxWidth: (SCREEN_WIDTH - 60) / 10,
    aspectRatio: 1.1,
    margin: 3,
    backgroundColor: '#334155',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyButtonWide: {
    maxWidth: (SCREEN_WIDTH - 60) / 4.5,
    aspectRatio: undefined,
    height: 50,
  },
  keyButtonAction: {
    backgroundColor: '#475569',
  },
  keyText: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '700',
  },
  keyTextWide: {
    fontSize: 13,
    letterSpacing: 1,
  },
  keyTextDel: {
    color: '#f87171',
    fontSize: 18,
  },

  /* ---- Ticket Summary ---- */
  ticketSummary: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  summaryValue: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  summaryValueFee: {
    color: '#10b981',
    fontSize: 22,
    fontWeight: '800',
  },

  /* ---- Action Buttons ---- */
  actionsContainer: {
    gap: 10,
    marginBottom: 12,
  },
  actionBtn: {
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnCash: {
    backgroundColor: '#f59e0b',
  },
  actionBtnUPI: {
    backgroundColor: '#10b981',
  },
  actionBtnOverride: {
    backgroundColor: '#dc2626',
    borderWidth: 2,
    borderColor: '#fca5a5',
  },
  actionBtnText: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 1,
  },
  actionBtnSub: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.8,
    marginTop: 2,
  },

  /* ---- Feedback ---- */
  feedbackBanner: {
    backgroundColor: '#065f46',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  feedbackBannerDanger: {
    backgroundColor: '#7f1d1d',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  feedbackText: {
    color: '#ecfdf5',
    fontSize: 13,
    fontWeight: '600',
  },
});

/* ---- Error Boundary Fallback Styles (not via StyleSheet for isolation) ---- */
const estyles = StyleSheet.create({
  errorFallback: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorIcon: { fontSize: 48, marginBottom: 12 },
  errorTitle: {
    color: '#f87171',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  errorMessage: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 14,
  },
});