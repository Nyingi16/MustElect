'use strict';
const bcrypt = require('bcryptjs');
require('dotenv').config();

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Only create the admin account - NO test data
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@MUST2024', 12);
    
    // Check if admin already exists
    const existingAdmin = await queryInterface.rawSelect(
      'users',
      { where: { email: process.env.ADMIN_EMAIL || 'mykienyingi@gmail.com' } },
      ['id']
    );
    
    if (!existingAdmin) {
      await queryInterface.insert(null, 'users', {
        registration_number: process.env.ADMIN_REGISTRATION_NUMBER || 'ADMIN001',
        email: process.env.ADMIN_EMAIL || 'mykienyingi@gmail.com',
        full_name: process.env.ADMIN_FULL_NAME || 'Dean of Students',
        password_hash: hashedPassword,
        role: 'dean',
        email_verified: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      console.log('✅ Admin account created:', process.env.ADMIN_EMAIL);
    } else {
      console.log('ℹ️ Admin account already exists');
    }
    
    // NO commissioner accounts created automatically
    // They must be added manually through the system
    console.log('ℹ️ No test data created. System ready for production use.');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', {
      email: process.env.ADMIN_EMAIL || 'mykienyingi@gmail.com'
    });
  }
};