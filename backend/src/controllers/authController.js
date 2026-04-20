// src/controllers/authController.js
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const User = require('../models/User');
const Student = require('../models/Student');
const DeanApplication = require('../models/DeanApplication');
const CommissionerApplication = require('../models/CommissionerApplication');
const AuditLog = require('../models/AuditLog');
const emailService = require('../services/emailService');
const { validateRegistration, validateLogin } = require('../utils/validators');

// Store OTPs temporarily (for non-auto-verified emails)
const otpStore = new Map();

// Generate JWT tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { 
      id: user.id, 
      registration_number: user.registration_number, 
      role: user.role,
      wallet_address: user.wallet_address 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
  
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET || 'refresh-secret',
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ============ REGISTRATION ============
exports.register = async (req, res) => {
  try {
    const { error } = validateRegistration(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const { 
      registration_number, 
      email, 
      password, 
      full_name, 
      selected_role,
      department, 
      year_of_study,
      justification,
      qualifications,
      experience
    } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ registration_number }, { email }]
      }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this registration number or email' });
    }
    
    // Check if this is the first user (no admin exists)
    const adminExists = await User.findOne({ where: { role: 'admin' } });
    const isFirstUser = !adminExists;
    
    // Determine final role
    let finalRole = 'student';
    if (isFirstUser) {
      finalRole = 'admin';
    } else if (selected_role === 'dean' || selected_role === 'commissioner') {
      finalRole = 'student'; // Temporarily student until approved
    } else {
      finalRole = 'student';
    }
    
    // Create user
    const user = await User.create({
      registration_number,
      email,
      password_hash: password,
      full_name,
      role: finalRole,
      selected_role: isFirstUser ? 'student' : selected_role,
      verification_token: uuidv4(),
      verification_token_expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      email_verified: false,
      profile_completed: false
    });
    
    // Create student profile (for all non-admin users)
    if (finalRole !== 'admin') {
      await Student.create({
        user_id: user.id,
        department: selected_role === 'student' ? department : null,
        year_of_study: selected_role === 'student' ? (year_of_study ? parseInt(year_of_study) : null) : null,
        registration_status: 'pending',
        voter_token: uuidv4()
      });
    }
    
    // Create role application for Dean or Commissioner (only if not first user)
    if (selected_role === 'dean' && !isFirstUser) {
      await DeanApplication.create({
        user_id: user.id,
        justification: justification || 'Application submitted for Dean position',
        qualifications: qualifications || 'To be provided',
        experience: experience || 'To be provided',
        status: 'pending'
      });
      console.log(`📋 Dean application created for ${email} - awaiting admin approval`);
    }
    
    if (selected_role === 'commissioner' && !isFirstUser) {
      await CommissionerApplication.create({
        user_id: user.id,
        justification: justification || 'Application submitted for Commissioner position',
        qualifications: qualifications || 'To be provided',
        experience: experience || 'To be provided',
        status: 'pending'
      });
      console.log(`📋 Commissioner application created for ${email} - awaiting admin approval`);
    }
    
    // Generate OTP for verification - ALWAYS generate for all users
    const otp = generateOTP();
    otpStore.set(email, { 
      otp, 
      expiresAt: Date.now() + 10 * 60 * 1000, 
      attempts: 0 
    });
    
    // Log registration details
    console.log(`
╔══════════════════════════════════════════════════════════╗
║ 📋 NEW REGISTRATION                                       ║
╠══════════════════════════════════════════════════════════╣
║ Name: ${full_name}
║ Email: ${email}
║ Reg Number: ${registration_number}
║ Selected Role: ${selected_role.toUpperCase()}
║ Final Role: ${finalRole.toUpperCase()}
║ OTP: ${otp}
║ ${isFirstUser ? '🏆 FIRST USER - ADMIN ACCOUNT CREATED 🏆' : ''}
║ ${!isFirstUser && selected_role !== 'student' ? '📋 Role application submitted - awaiting admin approval' : ''}
╚══════════════════════════════════════════════════════════╝
    `);
    
    // Send OTP email (async)
    emailService.sendOTPEmail(email, otp).catch(console.error);
    
    // Log audit
    await AuditLog.create({
      user_id: user.id,
      action: 'REGISTER',
      details: { 
        registration_number, 
        email, 
        selected_role,
        final_role: finalRole,
        is_first_user: isFirstUser,
        requires_approval: !isFirstUser && selected_role !== 'student'
      },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    // Prepare response message
    let message = '';
    if (isFirstUser) {
      message = '🏆 First account created! You are now the System Administrator. Please verify your email to continue.';
    } else if (selected_role !== 'student') {
      message = 'Registration successful! Your role application has been submitted for admin approval. Please verify your email to continue. You will be notified once your role is approved.';
    } else {
      message = 'Registration successful. Please verify your email to continue.';
    }
    
    res.status(201).json({
      message: message,
      user: {
        id: user.id,
        registration_number: user.registration_number,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        selected_role: user.selected_role,
        email_verified: user.email_verified,
        profile_completed: user.profile_completed
      },
      requires_otp: true,
      email: email,
      is_first_user: isFirstUser,
      requires_approval: !isFirstUser && selected_role !== 'student'
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed: ' + error.message });
  }
};

// ============ VERIFY OTP ============
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    // Check if auto-verify is enabled for student domain
    const isStudentDomain = email.endsWith(process.env.STUDENT_EMAIL_DOMAIN || 'students.must.ac.ke');
    const autoVerifyEnabled = process.env.AUTO_VERIFY_EMAILS === 'true';
    
    // Auto-verify student domain emails if enabled
    if (autoVerifyEnabled && isStudentDomain) {
      const user = await User.findOne({ where: { email } });
      if (user && !user.email_verified) {
        await user.update({ email_verified: true });
        console.log(`✅ Auto-verified student email: ${email}`);
        
        // Check if profile needs to be completed
        const needsProfileCompletion = !user.profile_completed;
        
        return res.json({ 
          message: 'Email verified automatically!',
          auto_verified: true,
          needs_profile_completion: needsProfileCompletion,
          user_id: user.id,
          role: user.selected_role || 'student'
        });
      }
    }
    
    // Regular OTP verification for non-auto-verified emails
    const record = otpStore.get(email);
    
    if (!record) {
      return res.status(400).json({ error: 'OTP not found or expired. Please request a new OTP.' });
    }
    
    if (record.attempts >= 3) {
      otpStore.delete(email);
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new OTP.' });
    }
    
    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ error: 'OTP expired. Please request a new OTP.' });
    }
    
    if (record.otp !== otp) {
      record.attempts++;
      return res.status(400).json({ error: `Invalid OTP. ${3 - record.attempts} attempts remaining.` });
    }
    
    // Update user as verified
    const user = await User.findOne({ where: { email } });
    if (user) {
      await user.update({ 
        email_verified: true,
        verification_token: null,
        verification_token_expires: null
      });
    }
    
    otpStore.delete(email);
    
    // Check if profile needs to be completed
    const needsProfileCompletion = user && !user.profile_completed;
    
    res.json({ 
      message: 'Email verified successfully!',
      needs_profile_completion: needsProfileCompletion,
      user_id: user?.id,
      role: user?.selected_role || 'student'
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Verification failed' });
  }
};

