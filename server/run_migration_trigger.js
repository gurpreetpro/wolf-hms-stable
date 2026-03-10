const https = require('https');

const url = 'https://wolf-hms-server-test-fdurncgganq-el.a.run.app/api/debug/migrate-tenants-v2';

https.get(url, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response Body:', data);
    });
}).on('error', (e) => {
    console.error('Problem with request:', e.message);
});
