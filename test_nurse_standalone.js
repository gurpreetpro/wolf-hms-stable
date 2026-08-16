const { recordConsumable } = require('./server/controllers/nurseController');
require('dotenv').config({ path: './server/.env' });

const req = {
    body: {
        admission_id: 9,
        consumable_id: 1,
        quantity: 2,
        notes: 'Test note'
    },
    user: {
        id: 18 // nurse user
    },
    hospital_id: 1
};

const res = {
    status: function(code) {
        console.log('res.status called with:', code);
        return this;
    },
    json: function(data) {
        console.log('res.json called with:', data);
        return this;
    }
};

async function test() {
    try {
        console.log('Calling recordConsumable...');
        await recordConsumable(req, res, (err) => {
            if (err) {
                console.error('💥 Next called with error:', err);
            }
        });
    } catch (e) {
        console.error('💥 Exception thrown:', e.message);
        console.error(e.stack);
    }
}

test();
