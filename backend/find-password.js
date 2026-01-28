import pg from 'pg';
const { Client } = pg;

const passwords = ['postgres', '', 'admin', 'password', '123456', 'root'];

for (const pwd of passwords) {
  try {
    const client = new Client({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: pwd,
      database: 'postgres'
    });

    await client.connect();
    console.log(`✅ SUCCESS! Password is: "${pwd}"`);
    await client.end();
    process.exit(0);
  } catch (err) {
    console.log(`❌ Failed with password: "${pwd}"`);
  }
}

console.log('\n⚠️  None of the common passwords worked.');
console.log('Please provide your PostgreSQL password.');
