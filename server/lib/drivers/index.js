/**
 * Lab Instrument Driver Registry
 * 
 * Central registry for all supported lab analyzer drivers.
 * Now supports 6 driver families with 12+ models.
 */

const { ZybioZ3Driver, ZYBIO_Z3_PARAMETER_MAPPINGS } = require('./zybio-z3-driver');
const { MindrayBC6800Driver, MINDRAY_BC6800_PARAMETER_MAPPINGS } = require('./mindray-bc6800-driver');
const { SysmexXN1000Driver, SYSMEX_XN_PARAMETER_MAPPINGS } = require('./sysmex-xn1000-driver');
const { BeckmanAUDriver, BECKMAN_AU_PARAMETER_MAPPINGS } = require('./beckman-au-driver');
const { RocheCobasDriver, ROCHE_COBAS_PARAMETER_MAPPINGS } = require('./roche-cobas-driver');
const { ErbaEMDriver, ERBA_EM_PARAMETER_MAPPINGS } = require('./erba-em-driver');

/**
 * Registry of all supported drivers
 */
const DRIVERS = {
    // === HEMATOLOGY ===
    
    // Zybio
    'zybio-z3': {
        class: ZybioZ3Driver,
        manufacturer: 'Zybio',
        model: 'Z3 / Z3 CRP HS',
        category: 'Hematology',
        protocol: 'HL7',
        protocolVersion: '2.3.1',
        differential: '3-part',
        parameters: ZYBIO_Z3_PARAMETER_MAPPINGS,
        defaultPort: 5000
    },
    
    // Mindray Hematology
    'mindray-bc6800': {
        class: MindrayBC6800Driver,
        manufacturer: 'Mindray',
        model: 'BC-6800',
        category: 'Hematology',
        protocol: 'HL7',
        protocolVersion: '2.5',
        differential: '5-part',
        parameters: MINDRAY_BC6800_PARAMETER_MAPPINGS,
        defaultPort: 5100
    },
    'mindray-bc5380': {
        class: MindrayBC6800Driver,
        manufacturer: 'Mindray',
        model: 'BC-5380',
        category: 'Hematology',
        protocol: 'HL7',
        protocolVersion: '2.5',
        differential: '5-part',
        parameters: MINDRAY_BC6800_PARAMETER_MAPPINGS,
        defaultPort: 5100
    },
    
    // Sysmex Hematology
    'sysmex-xn1000': {
        class: SysmexXN1000Driver,
        manufacturer: 'Sysmex',
        model: 'XN-1000',
        category: 'Hematology',
        protocol: 'ASTM',
        protocolVersion: 'E1394',
        differential: '6-part',
        parameters: SYSMEX_XN_PARAMETER_MAPPINGS,
        defaultPort: 5100
    },
    'sysmex-xn550': {
        class: SysmexXN1000Driver,
        manufacturer: 'Sysmex',
        model: 'XN-550',
        category: 'Hematology',
        protocol: 'ASTM',
        protocolVersion: 'E1394',
        differential: '6-part',
        parameters: SYSMEX_XN_PARAMETER_MAPPINGS,
        defaultPort: 5100
    },
    'sysmex-xp300': {
        class: SysmexXN1000Driver,
        manufacturer: 'Sysmex',
        model: 'XP-300',
        category: 'Hematology',
        protocol: 'ASTM',
        protocolVersion: 'E1394',
        differential: '3-part',
        parameters: SYSMEX_XN_PARAMETER_MAPPINGS,
        defaultPort: 5100
    },
    
    // === CHEMISTRY ===
    
    // Beckman Coulter Chemistry
    'beckman-au5800': {
        class: BeckmanAUDriver,
        manufacturer: 'Beckman Coulter',
        model: 'AU5800',
        category: 'Chemistry',
        protocol: 'HL7',
        protocolVersion: '2.5',
        parameters: BECKMAN_AU_PARAMETER_MAPPINGS,
        defaultPort: 5200
    },
    'beckman-au680': {
        class: BeckmanAUDriver,
        manufacturer: 'Beckman Coulter',
        model: 'AU680',
        category: 'Chemistry',
        protocol: 'HL7',
        protocolVersion: '2.5',
        parameters: BECKMAN_AU_PARAMETER_MAPPINGS,
        defaultPort: 5200
    },
    
    // Roche cobas
    'roche-cobas-c311': {
        class: RocheCobasDriver,
        manufacturer: 'Roche',
        model: 'cobas c311',
        category: 'Chemistry',
        protocol: 'ASTM',
        protocolVersion: 'E1394',
        parameters: ROCHE_COBAS_PARAMETER_MAPPINGS,
        defaultPort: 5100
    },
    'roche-cobas-c501': {
        class: RocheCobasDriver,
        manufacturer: 'Roche',
        model: 'cobas c501',
        category: 'Chemistry',
        protocol: 'ASTM',
        protocolVersion: 'E1394',
        parameters: ROCHE_COBAS_PARAMETER_MAPPINGS,
        defaultPort: 5100
    },
    'roche-cobas-e411': {
        class: RocheCobasDriver,
        manufacturer: 'Roche',
        model: 'cobas e411',
        category: 'Immunoassay',
        protocol: 'ASTM',
        protocolVersion: 'E1394',
        parameters: ROCHE_COBAS_PARAMETER_MAPPINGS,
        defaultPort: 5100
    },
    
    // Erba (popular in India)
    'erba-em360': {
        class: ErbaEMDriver,
        manufacturer: 'Erba',
        model: 'EM360',
        category: 'Chemistry',
        protocol: 'ASTM',
        protocolVersion: 'E1394',
        parameters: ERBA_EM_PARAMETER_MAPPINGS,
        defaultPort: 5100
    },
    'erba-em200': {
        class: ErbaEMDriver,
        manufacturer: 'Erba',
        model: 'EM200',
        category: 'Chemistry',
        protocol: 'ASTM',
        protocolVersion: 'E1394',
        parameters: ERBA_EM_PARAMETER_MAPPINGS,
        defaultPort: 5100
    },
    'erba-xl200': {
        class: ErbaEMDriver,
        manufacturer: 'Erba',
        model: 'XL-200',
        category: 'Chemistry',
        protocol: 'ASTM',
        protocolVersion: 'E1394',
        parameters: ERBA_EM_PARAMETER_MAPPINGS,
        defaultPort: 5100
    }
};

