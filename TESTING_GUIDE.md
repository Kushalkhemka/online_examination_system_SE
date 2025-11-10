# Complete Testing Guide - Online Examination System

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Database Setup](#database-setup)
4. [Backend Setup](#backend-setup)
5. [AI Service Setup](#ai-service-setup)
6. [Frontend Setup](#frontend-setup)
7. [Testing Workflow](#testing-workflow)
8. [API Testing](#api-testing)
9. [Common Issues](#common-issues)

---

## 1. Prerequisites

### Required Software:
```bash
# Check if installed
node --version    # Should be v18.x or higher
npm --version     # Should be v9.x or higher
python --version  # Should be v3.9 or higher
git --version     # Any recent version
```

### Install if missing:
```bash
# Node.js (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Python 3.9+
sudo apt-get install python3.9 python3-pip python3-venv

# PostgreSQL client (for testing SQL)
sudo apt-get install postgresql-client
```

---

## 2. Initial Setup

### Clone and Navigate:
```bash
cd /home/user/online_examination_system_SE
ls -la
```

### Project Structure:
```
online_examination_system_SE/
├── backend/              # Node.js/Express API
├── ai-service/          # Python FastAPI AI service
├── frontend/            # React frontend
├── database/            # SQL schema
├── README.md           # Main documentation
└── TESTING_GUIDE.md    # This file
```

---

## 3. Database Setup (Supabase)

### Option 1: Use Supabase Cloud (Recommended)

1. **Create Supabase Account:**
   - Go to https://supabase.com
   - Sign up for free account
   - Create a new project

2. **Get Credentials:**
   - Go to Project Settings > API
   - Copy:
     - `Project URL` (SUPABASE_URL)
     - `anon/public key` (SUPABASE_ANON_KEY)
     - `service_role key` (SUPABASE_SERVICE_ROLE_KEY)

3. **Run Database Schema:**
   - Go to SQL Editor in Supabase dashboard
   - Copy contents of `database/schema.sql`
   - Paste and run the SQL
   - Verify tables are created (18+ tables)

### Option 2: Local PostgreSQL

```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Start service
sudo service postgresql start

# Create database
sudo -u postgres psql
CREATE DATABASE exam_system;
CREATE USER exam_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE exam_system TO exam_user;
\q

# Run schema
psql -U exam_user -d exam_system -f database/schema.sql
```

---

## 4. Backend Setup

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Create Environment File
```bash
cp .env.example .env
nano .env
```

### Step 3: Configure .env
```env
# Required Configuration
PORT=5000
NODE_ENV=development

# Supabase (from step 3)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Session Secret (generate random string)
SESSION_SECRET=change_this_to_random_string_min_32_chars

# GCP Storage (Optional for now - for proctoring media)
# GCP_PROJECT_ID=your_project_id
# GCP_BUCKET_NAME=your_bucket_name
# GCP_CREDENTIALS_PATH=./gcp-credentials.json

# Gemini API (for AI evaluation)
GEMINI_API_KEY=your_gemini_api_key_here

# Python AI Service
AI_SERVICE_URL=http://localhost:8000

# CORS
FRONTEND_URL=http://localhost:3000
```

### Step 4: Get Gemini API Key (Free)
```bash
# Visit: https://makersuite.google.com/app/apikey
# Click "Create API Key"
# Copy the key to GEMINI_API_KEY in .env
```

### Step 5: Start Backend
```bash
npm run dev
```

### Expected Output:
```
==================================================
🚀 Online Examination System Backend
==================================================
📡 Server running on port: 5000
🌍 Environment: development
🔗 API URL: http://localhost:5000
🔌 Socket.io: Connected
==================================================

✅ Database connection successful
```

### Test Backend Health:
```bash
# In new terminal
curl http://localhost:5000/health
# Should return: {"success":true,"message":"Server is running",...}
```

---

## 5. AI Service Setup

### Step 1: Create Virtual Environment
```bash
cd ../ai-service

# Create venv
python3 -m venv venv

# Activate (Linux/Mac)
source venv/bin/activate

# Activate (Windows)
# venv\Scripts\activate
```

### Step 2: Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

**Note:** This will install:
- FastAPI, Uvicorn (web framework)
- MediaPipe, OpenCV (face detection)
- TensorFlow (object detection)
- Google Generative AI (Gemini)

**Installation may take 5-10 minutes**

### Step 3: Create Environment File
```bash
cp .env.example .env
nano .env
```

### Step 4: Configure .env
```env
PORT=8000

# Gemini API (same as backend)
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase (same as backend)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key_here

# Model Configuration
FACE_DETECTION_CONFIDENCE=0.5
OBJECT_DETECTION_CONFIDENCE=0.6
```

### Step 5: Start AI Service
```bash
python main.py
```

### Expected Output:
```
============================================================
🤖 AI Service for Online Examination System
============================================================
📡 Server starting on port: 8000
🔍 Proctoring: Enabled
🧠 AI Evaluation: Enabled
============================================================

INFO:     Uvicorn running on http://0.0.0.0:8000
✅ Gemini Evaluator initialized
✅ Proctoring detector initialized
```

### Test AI Service:
```bash
# In new terminal
curl http://localhost:8000/health
# Should return: {"status":"healthy","services":{...}}
```

---

## 6. Frontend Setup

### Step 1: Install Dependencies
```bash
cd ../frontend
npm install
```

### Step 2: Create Environment File
```bash
echo "VITE_API_URL=http://localhost:5000/api" > .env
```

### Step 3: Start Frontend
```bash
npm run dev
```

### Expected Output:
```
  VITE v5.0.5  ready in 1234 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

### Open Browser:
```bash
# Navigate to:
http://localhost:3000
```

---

## 7. Testing Workflow

### A. Complete User Registration Flow

1. **Open Browser:** http://localhost:3000

2. **Register as Teacher:**
   - Click "Don't have an account? Register"
   - Step 1: Enter email and password
     ```
     Email: teacher@test.com
     Password: password123
     Confirm Password: password123
     ```
   - Step 2: Personal Information
     ```
     First Name: John
     Last Name: Doe
     Role: Teacher
     ```
   - Step 3: Role Information
     ```
     Employee ID: T001
     Department: Computer Science
     Specialization: Software Engineering
     ```
   - Click "Complete Registration"
   - Should redirect to Dashboard

3. **Verify Teacher Dashboard:**
   - Should see 4 stat cards (Total Exams, Active Exams, Question Banks, Total Questions)
   - Should see "Recent Exams" section
   - Should see "Create New Exam", "Manage Questions", "View Reports" buttons

4. **Logout:**
   - Click profile icon (top right)
   - Click "Logout"

5. **Register as Student:**
   - Click "Register"
   - Step 1: Email & Password
     ```
     Email: student@test.com
     Password: password123
     ```
   - Step 2: Personal Info
     ```
     First Name: Jane
     Last Name: Smith
     Role: Student
     ```
   - Step 3: Role Info
     ```
     Student ID: S001
     Department: Computer Science
     Year: 3
     Semester: 5
     ```
   - Complete Registration

6. **Verify Student Dashboard:**
   - Should see 4 stat cards (Enrolled Exams, Completed, Pending, Average Score)
   - Should see "My Exams" section
   - No quick action buttons (students can't create exams)

### B. Test Exam List Page

1. **Login as Teacher** (teacher@test.com)

2. **Navigate to Exams:**
   - Click "Exams" in sidebar
   - Should see "Manage Exams" page
   - Should see "Create New Exam" button
   - Should see filter options (Search, Status, Subject)

3. **Empty State:**
   - If no exams exist, should see:
     - Large assignment icon
     - "No exams found" message
     - "Get started by creating your first exam"
     - "Create Exam" button

### C. Test API Directly (Optional)

See [API Testing](#api-testing) section below.

---

## 8. API Testing

### Using curl (Command Line)

#### A. Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "first_name": "Test",
    "last_name": "User",
    "role": "teacher",
    "employee_id": "T999",
    "department": "Testing"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "User",
    "role": "teacher"
  }
}
```

#### B. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Note:** `-c cookies.txt` saves session cookie for subsequent requests

#### C. Get Dashboard Stats (Requires Login)
```bash
curl -X GET http://localhost:5000/api/reports/dashboard \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

#### D. Create Question Bank
```bash
curl -X POST http://localhost:5000/api/questions/banks \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "Computer Science Bank",
    "description": "General CS questions",
    "subject": "Computer Science",
    "is_public": true
  }'
```

#### E. Create MCQ Question
```bash
curl -X POST http://localhost:5000/api/questions \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "bank_id": "bank-uuid-from-above",
    "question_type": "mcq",
    "question_text": "What is the time complexity of binary search?",
    "marks": 2,
    "difficulty": "medium",
    "options": [
      {"option_text": "O(n)", "is_correct": false},
      {"option_text": "O(log n)", "is_correct": true},
      {"option_text": "O(n^2)", "is_correct": false},
      {"option_text": "O(1)", "is_correct": false}
    ]
  }'
```

### Using Postman (GUI)

1. **Download Postman:** https://www.postman.com/downloads/

2. **Import Collection:**
   - Create new collection: "Exam System"
   - Add requests for each endpoint

3. **Set Variables:**
   - Base URL: `http://localhost:5000/api`
   - After login, save session cookie

4. **Test Endpoints:**
   - Auth: Register, Login, Logout
   - Questions: Create, List, Update, Delete
   - Exams: Create, List, Update, Delete
   - Attempts: Start, Save Answer, Submit
   - Reports: Dashboard, Performance

---

## 9. Common Issues & Solutions

### Issue 1: Backend won't start - "Database connection failed"

**Solution:**
```bash
# Check Supabase credentials in backend/.env
# Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

# Test database connection
curl "YOUR_SUPABASE_URL/rest/v1/users?limit=1" \
  -H "apikey: YOUR_ANON_KEY"
```

### Issue 2: "GEMINI_API_KEY not provided"

**Solution:**
```bash
# Get free API key from:
https://makersuite.google.com/app/apikey

# Add to both:
# - backend/.env
# - ai-service/.env
```

### Issue 3: AI Service fails to start - ModuleNotFoundError

**Solution:**
```bash
cd ai-service
source venv/bin/activate  # Make sure venv is activated
pip install -r requirements.txt --upgrade
```

### Issue 4: Frontend shows "Network Error"

**Solution:**
```bash
# Check backend is running on port 5000
curl http://localhost:5000/health

# Check CORS in backend/.env
FRONTEND_URL=http://localhost:3000

# Check frontend/.env
VITE_API_URL=http://localhost:5000/api
```

### Issue 5: Login works but Dashboard shows "Failed to fetch"

**Solution:**
```bash
# Session cookie might not be set
# Check backend server.js has:
# - express-session configured
# - CORS with credentials: true

# Check frontend api.js has:
# - withCredentials: true
```

### Issue 6: GCP Storage errors (proctoring upload fails)

**Solution:**
```bash
# GCP is optional for basic testing
# For now, proctoring will work without storage
# Images won't be saved but violations will be logged

# To fix: Set up GCP bucket and add credentials
```

### Issue 7: Port already in use

**Solution:**
```bash
# Backend (port 5000)
lsof -ti:5000 | xargs kill -9

# AI Service (port 8000)
lsof -ti:8000 | xargs kill -9

# Frontend (port 3000)
lsof -ti:3000 | xargs kill -9
```

---

## 10. Advanced Testing

### A. Test AI Evaluation

1. **Create Exam with Questions**
2. **Take Exam as Student**
3. **Submit Answers**
4. **Check Backend Logs:**
   ```bash
   # Should see: "Starting evaluation for attempt: {id}"
   # Should see: "✅ Evaluation completed"
   ```
5. **View Results** - Should show AI feedback

### B. Test Proctoring (Frame Analysis)

```bash
# Send test frame to AI service
curl -X POST http://localhost:8000/proctoring/analyze-frame \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-session",
    "frame_data": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  }'
```

### C. Load Testing

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test backend
ab -n 100 -c 10 http://localhost:5000/health

# Expected: All requests succeed
```

---

## 11. Quick Start Script

Create `start-all.sh`:
```bash
#!/bin/bash

# Start Backend
cd backend
npm run dev &
BACKEND_PID=$!

# Start AI Service
cd ../ai-service
source venv/bin/activate
python main.py &
AI_PID=$!

# Start Frontend
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "All services started!"
echo "Backend PID: $BACKEND_PID"
echo "AI Service PID: $AI_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "To stop all services:"
echo "kill $BACKEND_PID $AI_PID $FRONTEND_PID"
```

Make executable and run:
```bash
chmod +x start-all.sh
./start-all.sh
```

---

## 12. Testing Checklist

### Initial Setup
- [ ] Supabase project created
- [ ] Database schema executed
- [ ] Backend .env configured
- [ ] AI service .env configured
- [ ] Frontend .env configured
- [ ] All dependencies installed

### Backend
- [ ] Backend starts without errors
- [ ] Health endpoint responds
- [ ] Database connection successful
- [ ] Can register user
- [ ] Can login user
- [ ] Session persists

### AI Service
- [ ] AI service starts without errors
- [ ] Health endpoint responds
- [ ] Gemini evaluator initialized
- [ ] Proctoring detector initialized

### Frontend
- [ ] Frontend starts without errors
- [ ] Can access login page
- [ ] Can register new user
- [ ] Can login
- [ ] Dashboard loads with data
- [ ] Exam list loads
- [ ] Can navigate between pages
- [ ] Can logout

### Integration
- [ ] Frontend → Backend: API calls work
- [ ] Backend → Database: Data persists
- [ ] Backend → AI Service: Evaluation triggers
- [ ] Real-time: Socket.io connects

---

## 13. Next Steps After Setup

1. **Create Question Banks**
   - Login as teacher
   - Go to Question Bank page
   - Create different question types

2. **Create Sample Exam**
   - Go to Create Exam page
   - Add questions
   - Configure settings
   - Publish exam

3. **Take Exam**
   - Login as student
   - View enrolled exams
   - Take exam
   - Submit

4. **View Results**
   - Check AI-generated feedback
   - Review proctoring report
   - View analytics

---

## Need Help?

### Check Logs:
```bash
# Backend logs
cd backend && npm run dev

# AI Service logs
cd ai-service && python main.py

# Browser console
F12 → Console tab
```

### Debug Mode:
```bash
# Backend
NODE_ENV=development npm run dev

# Frontend
npm run dev
```

---

**System Status:**
- ✅ Backend: 100% Complete
- ✅ AI Service: 100% Complete
- ✅ Database: 100% Complete
- ✅ Frontend Core: 50% Complete (Login, Register, Dashboard, Exam List working)
- ⏳ Remaining: Question Bank, Create Exam, Exam Interface, Results, Reports pages

**Current Version:** 1.0.0-RC1
**Last Updated:** 2025-11-10