// ============ RESEND OTP ============
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.email_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }
    
    // Auto-verify student domain emails without resending
    const isStudentDomain = email.endsWith(process.env.STUDENT_EMAIL_DOMAIN || 'students.must.ac.ke');
    const autoVerifyEnabled = process.env.AUTO_VERIFY_EMAILS === 'true';
    
    if (autoVerifyEnabled && isStudentDomain) {
      await user.update({ email_verified: true });
      return res.json({ 
        message: 'Email auto-verified! You can now login.',
        auto_verified: true
      });
    }
    
    const otp = generateOTP();
    otpStore.set(email, { 
      otp, 
      expiresAt: Date.now() + 10 * 60 * 1000, 
      attempts: 0 
    });
    
    // Log OTP to console
    console.log(`📧 Resent OTP for ${email}: ${otp}`);
    
    await emailService.sendOTPEmail(email, otp);
    
    res.json({ message: 'New OTP sent to your email' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to resend OTP' });
  }
};

// ============ COMPLETE PROFILE ============
exports.completeProfile = async (req, res) => {
  try {
    const { 
      user_id, 
      phone_number, 
      department, 
      year_of_study, 
      bio,
      justification,
      qualifications,
      experience
    } = req.body;
    
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.profile_completed) {
      return res.status(400).json({ error: 'Profile already completed' });
    }
    
    // Update user profile
    await user.update({
      phone_number,
      bio: bio || null,
      profile_completed: true,
      profile_completed_at: new Date()
    });
    
    // Handle role-specific profile updates
    if (user.selected_role === 'student' && user.role === 'student') {
      const student = await Student.findOne({ where: { user_id: user.id } });
      if (student) {
        await student.update({
          department: department,
          year_of_study: parseInt(year_of_study)
        });
      }
    }
    
    // For users who applied for dean/commissioner, update their applications with additional info
    if (user.selected_role === 'dean') {
      const application = await DeanApplication.findOne({ 
        where: { user_id: user.id, status: 'pending' }
      });
      if (application) {
        await application.update({
          justification: justification || application.justification,
          qualifications: qualifications,
          experience: experience
        });
      }
    }
    
    if (user.selected_role === 'commissioner') {
      const application = await CommissionerApplication.findOne({ 
        where: { user_id: user.id, status: 'pending' }
      });
      if (application) {
        await application.update({
          justification: justification || application.justification,
          qualifications: qualifications,
          experience: experience
        });
      }
    }
    
    await AuditLog.create({
      user_id: user.id,
      action: 'COMPLETE_PROFILE',
      details: { 
        phone_number, 
        department, 
        year_of_study,
        selected_role: user.selected_role 
      },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    res.json({ 
      message: 'Profile completed successfully! You can now login.',
      user: user.toJSON(),
      requires_approval: user.selected_role !== 'student' && user.role === 'student'
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to complete profile: ' + error.message });
  }
};

// ============ LOGIN ============
// src/controllers/authController.js - Update the login function

// ============ LOGIN ============
exports.login = async (req, res) => {
  try {
    const { error } = validateLogin(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const { identifier, password } = req.body;
    
    // Check if identifier is email or registration number
    const isEmail = identifier.includes('@') && identifier.includes('.');
    
    let user;
    if (isEmail) {
      user = await User.findOne({
        where: { email: identifier.toLowerCase() }
      });
    } else {
      user = await User.findOne({
        where: { registration_number: identifier.toUpperCase() }
      });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      await AuditLog.create({
        user_id: user.id,
        action: 'LOGIN_FAILED',
        details: { identifier, reason: 'Invalid password' },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        status: 'failed'
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if email is verified
    if (!user.email_verified) {
      // Generate new OTP for unverified user
      const otp = generateOTP();
      otpStore.set(user.email, { 
        otp, 
        expiresAt: Date.now() + 10 * 60 * 1000, 
        attempts: 0 
      });
      
      // Log OTP to console
      console.log(`
╔══════════════════════════════════════════════════════════╗
║ 📧 OTP FOR UNVERIFIED LOGIN                               ║
╠══════════════════════════════════════════════════════════╣
║ Email: ${user.email}
║ OTP: ${otp}
╚══════════════════════════════════════════════════════════╝
      `);
      
      // Send OTP email
      await emailService.sendOTPEmail(user.email, otp).catch(console.error);
      
      return res.status(401).json({ 
        error: 'Please verify your email first. A new OTP has been sent to your email.',
        needs_verification: true,
        email: user.email,
        user_id: user.id
      });
    }
    
    // Check if profile is completed
    if (!user.profile_completed) {
      return res.status(401).json({ 
        error: 'Please complete your profile first.',
        needs_profile_completion: true,
        user_id: user.id,
        role: user.selected_role
      });
    }
    
    if (!user.is_active) {
      return res.status(401).json({ error: 'Your account has been deactivated. Contact administrator.' });
    }
    
    // Update last login
    await user.update({ last_login: new Date() });
    
    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);
    await user.update({ refresh_token: refreshToken });
    
    // Determine redirect URL based on role
    let redirectUrl = '/dashboard/student';
    if (user.role === 'candidate') redirectUrl = '/dashboard/candidate';
    if (user.role === 'commissioner') redirectUrl = '/dashboard/commissioner';
    if (user.role === 'dean') redirectUrl = '/dashboard/dean';
    if (user.role === 'admin') redirectUrl = '/dashboard/admin';
    
    await AuditLog.create({
      user_id: user.id,
      action: 'LOGIN',
      details: { identifier, role: user.role },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: user.toJSON(),
      redirectUrl
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
};
// ============ CONNECT WALLET ============
exports.connectWallet = async (req, res) => {
  try {
    const { wallet_address, signature } = req.body;
    const userId = req.user.id;
    
    if (!wallet_address || !wallet_address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }
    
    const existingWallet = await User.findOne({
      where: { wallet_address }
    });
    
    if (existingWallet && existingWallet.id !== userId) {
      return res.status(400).json({ error: 'Wallet already linked to another account' });
    }
    
    const user = await User.findByPk(userId);
    await user.update({ wallet_address });
    
    const student = await Student.findOne({ where: { user_id: userId } });
    if (student) {
      await student.update({ voter_token: uuidv4() });
    }
    
    const { accessToken, refreshToken } = generateTokens(user);
    await user.update({ refresh_token: refreshToken });
    
    await AuditLog.create({
      user_id: userId,
      action: 'LINK_WALLET',
      details: { wallet_address },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    res.json({
      message: 'Wallet linked successfully',
      accessToken,
      refreshToken,
      wallet_address
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Wallet linking failed' });
  }
};

// ============ LOGOUT ============
exports.logout = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    await user.update({ refresh_token: null });
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'LOGOUT',
      details: {},
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    res.json({ message: 'Logged out successfully' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

// ============ REFRESH TOKEN ============
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }
    
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh-secret');
    const user = await User.findByPk(decoded.id);
    
    if (!user || user.refresh_token !== refreshToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    await user.update({ refresh_token: newRefreshToken });
    
    res.json({
      accessToken,
      refreshToken: newRefreshToken
    });
    
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

// ============ GET CURRENT USER ============
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const student = await Student.findOne({ where: { user_id: req.user.id } });
    
    const userData = user.toJSON();
    if (student) {
      userData.student = {
        department: student.department,
        year_of_study: student.year_of_study,
        registration_status: student.registration_status,
        has_voted: student.has_voted
      };
    }
    
    res.json({ user: userData });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};

// ============ UPDATE PROFILE ============
exports.updateProfile = async (req, res) => {
  try {
    const { full_name, department, year_of_study } = req.body;
    const userId = req.user.id;
    
    if (full_name) {
      await User.update({ full_name }, { where: { id: userId } });
    }
    
    if (department || year_of_study) {
      await Student.update(
        { department, year_of_study },
        { where: { user_id: userId } }
      );
    }
    
    await AuditLog.create({
      user_id: userId,
      action: 'UPDATE_PROFILE',
      details: { full_name, department, year_of_study },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    res.json({ message: 'Profile updated successfully' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Profile update failed' });
  }
};

// ============ CHANGE PASSWORD ============
exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await User.findByPk(req.user.id);
    
    const isValid = await user.comparePassword(current_password);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    await user.update({ password_hash: new_password });
    
    await AuditLog.create({
      user_id: user.id,
      action: 'CHANGE_PASSWORD',
      details: { success: true },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    res.json({ message: 'Password changed successfully' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Password change failed' });
  }
};

// ============ FORGOT PASSWORD ============
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      return res.json({ message: 'If an account exists with that email, you will receive a reset link.' });
    }
    
    const resetToken = uuidv4();
    await user.update({
      verification_token: resetToken,
      verification_token_expires: new Date(Date.now() + 1 * 60 * 60 * 1000)
    });
    
    console.log(`Password reset token for ${email}: ${resetToken}`);
    
    res.json({ message: 'Password reset link sent to your email' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process request' });
  }
};

// ============ RESET PASSWORD ============
exports.resetPassword = async (req, res) => {
  try {
    const { token, new_password } = req.body;
    
    const user = await User.findOne({
      where: {
        verification_token: token,
        verification_token_expires: { [Op.gt]: new Date() }
      }
    });
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    await user.update({
      password_hash: new_password,
      verification_token: null,
      verification_token_expires: null
    });
    
    await AuditLog.create({
      user_id: user.id,
      action: 'RESET_PASSWORD',
      details: { success: true },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    res.json({ message: 'Password reset successfully' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Password reset failed' });
  }
};

// ============ CHECK EMAIL STATUS ============
exports.checkEmailStatus = async (req, res) => {
  try {
    const { email } = req.query;
    
    const isStudentDomain = email?.endsWith(process.env.STUDENT_EMAIL_DOMAIN || 'students.must.ac.ke');
    const autoVerifyEnabled = process.env.AUTO_VERIFY_EMAILS === 'true';
    
    res.json({
      email,
      is_student_domain: isStudentDomain || false,
      auto_verify_enabled: autoVerifyEnabled,
      will_auto_verify: autoVerifyEnabled && isStudentDomain,
      student_domain: process.env.STUDENT_EMAIL_DOMAIN || 'students.must.ac.ke'
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to check email status' });
  }
};

// ============ TEST EMAIL ============
exports.testEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Test endpoint disabled in production' });
    }
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const otp = generateOTP();
    const result = await emailService.sendOTPEmail(email, otp);
    
    res.json({
      message: 'Test email sent',
      result,
      email,
      otp: process.env.DEV_MODE === 'true' ? otp : undefined
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send test email: ' + error.message });
  }
};