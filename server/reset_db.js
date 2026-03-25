const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres:Hospital456!@localhost:5432/postgres' });
async function drop() {
  await client.connect();
  console.log('Connected to postgres db');
  await client.query("UPDATE pg_database SET datallowconn = 'false' WHERE datname = 'hospital_db'");
  await client.query("SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'hospital_db' AND pid <> pg_backend_pid()");
  await client.query("DROP DATABASE IF EXISTS hospital_db");
  console.log('Dropped hospital_db');
  await client.query("CREATE DATABASE hospital_db");
  console.log('Recreated hospital_db');
}
drop().catch((e)=>console.error("DB Drop Error:", e)).finally(()=>client.end());
