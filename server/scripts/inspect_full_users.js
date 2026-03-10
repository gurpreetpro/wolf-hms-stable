const { Client } = require('pg');

const config = {
  user: 'postgres',
  host: '127.0.0.1',
  database: 'hospital_db_test',
  password: 'Hospital456!',
  port: 5433,
};

async function inspectFullUsers() {
  const client = new Client(config);
  try {
    await client.connect();
    // Get all columns
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);
    
    // Get constraints
    const conRes = await client.query(`
        SELECT conname, pg_get_constraintdef(c.oid)
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        JOIN pg_class cl ON cl.oid = c.conrelid
        WHERE cl.relname = 'users'; 
    `);

    const fs = require('fs');
    const output = {
        columns: res.rows,
        constraints: conRes.rows
    };
    fs.writeFileSync('schema_dump.json', JSON.stringify(output, null, 2));
    console.log("Dumped to schema_dump.json");

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

inspectFullUsers();
