/**
 * TCP/IP Socket Listener for Lab Instrument Communication
 * Handles network-based instrument connections (HL7/ASTM over TCP)
 */

const net = require('net');
const EventEmitter = require('events');
const { parseHL7Message, unwrapMLLP, buildACKMessage, HL7 } = require('./hl7-parser');
const { parseASTMMessage, ASTM } = require('./astm-parser');

class TCPListener extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            port: config.port || 5000,
            host: config.host || '0.0.0.0',
            protocol: config.protocol || 'HL7_V2', // 'HL7_V2' or 'ASTM_E1394'
            timeout: config.timeout || 30000,
            maxConnections: config.maxConnections || 10,
            ...config
        };
        
        this.server = null;
        this.clients = new Map();
        this.isRunning = false;
        this.instrumentId = config.instrumentId;
    }

    /**
     * Start TCP server
     */
    async start() {
        return new Promise((resolve, reject) => {
            this.server = net.createServer((socket) => this.handleConnection(socket));

            this.server.on('error', (error) => {
                this.emit('error', error);
                if (error.code === 'EADDRINUSE') {
                    reject(new Error(`Port ${this.config.port} is already in use`));
                } else {
                    reject(error);
                }
            });

            this.server.on('listening', () => {
                this.isRunning = true;
                console.log(`✅ TCP listener started on ${this.config.host}:${this.config.port}`);
                this.emit('listening', { port: this.config.port, host: this.config.host });
                resolve(true);
            });

            this.server.maxConnections = this.config.maxConnections;
            this.server.listen(this.config.port, this.config.host);
        });
    }

    /**
     * Handle new client connection
     */
    handleConnection(socket) {
        const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
        console.log(`🔌 New connection from ${clientId}`);
        
        this.clients.set(clientId, socket);
        this.emit('client_connected', { clientId, address: socket.remoteAddress });

        // Set socket timeout
        socket.setTimeout(this.config.timeout);

        // Buffer for accumulating data
        let buffer = '';

        socket.on('data', (data) => {
            buffer += data.toString();
            
            // Process complete messages based on protocol
            if (this.config.protocol === 'HL7_V2') {
                // Check for MLLP end marker
                while (buffer.includes(HL7.MLLP_END)) {
                    const endIndex = buffer.indexOf(HL7.MLLP_END);
                    const message = buffer.substring(0, endIndex + 1);
                    buffer = buffer.substring(endIndex + 2); // Skip MLLP_END + CR
                    
                    this.processHL7Message(message, socket, clientId);
                }
            } else if (this.config.protocol === 'ASTM_E1394') {
                // Check for ASTM EOT
                if (buffer.includes(ASTM.EOT)) {
                    const message = buffer.split(ASTM.EOT)[0];
                    buffer = '';
                    this.processASTMMessage(message, socket, clientId);
                }
                
                // Handle ASTM handshaking
                if (buffer.includes(ASTM.ENQ)) {
                    socket.write(ASTM.ACK);
                    buffer = buffer.replace(ASTM.ENQ, '');
                }
            }
        });

        socket.on('close', () => {
            console.log(`🔌 Connection closed: ${clientId}`);
            this.clients.delete(clientId);
            this.emit('client_disconnected', { clientId });
        });

        socket.on('error', (error) => {
            console.error(`❌ Socket error from ${clientId}:`, error.message);
            this.emit('client_error', { clientId, error: error.message });
        });

        socket.on('timeout', () => {
            console.log(`⏰ Socket timeout: ${clientId}`);
            socket.end();
        });
    }

    /**
     * Process HL7 message
     */
    processHL7Message(rawMessage, socket, clientId) {
        try {
            const message = unwrapMLLP(rawMessage);
            const parsed = parseHL7Message(message);
            
            console.log(`📨 HL7 message received from ${clientId}: ${parsed.messageType}^${parsed.triggerEvent}`);
            
            this.emit('message', {
                instrumentId: this.instrumentId,
                clientId,
                protocol: 'HL7_V2',
                messageType: `${parsed.messageType}^${parsed.triggerEvent}`,
                raw: message,
                parsed,
                timestamp: new Date()
            });

            // Send ACK
            if (parsed.msh) {
                const ack = buildACKMessage(parsed.msh, 'AA');
                socket.write(ack);
                this.emit('ack_sent', { clientId, messageControlId: parsed.msh.messageControlId });
            }

            // Emit results if ORU message
            if (parsed.messageType === 'ORU' && parsed.obx.length > 0) {
                this.emit('results', {
                    instrumentId: this.instrumentId,
                    clientId,
                    results: parsed.obx.map(obx => ({
                        testCode: obx.observationIdentifier?.identifier || '',
                        testName: obx.observationIdentifier?.text || '',
                        value: obx.observationValue,
                        units: Array.isArray(obx.units) ? obx.units[0] : obx.units,
                        refRange: obx.referenceRange,
                        flag: obx.abnormalFlags,
                        status: obx.observationResultStatus
                    })),
                    patient: parsed.pid ? {
                        patientId: Array.isArray(parsed.pid.patientIdInternal) 
                            ? parsed.pid.patientIdInternal[0] 
                            : parsed.pid.patientIdInternal,
                        name: parsed.pid.patientName,
                        dob: parsed.pid.dateOfBirth,
                        sex: parsed.pid.sex
                    } : null,
                    order: parsed.obr[0] || null
                });
            }

        } catch (error) {
            console.error(`❌ HL7 parse error from ${clientId}:`, error.message);
            this.emit('parse_error', {
                instrumentId: this.instrumentId,
                clientId,
                raw: rawMessage,
                error: error.message
            });
            
            // Send NAK
            socket.write(buildACKMessage({}, 'AR', error.message));
        }
    }

    /**
     * Process ASTM message
     */
    processASTMMessage(rawMessage, socket, clientId) {
        try {
            const parsed = parseASTMMessage(rawMessage);
            
            console.log(`📨 ASTM message received from ${clientId}`);
            
            this.emit('message', {
                instrumentId: this.instrumentId,
                clientId,
                protocol: 'ASTM_E1394',
                raw: rawMessage,
                parsed,
                timestamp: new Date()
            });

            // Send ACK
            socket.write(ASTM.ACK);

            // Emit results
            if (parsed.results && parsed.results.length > 0) {
                this.emit('results', {
                    instrumentId: this.instrumentId,
                    clientId,
                    results: parsed.results.map(r => ({
                        testCode: r.testCode,
                        testName: r.testName,
                        value: Array.isArray(r.value) ? r.value[0] : r.value,
                        units: r.units,
                        refRange: r.referenceRange,
                        flag: r.abnormalFlag,
                        status: r.resultStatus
                    })),
                    patient: parsed.patients[0] || null,
                    order: parsed.orders[0] || null
                });
            }

        } catch (error) {
            console.error(`❌ ASTM parse error from ${clientId}:`, error.message);
            this.emit('parse_error', {
                instrumentId: this.instrumentId,
                clientId,
                raw: rawMessage,
                error: error.message
            });
            
            socket.write(ASTM.NAK);
        }
    }

    /**
     * Send message to specific client
     */
    async sendToClient(clientId, message) {
        const socket = this.clients.get(clientId);
        if (!socket) {
            throw new Error(`Client ${clientId} not found`);
        }

        return new Promise((resolve, reject) => {
            socket.write(message, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(true);
                }
            });
        });
    }

    /**
     * Broadcast message to all clients
     */
    async broadcast(message) {
        const promises = [];
        for (const [clientId, socket] of this.clients) {
            promises.push(
                new Promise((resolve) => {
                    socket.write(message, () => resolve(clientId));
                })
            );
        }
        return Promise.all(promises);
    }

    /**
     * Get connected clients
     */
    getClients() {
        return Array.from(this.clients.keys());
    }

    /**
     * Test if port is available
     */
    static async testPort(port, host = '127.0.0.1') {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            
            socket.setTimeout(2000);
            
            socket.on('connect', () => {
                socket.destroy();
                resolve({ available: false, message: 'Port is in use' });
            });
            
            socket.on('timeout', () => {
                socket.destroy();
                resolve({ available: true, message: 'Port is available' });
            });
            
            socket.on('error', (error) => {
                socket.destroy();
                if (error.code === 'ECONNREFUSED') {
                    resolve({ available: true, message: 'Port is available' });
                } else {
                    resolve({ available: false, message: error.message });
                }
            });
            
            socket.connect(port, host);
        });
    }

    /**
     * Stop TCP server
     */
    async stop() {
        return new Promise((resolve) => {
            // Close all client connections
            for (const [clientId, socket] of this.clients) {
                socket.destroy();
            }
            this.clients.clear();

            if (this.server) {
                this.server.close(() => {
                    this.isRunning = false;
                    console.log(`🛑 TCP listener stopped on port ${this.config.port}`);
                    resolve(true);
                });
            } else {
                resolve(true);
            }
        });
    }
}

