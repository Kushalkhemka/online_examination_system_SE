# Quick Start Guide - 5 Minutes Setup

## Prerequisites Check

```bash
node --version    # Need v18+
python3 --version # Need v3.9+
npm --version     # Need v9+
```

---

## Step 1: Database Setup (2 minutes)

### Create Supabase Project:
1. Go to https://supabase.com
2. Sign up / Login
3. Click "New Project"
4. Fill details:
   - Name: exam-system
   - Database Password: (remember this)
   - Region: (choose closest)
5. Wait 2 minutes for setup

### Run Database Schema:
1. In Supabase Dashboard:
   - Go to "SQL Editor"
   - Click "New Query"
2. Open `database/schema.sql` from this repo
3. Copy entire content
4. Paste in SQL Editor
5. Click "Run"
6. Verify: Should see "Success" and 18+ tables created

### Get API Keys:
1. Go to Settings > API
2. Copy these values:
   - **Project URL** (looks like: https://xxx.supabase.co)
   - **anon key** (starts with: eyJhbGc...)
   - **service_role key** (starts with: eyJhbGc...)

---

## Step 2: Get Gemini API Key (Free, 1 minute)

1. Visit: https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key (starts with: AIzaSy...)

---

## Step 3: Backend Setup (1 minute)

```bash
cd backend

# Install
npm install

# Create .env
cp .env.example .env

# Edit .env (use nano or any editor)
nano .env
```

**Paste these values in .env:**
```env
PORT=5000
NODE_ENV=development

# From Supabase Step 1
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Generate random string (min 32 chars)
SESSION_SECRET=your_random_string_at_least_32_characters_long

# From Step 2
GEMINI_API_KEY=your_gemini_api_key_here

# Leave these as is
AI_SERVICE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

# Optional (for full proctoring with media storage)
# GCP_PROJECT_ID=
# GCP_BUCKET_NAME=
# GCP_CREDENTIALS_PATH=
```

**Save and exit** (Ctrl+X, Y, Enter in nano)

```bash
# Start backend
npm run dev
```

**Expected:** Server running on port 5000, Database connection successful

---

## Step 4: AI Service Setup (1 minute)

**Open NEW terminal:**

```bash
cd ai-service

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # Linux/Mac
# OR
venv\Scripts\activate     # Windows

# Install dependencies (may take 5 minutes first time)
pip install -r requirements.txt

# Create .env
cp .env.example .env

# Edit .env
nano .env
```

**Paste these values:**
```env
PORT=8000

# Same as backend
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key_here

FACE_DETECTION_CONFIDENCE=0.5
OBJECT_DETECTION_CONFIDENCE=0.6
```

**Save and exit**

```bash
# Start AI service
python main.py
```

**Expected:** Uvicorn running on port 8000, Proctoring and AI Evaluation enabled

---

## Step 5: Frontend Setup (30 seconds)

**Open NEW terminal:**

```bash
cd frontend

# Install
npm install

# Create .env
echo "VITE_API_URL=http://localhost:5000/api" > .env

# Start frontend
npm run dev
```

**Expected:** Vite server running on http://localhost:3000

---

## Step 6: Test It!

### Open Browser:
```
http://localhost:3000
```

### Register New User:
1. Click "Don't have an account? Register"
2. Fill Step 1 (Email & Password):
   ```
   Email: teacher@test.com
   Password: password123
   Confirm: password123
   ```
3. Click "Next"
4. Fill Step 2 (Personal Info):
   ```
   First Name: John
   Last Name: Doe
   Role: Teacher
   ```
5. Click "Next"
6. Fill Step 3 (Teacher Info):
   ```
   Employee ID: T001
   Department: Computer Science
   Specialization: (optional)
   ```
7. Click "Complete Registration"

### You're In!
- Should see Dashboard with statistics
- Navigate using sidebar:
  - Dashboard
  - Exams
  - Question Bank (stub)
  - Create Exam (stub)
  - Reports (stub)

### Test Different Roles:
1. Logout (top right menu)
2. Register as Student:
   ```
   Email: student@test.com
   Password: password123
   Role: Student
   Student ID: S001
   ```
3. See different dashboard view

---

## Verification Checklist

- [ ] Backend running on http://localhost:5000
- [ ] AI Service running on http://localhost:8000
- [ ] Frontend running on http://localhost:3000
- [ ] Can register new user
- [ ] Can login
- [ ] Dashboard loads with statistics
- [ ] Can navigate to Exams page
- [ ] Can logout

---

## Quick Health Check Commands

```bash
# Backend
curl http://localhost:5000/health

# AI Service
curl http://localhost:8000/health

# Frontend (in browser)
http://localhost:3000
```

---

## Common Issues

### Issue: Backend says "Database connection failed"
**Fix:** Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env

### Issue: AI Service fails to install
**Fix:**
```bash
# Make sure Python 3.9+
python3 --version

# Try upgrading pip first
pip install --upgrade pip
pip install -r requirements.txt
```

### Issue: Frontend shows "Network Error"
**Fix:** Make sure backend is running on port 5000

### Issue: Port already in use
**Fix:**
```bash
# Kill process on port
lsof -ti:5000 | xargs kill -9  # Backend
lsof -ti:8000 | xargs kill -9  # AI Service
lsof -ti:3000 | xargs kill -9  # Frontend
```

---

## What's Working vs What's Not

### ✅ Fully Functional (100%):
- Backend API (all 45+ endpoints)
- AI Service (proctoring + evaluation)
- Database schema
- User authentication
- Session management
- Dashboard with real data
- Exam list with filters
- Login / Register

### ⏳ Stub Pages (Need UI Implementation):
- Question Bank (CRUD operations)
- Create Exam (wizard form)
- Exam Interface (taking exam)
- Results (viewing scores)
- Reports (analytics)

### Backend Testing (API works!):
You can test all features via API even though UI is not complete.

See `TESTING_GUIDE.md` for detailed API testing with curl/Postman.

---

## Next Steps

1. **Create Questions** (via API):
   ```bash
   curl -X POST http://localhost:5000/api/questions \
     -H "Content-Type: application/json" \
     -b cookies.txt \
     -d '{...}'
   ```

2. **Create Exams** (via API)

3. **Take Exam** (via API)

4. **Get AI Evaluation** (automatic)

5. **View Reports** (via API)

---

## Need More Detail?

See `TESTING_GUIDE.md` for:
- Detailed setup instructions
- API testing examples
- Troubleshooting guide
- All curl commands
- Postman collection

---

**Estimated Total Setup Time:** 5-10 minutes
**Difficulty:** Easy
**Prerequisites:** Node.js, Python, Internet connection

**Status:** Backend 100% | Frontend 50% | Database 100%

Enjoy testing the system!
