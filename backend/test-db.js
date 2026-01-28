import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

try {
  await client.connect();
  console.log('✅ Database connection successful!');
  const res = await client.query('SELECT version()');
  console.log('PostgreSQL version:', res.rows[0].version);
  await client.end();
} catch (err) {
  console.error('❌ Database connection failed:', err.message);
  console.error('Connection string:', process.env.DATABASE_URL);
  process.exit(1);
}
