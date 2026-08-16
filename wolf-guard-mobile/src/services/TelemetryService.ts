import { accelerometer, gyroscope, magnetometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';
import { BleManager, type Device } from 'react-native-ble-plx';
import { throttle } from 'lodash';
import { io, type Socket } from 'socket.io-client';
import { WOLFGuardTrackingEngine } from '../engine/WOLFGuardTrackingEngine';
import { getActiveShiftToken } from '../auth/shiftAuth';

// --- Constants ---
const SENSOR_HZ = 50;
const BROADCAST_THROTTLE_MS = 500; // 2 Hz broadcast
const BLE_SCAN_INTERVAL_MS = 15000;   // restart scan every 15s to keep alive
const BLE_SCAN_DURATION_MS = 13000;   // scan duration per cycle

// --- Types ---
interface TelemetrySample {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

interface BLEDiscovery {
  uuid: string;
  rssi: number;
  txPower: number | undefined;
  timestamp: number;
}

export class TelemetryService {
  private static instance: TelemetryService;
  private engine: WOLFGuardTrackingEngine;
  private bleManager: BleManager;
  private socket: Socket | null = null;
  private throttledBroadcast: () => void;

  private sensorSubscriptions: Array<{ unsubscribe: () => void }> = [];
  private bleScanTimer: ReturnType<typeof setInterval> | null = null;
  private isScanning = false;
  private isRunning = false;

  private constructor() {
    this.engine = new WOLFGuardTrackingEngine();
    this.bleManager = new BleManager();

    // Initialize socket connection (deferred until start)
    this.socket = null;

    // Create throttled broadcast (2 Hz)
    this.throttledBroadcast = throttle(this.broadcastState.bind(this), BROADCAST_THROTTLE_MS, {
      leading: true,
      trailing: true,
    });
  }

  public static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  // ---- Public API ----
  public async start(socketUrl: string): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    // 1. Connect Socket.IO with JWT active shift token
    const token = await getActiveShiftToken();
    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('[TelemetryService] Socket connected');
    });
    this.socket.on('disconnect', (reason) => {
      console.warn('[TelemetryService] Socket disconnected:', reason);
    });

    // 2. Start sensor subscriptions
    this.startSensors();

    // 3. Start BLE scanning loop
    this.startBLEScanLoop();
  }

  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    // Unsubscribe sensors
    this.sensorSubscriptions.forEach((sub) => sub.unsubscribe());
    this.sensorSubscriptions = [];

    // Stop BLE scanning
    this.stopBLEScanLoop();
    this.bleManager.destroy();

    // Disconnect socket
    this.socket?.disconnect();
    this.socket = null;
  }

  // ---- Sensor ingestion ----
  private startSensors(): void {
    // Set update intervals to 50 Hz
    const intervalMs = Math.round(1000 / SENSOR_HZ);
    setUpdateIntervalForType(SensorTypes.accelerometer, intervalMs);
    setUpdateIntervalForType(SensorTypes.gyroscope, intervalMs);
    setUpdateIntervalForType(SensorTypes.magnetometer, intervalMs);

    // Accelerometer
    const accSub = accelerometer.subscribe({
      next: ({ x, y, z, timestamp }) =>
        this.handleTelemetry('accelerometer', { x, y, z, timestamp }),
      error: (err) => console.warn('[TelemetryService] Accelerometer error:', err),
    });
    this.sensorSubscriptions.push({ unsubscribe: () => accSub.unsubscribe() });

    // Gyroscope
    const gyroSub = gyroscope.subscribe({
      next: ({ x, y, z, timestamp }) =>
        this.handleTelemetry('gyroscope', { x, y, z, timestamp }),
      error: (err) => console.warn('[TelemetryService] Gyroscope error:', err),
    });
    this.sensorSubscriptions.push({ unsubscribe: () => gyroSub.unsubscribe() });

    // Magnetometer
    const magSub = magnetometer.subscribe({
      next: ({ x, y, z, timestamp }) =>
        this.handleTelemetry('magnetometer', { x, y, z, timestamp }),
      error: (err) => console.warn('[TelemetryService] Magnetometer error:', err),
    });
    this.sensorSubscriptions.push({ unsubscribe: () => magSub.unsubscribe() });
  }

  private handleTelemetry(
    type: 'accelerometer' | 'gyroscope' | 'magnetometer',
    sample: TelemetrySample,
  ): void {
    if (!this.isRunning) return;
    this.engine.ingestTelemetry(type, sample);
    this.throttledBroadcast();
  }

  // ---- BLE ingestion ----
  private async startBLEScanLoop(): Promise<void> {
    await this.performBLEScan(); // initial scan

    this.bleScanTimer = setInterval(async () => {
      await this.performBLEScan();
    }, BLE_SCAN_INTERVAL_MS);
  }

  private stopBLEScanLoop(): void {
    if (this.bleScanTimer) {
      clearInterval(this.bleScanTimer);
      this.bleScanTimer = null;
    }
  }

  private async performBLEScan(): Promise<void> {
    if (this.isScanning) return;
    this.isScanning = true;

    try {
      // Stop any previous scan
      await this.bleManager.stopDeviceScan().catch(() => {});

      await this.bleManager.startDeviceScan(
        null, // scan all services
        { allowDuplicates: true },
        (error, device) => {
          if (error) {
            console.warn('[TelemetryService] BLE scan error:', error);
            return;
          }
          if (device) {
            this.handleBLEDiscovery(device);
          }
        },
      );

      // Scan for limited duration, then stop
      await new Promise((resolve) => setTimeout(resolve, BLE_SCAN_DURATION_MS));
    } catch (err) {
      console.error('[TelemetryService] BLE scan failed:', err);
    } finally {
      try { await this.bleManager.stopDeviceScan(); } catch {}
      this.isScanning = false;
    }
  }

  private handleBLEDiscovery(device: Device): void {
    if (!this.isRunning) return;

    const uuid = device.id; // MAC address or random ID
    const rssi = device.rssi;
    const txPower = device.txPowerLevel ?? undefined;

    if (rssi === null) return;

    this.engine.ingestBLEScan({
      uuid,
      rssi,
      txPower,
      timestamp: Date.now(),
    });

    this.throttledBroadcast();
  }

  // ---- Broadcasting ----
  private broadcastState(): void {
    if (!this.socket?.connected) return;

    const state = this.engine.getFusedState();
    // expected shape: { x, y, floor, heading }

    this.socket.emit('guard_location_update', {
      x: state.x,
      y: state.y,
      floor: state.floor,
      heading: state.heading,
      timestamp: Date.now(),
    });
  }
}

// Default singleton export
export default TelemetryService.getInstance();