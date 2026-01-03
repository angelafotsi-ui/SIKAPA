const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateAuthInput } = require('../middleware/validation');

/**
 * @route   POST /api/auth/signup
 * @desc    Sign up a new user
 * @access  Public
 */
router.post('/signup', validateAuthInput, authController.signup);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   GET /api/auth/user/:uid
 * @desc    Get user details
 * @access  Public
 */
router.get('/user/:uid', authController.getUser);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post('/logout', authController.logout);

module.exports = router;