// Utility functions
function getAvailableDrivers() {
    return Object.entries(DRIVERS).map(([key, driver]) => ({
        id: key,
        manufacturer: driver.manufacturer,
        model: driver.model,
        category: driver.category,
        protocol: driver.protocol,
        protocolVersion: driver.protocolVersion,
        differential: driver.differential,
        defaultPort: driver.defaultPort,
        parameterCount: Object.keys(driver.parameters).length
    }));
}

function getDriver(driverId) {
    const driver = DRIVERS[driverId];
    if (!driver) throw new Error(`Unknown driver: ${driverId}`);
    return driver;
}

function createDriverInstance(driverId, config = {}) {
    const driver = getDriver(driverId);
    return new driver.class({ ...config, port: config.port || driver.defaultPort });
}

function getParameterMappings(driverId) {
    return getDriver(driverId).parameters;
}

function findDriver(manufacturer, model) {
    for (const [key, driver] of Object.entries(DRIVERS)) {
        if (driver.manufacturer.toLowerCase().includes(manufacturer.toLowerCase()) &&
            driver.model.toLowerCase().includes(model.toLowerCase())) {
            return { id: key, ...driver };
        }
    }
    return null;
}

function getDriversByManufacturer() {
    const grouped = {};
    for (const [key, driver] of Object.entries(DRIVERS)) {
        if (!grouped[driver.manufacturer]) grouped[driver.manufacturer] = [];
        grouped[driver.manufacturer].push({ id: key, model: driver.model, category: driver.category, protocol: driver.protocol });
    }
    return grouped;
}

function getDriversByProtocol(protocol) {
    return Object.entries(DRIVERS)
        .filter(([_, d]) => d.protocol.toUpperCase() === protocol.toUpperCase())
        .map(([key, d]) => ({ id: key, manufacturer: d.manufacturer, model: d.model }));
}

function getDriversByCategory(category) {
    return Object.entries(DRIVERS)
        .filter(([_, d]) => d.category.toLowerCase() === category.toLowerCase())
        .map(([key, d]) => ({ id: key, manufacturer: d.manufacturer, model: d.model, protocol: d.protocol }));
}

module.exports = {
    DRIVERS,
    getAvailableDrivers,
    getDriver,
    createDriverInstance,
    getParameterMappings,
    findDriver,
    getDriversByManufacturer,
    getDriversByProtocol,
    getDriversByCategory
};
