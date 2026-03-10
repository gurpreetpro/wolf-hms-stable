try {
    console.log('Checking pacuController...');
    require('../controllers/pacuController');
    console.log('✅ pacuController OK');

    console.log('Checking pacuRoutes...');
    require('../routes/pacuRoutes');
    console.log('✅ pacuRoutes OK');

    console.log('Checking settingsController...');
    require('../controllers/settingsController');
    console.log('✅ settingsController OK');

    console.log('Checking settingsRoutes...');
    require('../routes/settingsRoutes');
    console.log('✅ settingsRoutes OK');

    console.log('Checking deviceController...');
    require('../controllers/deviceController');
    console.log('✅ deviceController OK');

    console.log('Checking housekeepingController...');
    require('../controllers/housekeepingController');
    console.log('✅ housekeepingController OK');

    console.log('Checking dietaryController...');
    require('../controllers/dietaryController');
    console.log('✅ dietaryController OK');
    
    // Check server.js imports manually?
    console.log('Checking deviceRoutes...');
    require('../routes/deviceRoutes');
    console.log('✅ deviceRoutes OK');

    console.log('Checking server.js (parsing only)...');

    // We won't require server.js because it starts the server. 
    // We just trust the specific modules first.
} catch (err) {
    console.error('❌ SYNTAX ERROR:', err);
}
