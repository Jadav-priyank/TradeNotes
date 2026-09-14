const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Note = require('../models/Note');
const { JWT_SECRET } = require('../middleware/auth');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function generateToken(user) {
  return jwt.sign(
    { id: user.id || user._id.toString(), username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

async function register(req, res) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required.'
      });
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedUsername.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters long.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const escapedUsername = trimmedUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Check if username already exists (case-insensitive)
    const existingUser = await User.findOne({
      username: { $regex: new RegExp(`^${escapedUsername}$`, 'i') }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Username is already taken.'
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({
      email: trimmedEmail
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered.'
      });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const newUserDoc = await User.create({
      username: trimmedUsername,
      email: trimmedEmail,
      password: hashedPassword
    });

    const userPayload = {
      id: newUserDoc._id.toString(),
      username: newUserDoc.username,
      email: newUserDoc.email,
      created_at: newUserDoc.created_at
    };

    const token = generateToken(userPayload);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: {
        user: userPayload,
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 11000) {
      const isEmail = error.keyPattern && error.keyPattern.email;
      return res.status(409).json({
        success: false,
        message: isEmail ? 'Email is already registered.' : 'Username is already taken.'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to register user.'
    });
  }
}

async function login(req, res) {
  try {
    const { username, email, password } = req.body;
    const identifier = (username || email || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/email and password are required.'
      });
    }

    const escapedIdentifier = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const user = await User.findOne({
      $or: [
        { username: { $regex: new RegExp(`^${escapedIdentifier}$`, 'i') } },
        { email: identifier.toLowerCase() }
      ]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username/email or password.'
      });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username/email or password.'
      });
    }

    const userPayload = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      created_at: user.created_at
    };

    const token = generateToken(userPayload);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: userPayload,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to log in.'
    });
  }
}

async function me(req, res) {
  try {
    const totalNotes = await Note.countDocuments({ userId: req.user.id });

    return res.status(200).json({
      success: true,
      data: {
        user: req.user,
        stats: {
          totalNotes
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile.'
    });
  }
}

module.exports = {
  register,
  login,
  me
};
