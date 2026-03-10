const { Client } = require('pg');

const config = {
  user: 'postgres',
  host: '127.0.0.1',
  database: 'hospital_db_test',
  password: 'Hospital456!',
  port: 5433,
};

async function inspectUsers() {
  const client = new Client(config);
  try {
    await client.connect();
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);
    console.log("Users Table Columns:", res.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

inspectUsers();
