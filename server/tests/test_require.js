// Test which module is failing
try {
    console.log('Testing requires...');

    require('./routes/appointmentRoutes');
    console.log('✅ appointmentRoutes OK');

    require('./controllers/appointmentController');
    console.log('✅ appointmentController OK');

    console.log('\n✅ All appointment modules load successfully!');
} catch (err) {
    console.log('❌ Module Error:', err.message);
    console.log('Stack:', err.stack);
}
