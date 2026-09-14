const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/db/database');
const User = require('../src/models/User');
const Note = require('../src/models/Note');

beforeAll(async () => {
  await connectDB();
  await Note.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await disconnectDB();
});

describe('Authentication API', () => {
  const testUser = {
    username: 'alice',
    email: 'alice@example.com',
    password: 'password123'
  };

  test('POST /api/auth/register - Should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.username).toBe(testUser.username);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.token).toBeDefined();
  });

  test('POST /api/auth/register - Should reject duplicate username', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'alice',
        email: 'another@example.com',
        password: 'password123'
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Username is already taken');
  });

  test('POST /api/auth/register - Should reject duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'alice2',
        email: 'alice@example.com',
        password: 'password123'
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Email is already registered');
  });

  test('POST /api/auth/login - Should log in with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'alice',
        password: 'password123'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.username).toBe('alice');
  });

  test('POST /api/auth/login - Should log in with email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'alice@example.com',
        password: 'password123'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  test('POST /api/auth/login - Should reject invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'alice',
        password: 'wrongpassword'
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/auth/me - Should fetch profile with valid token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'alice',
        password: 'password123'
      });

    const token = loginRes.body.data.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.username).toBe('alice');
    expect(res.body.data.stats).toBeDefined();
  });

  test('GET /api/auth/me - Should reject request without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
