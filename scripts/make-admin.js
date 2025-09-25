const { createClient } = require('@supabase/supabase-js');

// Make sure to set these environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function makeAdmin(email) {
  try {
    // Get user by email
    const { data: { users }, error: getUserError } = await supabase.auth.admin.listUsers();

    if (getUserError) {
      throw getUserError;
    }

    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      console.error(`User with email ${email} not found`);
      return;
    }

    // Insert or update user role
    const { error: upsertError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: user.id,
        role: 'admin'
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      throw upsertError;
    }

    console.log(`✅ Successfully granted admin access to ${email}`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error('Usage: node make-admin.js <email>');
  process.exit(1);
}

makeAdmin(email);