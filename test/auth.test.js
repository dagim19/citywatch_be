const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authRoutes = require('../src/routes/auth'); // Assuming auth.js is in the same directory
const User = require('../src/models/User'); // Adjust path if needed

// Mock environment variables
process.env.SALT_ROUNDS = '10';
process.env.JWT_SECRET = 'testsecret';

// Create a test app
const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

// Mock User model for testing
jest.mock('../src/models/User');

describe('Auth Routes', () => {
  beforeAll(async () => {
    // Connect to a test database (optional, you can use a mock database as well)
    await mongoose.connect('mongodb://localhost:27017/CityWatchTestDB');
  });

  afterAll(async () => {
    // Disconnect from the test database
    await mongoose.connection.close();
  });

  beforeEach(() => {
    // Clear mock calls before each test
    User.findOne.mockClear();
    User.prototype.save.mockClear();
  });

  describe('POST /auth/signup', () => {
    it('should register a new user successfully', async () => {
      // Mock successful user creation
      User.findOne.mockResolvedValue(null); // Simulate no existing user
      User.prototype.save.mockResolvedValue({}); // Simulate successful save

      const res = await request(app)
        .post('/auth/signup')
        .send({
          name: 'Test User',
          fatherName: 'Test Father',
          email: 'test@example.com',
          phone: '1234567890',
          password: 'password123',
          subCity: 'Test City',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toEqual({ message: 'User registered successfully' });
      expect(User.findOne).toHaveBeenCalledTimes(2);
      expect(User.prototype.save).toHaveBeenCalled();
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send({
          name: 'Test User',
          // Missing other fields
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual({ message: 'Please fill all required fields' });
    });

    it('should return 400 if email already exists', async () => {
      // Mock existing email
      User.findOne.mockResolvedValueOnce({ email: 'test@example.com' });

      const res = await request(app)
        .post('/auth/signup')
        .send({
          name: 'Test User',
          fatherName: 'Test Father',
          email: 'test@example.com',
          phone: '1234567890',
          password: 'password123',
          subCity: 'Test City',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual({ message: 'Email already exists' });
    });

    it('should return 400 if phone number already exists', async () => {
      // Mock existing phone number
      User.findOne.mockResolvedValueOnce(null) // Simulate no existing email
      User.findOne.mockResolvedValueOnce({ phone: '1234567890' });

      const res = await request(app)
        .post('/auth/signup')
        .send({
          name: 'Test User',
          fatherName: 'Test Father',
          email: 'test@example.com',
          phone: '1234567890',
          password: 'password123',
          subCity: 'Test City',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual({ message: 'phone number already exists' });
    });

    it('should return 500 if there is a server error', async () => {
      // Mock server error
      User.findOne.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/auth/signup')
        .send({
          name: 'Test User',
          fatherName: 'Test Father',
          email: 'test@example.com',
          phone: '1234567890',
          password: 'password123',
          subCity: 'Test City',
        });

      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual({ message: 'Server error' });
    });
  });

  describe('POST /auth/login', () => {
    it('should login a user successfully and return a token', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        password: hashedPassword,
      };

      // Mock successful login
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(true);
      jwt.sign = jest.fn().mockReturnValue('testtoken');

      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({ token: 'testtoken' });
      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', hashedPassword);
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: 'user123' },
        'testsecret',
        { expiresIn: '1h' }
      );
    });

    it('should return 401 if user is not found', async () => {
      // Mock user not found
      User.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body).toEqual({ message: 'Invalid credentials' });
    });

    it('should return 401 if password does not match', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        password: hashedPassword,
      };

      // Mock incorrect password
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body).toEqual({ message: 'Invalid credentials' });
    });

    it('should return 500 if there is a server error', async () => {
      // Mock server error
      User.findOne.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual({ message: 'Server error' });
    });
  });
});