/**
 * Serial Port Handler for Lab Instrument Communication
 * Handles RS232 connections using serialport library
 */

const EventEmitter = require('events');

// Note: serialport is optional - will gracefully degrade if not installed
let SerialPort, ReadlineParser;
try {
    SerialPort = require('serialport').SerialPort;
    ReadlineParser = require('@serialport/parser-readline').ReadlineParser;
} catch (e) {
    console.log('⚠️  serialport not installed. Serial communication disabled.');
    console.log('   Install with: npm install serialport @serialport/parser-readline');
}

const { parseASTMMessage, ASTM } = require('./astm-parser');

class SerialHandler extends EventEmitter {
    constructor(config = {}) {
        super();

        this.config = {
            path: config.path || 'COM1',
            baudRate: config.baudRate || 9600,
            dataBits: config.dataBits || 8,
            stopBits: config.stopBits || 1,
            parity: config.parity || 'none',
            autoOpen: false,
            ...config
        };

        this.port = null;
        this.parser = null;
        this.isConnected = false;
        this.buffer = '';
        this.instrumentId = config.instrumentId;
        this.protocol = config.protocol || 'ASTM_E1394';
    }

    /**
     * Open serial port connection
     */
    async connect() {
        if (!SerialPort) {
            throw new Error('serialport library not installed');
        }

        return new Promise((resolve, reject) => {
            try {
                this.port = new SerialPort(this.config);

                // Use readline parser for ASTM messages
                this.parser = this.port.pipe(new ReadlineParser({
                    delimiter: '\r\n',
                    includeDelimiter: false
                }));

                this.port.on('open', () => {
                    this.isConnected = true;
                    this.emit('connected', { path: this.config.path });
                    console.log(`✅ Serial port ${this.config.path} opened`);
                    resolve(true);
                });

                this.port.on('error', (error) => {
                    this.emit('error', error);
                    console.error(`❌ Serial error on ${this.config.path}:`, error.message);
                    reject(error);
                });

                this.port.on('close', () => {
                    this.isConnected = false;
                    this.emit('disconnected', { path: this.config.path });
                    console.log(`🔌 Serial port ${this.config.path} closed`);
                });

                // Handle incoming data
                this.parser.on('data', (data) => this.handleData(data));

                // Handle raw data for ASTM framing
                this.port.on('data', (rawData) => this.handleRawData(rawData));

                this.port.open();

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Handle raw data for ASTM protocol
     */
    handleRawData(rawData) {
        const dataStr = rawData.toString();

        // Check for ASTM control characters
        if (dataStr.includes(ASTM.ENQ)) {
            // Instrument wants to transmit - send ACK
            this.sendACK();
            this.emit('enq_received');
        }

        if (dataStr.includes(ASTM.EOT)) {
            // End of transmission - process buffered message
            if (this.buffer.length > 0) {
                this.processMessage(this.buffer);
                this.buffer = '';
            }
            this.emit('eot_received');
        }

        if (dataStr.includes(ASTM.STX)) {
            // Start of frame - begin buffering
            this.buffer = '';
        }

        // Buffer data between STX and ETX
        if (dataStr.includes(ASTM.ETX)) {
            this.buffer += dataStr.split(ASTM.ETX)[0];
            this.sendACK();
        } else {
            this.buffer += dataStr;
        }
    }

    /**
     * Handle parsed data
     */
    handleData(data) {
        this.emit('raw_data', data);

        // If not using ASTM framing, process directly
        if (!data.includes(ASTM.STX)) {
            this.processMessage(data);
        }
    }

    /**
     * Process complete message
     */
    processMessage(message) {
        try {
            const parsed = parseASTMMessage(message);

            this.emit('message', {
                instrumentId: this.instrumentId,
                raw: message,
                parsed: parsed,
                timestamp: new Date()
            });

            // Emit specific events for results
            if (parsed.results && parsed.results.length > 0) {
                this.emit('results', {
                    instrumentId: this.instrumentId,
                    results: parsed.results,
                    patient: parsed.patients[0] || null,
                    order: parsed.orders[0] || null
                });
            }

        } catch (error) {
            this.emit('parse_error', {
                instrumentId: this.instrumentId,
                raw: message,
                error: error.message
            });
        }
    }

    /**
     * Send ACK to instrument
     */
    sendACK() {
        if (this.port && this.isConnected) {
            this.port.write(ASTM.ACK);
            this.emit('ack_sent');
        }
    }

    /**
     * Send NAK to instrument
     */
    sendNAK() {
        if (this.port && this.isConnected) {
            this.port.write(ASTM.NAK);
            this.emit('nak_sent');
        }
    }

    /**
     * Send message to instrument
     */
    async send(message) {
        return new Promise((resolve, reject) => {
            if (!this.port || !this.isConnected) {
                return reject(new Error('Port not connected'));
            }

            this.port.write(message, (error) => {
                if (error) {
                    reject(error);
                } else {
                    this.port.drain((drainError) => {
                        if (drainError) {
                            reject(drainError);
                        } else {
                            resolve(true);
                        }
                    });
                }
            });
        });
    }

    /**
     * Send order to instrument
     */
    async sendOrder(orderData) {
        const { buildASTMMessage } = require('./astm-parser');
        const message = buildASTMMessage(orderData);

        // ASTM transmission sequence: ENQ -> wait ACK -> send frame -> wait ACK -> EOT
        await this.send(ASTM.ENQ);
        await this.waitFor('ack', 5000);
        await this.send(message);
        await this.waitFor('ack', 5000);
        await this.send(ASTM.EOT);

        return true;
    }

    /**
     * Wait for specific event with timeout
     */
    waitFor(event, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Timeout waiting for ${event}`));
            }, timeout);

            this.once(event, () => {
                clearTimeout(timer);
                resolve(true);
            });
        });
    }

    /**
     * Test connection
     */
    async testConnection() {
        try {
            await this.connect();
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.disconnect();
            return { success: true, message: 'Connection test successful' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Close serial port
     */
    async disconnect() {
        return new Promise((resolve) => {
            if (this.port && this.port.isOpen) {
                this.port.close(() => {
                    this.isConnected = false;
                    resolve(true);
                });
            } else {
                resolve(true);
            }
        });
    }

    /**
     * List available serial ports
     */
    static async listPorts() {
        if (!SerialPort) {
            return [];
        }

        try {
            const ports = await SerialPort.list();
            return ports.map(port => ({
                path: port.path,
                manufacturer: port.manufacturer || 'Unknown',
                serialNumber: port.serialNumber || '',
                vendorId: port.vendorId || '',
                productId: port.productId || ''
            }));
        } catch (error) {
            console.error('Error listing ports:', error);
            return [];
        }
    }
}

module.exports = { SerialHandler };
