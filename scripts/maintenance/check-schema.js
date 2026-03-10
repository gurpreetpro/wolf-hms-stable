const axios = require('axios');
async function q() {
    const r = await axios.post('https://wolfhms-fdurncganq-el.a.run.app/api/health/exec-sql', {
        sql: "SELECT column_name FROM information_schema.columns WHERE table_name = 'equipment_types'",
        setupKey: 'WolfSetup2024!'
    });
    console.log(JSON.stringify(r.data.rows, null, 2));
}
q();
