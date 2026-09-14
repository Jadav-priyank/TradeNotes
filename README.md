# 📈 TradeNotes - Trading Journal & Analytics API

A trading journal and notes web application and RESTful API built with **Node.js, Express, MongoDB (Mongoose), and JWT Authentication**. 

Manage and journal your trades (BTC, XAU, Forex, Equities), log chart images, record manual PnL values (+ and -), and analyze your performance month-by-month.

---

## ✨ Features

- 🔒 **Private Trading Notes Per User**: Strict user isolation via JWT tokens; each trader has their own private journal.
- 📊 **PnL Tracking**: Record profit & loss per note with real-time aggregated **Total PnL** calculation.
- 📅 **Month-Wise Timeline & Management**: Dynamic month chips, month filtering, and monthly PnL breakdown.
- 🖼️ **Image & Chart Attachments**: Upload and display trading screenshots, breakout setups, and analysis with full aspect ratio.
- 🔍 **Symbol & Keyword Filter**: Filter by `BTC`, `XAU`, or custom keyword search.
- 🍃 **MongoDB Storage**: Scalable NoSQL document storage with Mongoose schemas, compound indexes, and aggregation.
- 📑 **Interactive Swagger UI**: Full OpenAPI 3.0 documentation available at `/api-docs`.
- 💻 **Modern Web Dashboard**: Built-in glassmorphism dark mode UI for traders.
- ☁️ **Vercel Ready**: Pre-configured for serverless deployment with `vercel.json` and `api/index.js`.
- 🧪 **Automated Test Suite**: Tested using Jest & Supertest for auth, CRUD, search, filter, and privacy isolation.

---

## ☁️ Deploying to Vercel

1. **Push your repository to GitHub**:
   ```bash
   git add .
   git commit -m "Initial TradeNotes commit"
   git branch -M main
   git remote add origin https://github.com/Jadav-priyank/TradeNotes.git
   git push -u origin main
   ```

2. **Import into Vercel**:
   - Go to [Vercel](https://vercel.com) and click **"Add New Project"**.
   - Select your `TradeNotes` repository from GitHub.

3. **Set Environment Variables in Vercel Dashboard**:
   In your Vercel project settings -> **Environment Variables**, add:
   - `MONGODB_URI`: Your MongoDB Atlas connection string (e.g., `mongodb+srv://<username>:<password>@cluster0.mongodb.net/tradenotes?retryWrites=true&w=majority`)
   - `JWT_SECRET`: A secure random string for JWT signing
   - `JWT_EXPIRES_IN`: `7d`
   - `NODE_ENV`: `production`

4. Click **Deploy**! Vercel will build and launch your application globally.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
A `.env` file is included with default configuration:
```env
PORT=3000
JWT_SECRET=super_secret_jwt_key_notes_api_change_in_production
JWT_EXPIRES_IN=7d
MONGODB_URI=mongodb://127.0.0.1:27017/notes_db
NODE_ENV=development
```

### 3. Run the Server
```bash
# Start server
npm start

# Or with live-reload
npm run dev
```

The server will start at:
- 🌐 **Web Dashboard**: [http://localhost:3000](http://localhost:3000)
- 📑 **Swagger Docs**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

### 4. Run Automated Tests
```bash
npm test
```

---

## 📡 API Endpoints Reference

### 🔐 Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new user (`username`, `email`, `password`) | No |
| `POST` | `/api/auth/login` | Log in with credentials and receive JWT | No |
| `GET` | `/api/auth/me` | Fetch authenticated user profile & note count | **Yes (Bearer)** |

#### Register Request Body:
```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "securepassword123"
}
```

#### Response:
```json
{
  "success": true,
  "message": "User registered successfully.",
  "data": {
    "user": {
      "id": 1,
      "username": "alice",
      "email": "alice@example.com",
      "created_at": "2026-09-11 11:00:00"
    },
    "token": "eyJhbGciOiJIUzI1NiIsIn..."
  }
}
```

---

### 📝 Notes Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/notes` | Create a new private note | **Yes (Bearer)** |
| `GET` | `/api/notes` | List private notes (with search, date filter, pagination) | **Yes (Bearer)** |
| `GET` | `/api/notes/summary` | Get user's total note count & daily activity | **Yes (Bearer)** |
| `GET` | `/api/notes/:id` | Get single note by ID (user-isolated) | **Yes (Bearer)** |
| `PUT` | `/api/notes/:id` | Update note by ID (user-isolated) | **Yes (Bearer)** |
| `DELETE` | `/api/notes/:id` | Delete note by ID (user-isolated) | **Yes (Bearer)** |

---

### 🔎 Search & Filter Query Parameters (`GET /api/notes`)

| Parameter | Type | Example | Description |
|---|---|---|---|
| `title` | `string` | `?title=meeting` | Filters notes whose title contains the substring (case-insensitive) |
| `search` | `string` | `?search=quarterly` | Searches both title and content |
| `date` | `string` | `?date=2026-09-11` | Filter notes created on specific date (`YYYY-MM-DD`) |
| `startDate` | `string` | `?startDate=2026-09-01` | Filter notes created on or after date (`YYYY-MM-DD`) |
| `endDate` | `string` | `?endDate=2026-09-30` | Filter notes created on or before date (`YYYY-MM-DD`) |
| `sortBy` | `string` | `?sortBy=createdAt` | Sort by `createdAt`, `updatedAt`, or `title` (default: `createdAt`) |
| `order` | `string` | `?order=desc` | Sort direction: `asc` or `desc` (default: `desc`) |
| `page` | `integer`| `?page=1` | Page number (default: `1`) |
| `limit` | `integer`| `?limit=10` | Items per page (default: `10`, max: `100`) |

---

## 💻 cURL Examples

### 1. Register a user
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "email": "alice@example.com", "password": "password123"}'
```

### 2. Create a Note
```bash
curl -X POST http://localhost:3000/api/notes \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Q3 Roadmap", "content": "Complete API search and date filtering", "tags": ["work", "planning"]}'
```

### 3. Search notes by Title
```bash
curl -X GET "http://localhost:3000/api/notes?title=Roadmap" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

### 4. Filter notes by Date Range
```bash
curl -X GET "http://localhost:3000/api/notes?startDate=2026-09-01&endDate=2026-09-30" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```
