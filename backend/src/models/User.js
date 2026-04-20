// src/models/User.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  registration_number: {
    type: DataTypes.STRING(20),
    unique: true,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: false,
    validate: { isEmail: true }
  },
  full_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('student', 'candidate', 'commissioner', 'dean', 'admin'),
    defaultValue: 'student'
  },
  selected_role: {
    type: DataTypes.ENUM('student', 'dean', 'commissioner'),
    defaultValue: 'student'
  },
  wallet_address: {
    type: DataTypes.STRING(42),
    unique: true
  },
  email_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  profile_completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  profile_completed_at: {
    type: DataTypes.DATE
  },
  phone_number: {
    type: DataTypes.STRING(20)
  },
  bio: {
    type: DataTypes.TEXT
  },
  last_login: {
    type: DataTypes.DATE
  },
  refresh_token: {
    type: DataTypes.TEXT
  },
  verification_token: {
    type: DataTypes.STRING(255)
  },
  verification_token_expires: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password_hash) {
        user.password_hash = await bcrypt.hash(user.password_hash, parseInt(process.env.BCRYPT_ROUNDS) || 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password_hash')) {
        user.password_hash = await bcrypt.hash(user.password_hash, parseInt(process.env.BCRYPT_ROUNDS) || 12);
      }
    }
  }
});

User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password_hash);
};

User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password_hash;
  delete values.refresh_token;
  delete values.verification_token;
  return values;
};

module.exports = User;