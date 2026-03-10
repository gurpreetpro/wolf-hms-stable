/**
 * POS Index - Export all adapters
 */

module.exports = {
    BasePOSAdapter: require('./BasePOSAdapter'),
    POSServiceManager: require('./POSServiceManager'),
    adapters: {
        PineLabsAdapter: require('./adapters/PineLabsAdapter'),
        PaytmAdapter: require('./adapters/PaytmAdapter'),
        RazorpayPOSAdapter: require('./adapters/RazorpayPOSAdapter'),
        PhonePeAdapter: require('./adapters/PhonePeAdapter'),
        MswipeAdapter: require('./adapters/MswipeAdapter'),
        WorldlineAdapter: require('./adapters/WorldlineAdapter')
    }
};
