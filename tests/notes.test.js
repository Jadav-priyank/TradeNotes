const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/db/database');
const User = require('../src/models/User');
const Note = require('../src/models/Note');

let userAToken;
let userBToken;
let userAId;
let userBId;

beforeAll(async () => {
  await connectDB();
  await Note.deleteMany({});
  await User.deleteMany({});

  // Register User A
  const resA = await request(app).post('/api/auth/register').send({
    username: 'userA',
    email: 'usera@example.com',
    password: 'password123'
  });
  userAToken = resA.body.data.token;
  userAId = resA.body.data.user.id;

  // Register User B
  const resB = await request(app).post('/api/auth/register').send({
    username: 'userB',
    email: 'userb@example.com',
    password: 'password123'
  });
  userBToken = resB.body.data.token;
  userBId = resB.body.data.user.id;
});

afterAll(async () => {
  await disconnectDB();
});

describe('Notes API - Private Notes & CRUD', () => {
  let createdNoteA1Id;

  test('POST /api/notes - User A can create a private note with PnL', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'User A Secret Strategy',
        imageUrl: 'https://example.com/btc-chart.png',
        pnl: 250.50,
        content: 'This is completely confidential to User A.'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('User A Secret Strategy');
    expect(res.body.data.imageUrl).toBe('https://example.com/btc-chart.png');
    expect(res.body.data.pnl).toBe(250.50);
    expect(res.body.data.userId).toBe(userAId);
    createdNoteA1Id = res.body.data.id;
  });

  test('POST /api/notes - User B can create their own private note with negative PnL', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        title: 'User B Project Plan',
        pnl: -75.25,
        content: 'Confidential project plan for User B.'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pnl).toBe(-75.25);
    expect(res.body.data.userId).toBe(userBId);
  });

  test('GET /api/notes - Private isolation: User B cannot see User A note in listing', async () => {
    const res = await request(app)
      .get('/api/notes')
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.notes.length).toBe(1);
    expect(res.body.data.notes[0].title).toBe('User B Project Plan');
  });

  test('GET /api/notes/:id - Private isolation: User B cannot get User A note by ID', async () => {
    const res = await request(app)
      .get(`/api/notes/${createdNoteA1Id}`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('PUT /api/notes/:id - Private isolation: User B cannot update User A note', async () => {
    const res = await request(app)
      .put(`/api/notes/${createdNoteA1Id}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ title: 'Hacked Title' });

    expect(res.statusCode).toBe(404);
  });

  test('DELETE /api/notes/:id - Private isolation: User B cannot delete User A note', async () => {
    const res = await request(app)
      .delete(`/api/notes/${createdNoteA1Id}`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.statusCode).toBe(404);
  });

  test('PUT /api/notes/:id - User A can update their own note', async () => {
    const res = await request(app)
      .put(`/api/notes/${createdNoteA1Id}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'User A Updated Strategy',
        content: 'Updated content body'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe('User A Updated Strategy');
    expect(res.body.data.content).toBe('Updated content body');
  });
});

describe('Notes API - Title Search & Date Filter', () => {
  beforeAll(async () => {
    if (!userAId) {
      const u = await User.findOne({ username: 'userA' });
      userAId = u ? u._id.toString() : null;
    }
    // Insert historical notes with specific dates for User A
    await Note.create([
      { userId: userAId, title: 'JavaScript Basics & ES6', content: 'Learn let, const, arrow functions', tags: ['js'], created_at: new Date('2026-08-01T10:00:00.000Z') },
      { userId: userAId, title: 'Python FastAPI Microservices', content: 'Learn async and Pydantic models', tags: ['python'], created_at: new Date('2026-08-15T12:00:00.000Z') },
      { userId: userAId, title: 'Docker & Kubernetes Guide', content: 'Learn containerization and pods', tags: ['devops'], created_at: new Date('2026-09-01T14:00:00.000Z') },
      { userId: userAId, title: 'TypeScript Advanced Types', content: 'Learn generics and mapped types', tags: ['typescript'], created_at: new Date('2026-09-10T16:00:00.000Z') }
    ]);
  });

  test('Search by Title - Filter notes by title keyword (case-insensitive)', async () => {
    const res = await request(app)
      .get('/api/notes?title=Script')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.statusCode).toBe(200);
    // Should match "JavaScript Basics & ES6" and "TypeScript Advanced Types"
    const titles = res.body.data.notes.map(n => n.title);
    expect(titles).toContain('JavaScript Basics & ES6');
    expect(titles).toContain('TypeScript Advanced Types');
    expect(titles).not.toContain('Docker & Kubernetes Guide');
  });

  test('Search by Search query param - Full text match', async () => {
    const res = await request(app)
      .get('/api/notes?search=containerization')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.notes.length).toBe(1);
    expect(res.body.data.notes[0].title).toBe('Docker & Kubernetes Guide');
  });

  test('Filter by Date Range - startDate and endDate', async () => {
    const res = await request(app)
      .get('/api/notes?startDate=2026-08-01&endDate=2026-08-31')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.statusCode).toBe(200);
    // Notes in August: JavaScript (Aug 1) and Python (Aug 15)
    expect(res.body.data.notes.length).toBe(2);
    const titles = res.body.data.notes.map(n => n.title);
    expect(titles).toContain('JavaScript Basics & ES6');
    expect(titles).toContain('Python FastAPI Microservices');
  });

  test('Filter by Exact Date - date=YYYY-MM-DD', async () => {
    const res = await request(app)
      .get('/api/notes?date=2026-09-01')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.notes.length).toBe(1);
    expect(res.body.data.notes[0].title).toBe('Docker & Kubernetes Guide');
  });

  test('Combined Search and Date Filter', async () => {
    const res = await request(app)
      .get('/api/notes?title=Docker&startDate=2026-09-01')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.notes.length).toBe(1);
    expect(res.body.data.notes[0].title).toBe('Docker & Kubernetes Guide');
  });

  test('Filter by Month - month=YYYY-MM', async () => {
    const res = await request(app)
      .get('/api/notes?month=2026-08')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.notes.length).toBe(2);
    const titles = res.body.data.notes.map(n => n.title);
    expect(titles).toContain('JavaScript Basics & ES6');
    expect(titles).toContain('Python FastAPI Microservices');
  });

  test('GET /api/notes/summary - Return note count, PnL and monthlyBreakdown', async () => {
    const res = await request(app)
      .get('/api/notes/summary')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalNotes).toBeGreaterThanOrEqual(4);
    expect(Array.isArray(res.body.data.monthlyBreakdown)).toBe(true);
    expect(Array.isArray(res.body.data.recentActivity)).toBe(true);
  });
});
