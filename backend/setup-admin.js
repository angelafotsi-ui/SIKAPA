const { auth } = require('./config/firebase');

// Admin credentials
const ADMIN_EMAIL = 'fotsiemmanuel397@gmail.com';
const ADMIN_PASSWORD = 'Bulletman1234567890@';

async function createAdminUser() {
  try {
    console.log('[Setup] Creating admin user...');
    
    // Check if user already exists
    try {
      const existingUser = await auth.getUserByEmail(ADMIN_EMAIL);
      console.log('[Setup] Admin user already exists:', existingUser.uid);
      return;
    } catch (error) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    // Create the admin user
    const userRecord = await auth.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      displayName: 'Admin User'
    });

    console.log('[Setup] ✓ Admin user created successfully');
    console.log('[Setup] User UID:', userRecord.uid);
    console.log('[Setup] Email:', userRecord.email);
    console.log('\n[Setup] Admin credentials:');
    console.log('  Email:', ADMIN_EMAIL);
    console.log('  Password:', ADMIN_PASSWORD);
    console.log('\n[Setup] Use these to log in to the admin portal at /admin.html');

  } catch (error) {
    console.error('[Setup] Error creating admin user:', error.message);
    process.exit(1);
  }
}

createAdminUser().then(() => {
  console.log('[Setup] Complete');
  process.exit(0);
});
