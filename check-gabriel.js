// Check if Gabriel is in the database
const postgres = require('postgres');

const connectionString = 'postgresql://postgres.gjuqvxgysngotryudspc:iamaKing6699@aws-1-us-east-1.pooler.supabase.com:5432/postgres';

async function checkGabriel() {
  const sql = postgres(connectionString);

  console.log('🔍 Searching for Gabriel in database...\n');

  // Search by email
  const byEmail = await sql`
    SELECT id, name, email
    FROM users
    WHERE email = 'dlacap@opusbehavioral.com'
  `;

  if (byEmail.length > 0) {
    console.log('✅ Found Gabriel by email:');
    console.log('   ID:', byEmail[0].id);
    console.log('   Name:', byEmail[0].name);
    console.log('   Email:', byEmail[0].email);
  } else {
    console.log('❌ Gabriel not found by email (dlacap@opusbehavioral.com)');
  }

  // Search by name pattern
  console.log('\n📋 Searching for similar names...');
  const byName = await sql`
    SELECT id, name, email
    FROM users
    WHERE LOWER(name) LIKE '%gabriel%'
       OR LOWER(name) LIKE '%dlacap%'
       OR email LIKE '%dlacap%'
    LIMIT 10
  `;

  if (byName.length > 0) {
    console.log(`Found ${byName.length} users with similar names:`);
    byName.forEach(user => {
      console.log(`   - ${user.name} (${user.email || 'no email'})`);
    });
  }

  await sql.end();
}

checkGabriel();