/**
 * TCP Client for connecting to instruments
 */
class TCPClient extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            host: config.host || 'localhost',
            port: config.port || 5000,
            protocol: config.protocol || 'HL7_V2',
            timeout: config.timeout || 10000,
            reconnectInterval: config.reconnectInterval || 5000,
            autoReconnect: config.autoReconnect !== false,
            ...config
        };
        
        this.socket = null;
        this.isConnected = false;
        this.instrumentId = config.instrumentId;
        this.buffer = '';
    }

    /**
     * Connect to instrument
     */
    async connect() {
        return new Promise((resolve, reject) => {
            this.socket = new net.Socket();
            
            this.socket.setTimeout(this.config.timeout);
            
            this.socket.on('connect', () => {
                this.isConnected = true;
                console.log(`✅ Connected to ${this.config.host}:${this.config.port}`);
                this.emit('connected', { host: this.config.host, port: this.config.port });
                resolve(true);
            });
            
            this.socket.on('data', (data) => {
                this.handleData(data);
            });
            
            this.socket.on('close', () => {
                this.isConnected = false;
                this.emit('disconnected');
                
                if (this.config.autoReconnect) {
                    setTimeout(() => this.connect().catch(() => {}), this.config.reconnectInterval);
                }
            });
            
            this.socket.on('error', (error) => {
                this.emit('error', error);
                reject(error);
            });
            
            this.socket.connect(this.config.port, this.config.host);
        });
    }

    /**
     * Handle incoming data
     */
    handleData(data) {
        this.buffer += data.toString();
        
        // Process based on protocol
        if (this.config.protocol === 'HL7_V2' && this.buffer.includes(HL7.MLLP_END)) {
            const message = unwrapMLLP(this.buffer);
            this.buffer = '';
            
            try {
                const parsed = parseHL7Message(message);
                this.emit('message', { raw: message, parsed });
            } catch (error) {
                this.emit('parse_error', { raw: message, error: error.message });
            }
        }
    }

    /**
     * Send message
     */
    async send(message) {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.isConnected) {
                return reject(new Error('Not connected'));
            }
            
            this.socket.write(message, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(true);
                }
            });
        });
    }

    /**
     * Disconnect
     */
    async disconnect() {
        this.config.autoReconnect = false;
        return new Promise((resolve) => {
            if (this.socket) {
                this.socket.destroy();
            }
            this.isConnected = false;
            resolve(true);
        });
    }
}

module.exports = { TCPListener, TCPClient };
