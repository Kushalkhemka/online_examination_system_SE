const bcrypt = require('bcryptjs');
const { supabase } = require('../config/database');

/**
 * Register new user
 */
const register = async (req, res, next) => {
  try {
    const { email, password, first_name, last_name, role, student_id, employee_id, department } = req.body;

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email,
        password_hash,
        first_name,
        last_name,
        role
      })
      .select()
      .single();

    if (userError) throw userError;

    // Create role-specific record
    if (role === 'student' && student_id) {
      await supabase.from('students').insert({
        user_id: user.id,
        student_id,
        department,
        year: req.body.year,
        semester: req.body.semester
      });
    } else if (role === 'teacher' && employee_id) {
      await supabase.from('teachers').insert({
        user_id: user.id,
        employee_id,
        department,
        specialization: req.body.specialization
      });
    }

    // Create session
    req.session.user = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role
    };

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Create session
    req.session.user = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      profile_image_url: user.profile_image_url
    };

    // Get role-specific data
    let roleData = null;
    if (user.role === 'student') {
      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .single();
      roleData = data;
    } else if (user.role === 'teacher') {
      const { data } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', user.id)
        .single();
      roleData = data;
    }

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        profile_image_url: user.profile_image_url,
        roleData
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 */
const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
    res.clearCookie('connect.sid');
    res.json({
      success: true,
      message: 'Logout successful'
    });
  });
};

/**
 * Get current user
 */
const getCurrentUser = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, profile_image_url')
      .eq('id', req.session.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password
 */
const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.session.user.id;

    // Get current user
    const { data: user, error } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (error) throw error;

    // Verify current password
    const isValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const password_hash = await bcrypt.hash(new_password, 10);

    // Update password
    await supabase
      .from('users')
      .update({ password_hash })
      .eq('id', userId);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
  changePassword
};
