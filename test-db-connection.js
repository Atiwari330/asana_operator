// Test database connection
const postgres = require('postgres');

const connectionString = 'postgresql://postgres.gjuqvxgysngotryudspc:iamaKing6699@aws-1-us-east-1.pooler.supabase.com:5432/postgres';

async function testConnection() {
  console.log('🔍 Testing database connection...');
  console.log('   Connection URL:', connectionString.replace(/:[^@]+@/, ':****@'));

  try {
    const sql = postgres(connectionString);
    const result = await sql`SELECT NOW() as current_time, current_database() as db_name`;
    console.log('✅ Database connected successfully!');
    console.log('   Current time:', result[0].current_time);
    console.log('   Database name:', result[0].db_name);

    // Test if tables exist
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    console.log(`\n📊 Found ${tables.length} tables:`);
    tables.forEach(t => console.log(`   - ${t.table_name}`));

    // Check if users table has any data
    const userCount = await sql`SELECT COUNT(*) as count FROM users`;
    console.log(`\n👥 Users in database: ${userCount[0].count}`);

    // Check if projects table has any data
    const projectCount = await sql`SELECT COUNT(*) as count FROM projects`;
    console.log(`📁 Projects in database: ${projectCount[0].count}`);

    await sql.end();
    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('\nPossible issues:');
    console.error('1. Database is paused/sleeping (Supabase free tier pauses after 1 week of inactivity)');
    console.error('2. Connection string is incorrect');
    console.error('3. Network/firewall issues');
    console.error('\nFull error:', error);
  }
}

testConnection();