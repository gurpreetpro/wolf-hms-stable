const { Client } = require('pg');

const config = {
  user: 'postgres',
  host: '127.0.0.1',
  database: 'hospital_db_test',
  password: 'Hospital456!',
  port: 5433,
};

async function fixConstraints() {
  const client = new Client(config);
  try {
    await client.connect();
    console.log("Dropping users_role_check...");
    await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;');
    console.log("✅ Constraint dropped.");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

fixConstraints();
