# Complete Setup & Testing Instructions

## Prerequisites Installation

### 1. Install Required Software

**Check if you have these installed:**
```bash
node --version    # Should be v18+ or v20+
python3 --version # Should be 3.9+
npm --version     # Should be 8+
```

**If not installed:**
- **Node.js**: Download from https://nodejs.org (LTS version)
- **Python**: Download from https://python.org (3.9 or higher)

## Step-by-Step Setup

### Step 1: Get API Keys (5 minutes)

#### A. Gemini API Key
1. Visit: https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key (looks like: `AIzaSyXXXXXXXXXXXXXXXXXX`)

#### B. Supabase Setup
1. Visit: https://supabase.com and sign up
2. Create new project:
   - Project name: `online-exam-system`
   - Database password: (choose a strong password - save it!)
   - Region: Choose closest to you
   - Click "Create new project" (wait 2-3 minutes)

3. Get credentials:
   - Go to Settings (gear icon) → API
   - Copy:
     - **Project URL**: `https://xxxxx.supabase.co`
     - **anon/public key**: Long string starting with `eyJ...`

4. Setup database:
   - Go to SQL Editor (lightning bolt icon)
   - Click "New Query"
   - Open `database/schema.sql` from this project
   - Copy entire file contents
   - Paste into SQL Editor
   - Click "Run" button
   - Wait for success message (should see "Success. No rows returned")

### Step 2: Configure Backend (2 minutes)

1. Create backend environment file:
```bash
cd backend
cp .env.example .env
```

2. Edit `backend/.env` with your values:
```env
# Server
PORT=5000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your_supabase_anon_key_here

# Session Secret (generate a random string)
SESSION_SECRET=your-super-secret-random-string-here-make-it-long

# AI Service
AI_SERVICE_URL=http://localhost:8000
```

3. Install dependencies:
```bash
npm install
```

### Step 3: Configure AI Service (2 minutes)

1. Create AI service environment file:
```bash
cd ../ai-service
cp .env.example .env
```

2. Edit `ai-service/.env`:
```env
# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Service Config
PORT=8000

# Optional: GCP Cloud Storage (leave empty to use Supabase)
# GCP_PROJECT_ID=
# GCP_BUCKET_NAME=
# GCP_CREDENTIALS_PATH=
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
```

**If you encounter errors on Windows:**
```bash
pip install --upgrade pip
pip install -r requirements.txt --no-cache-dir
```

**On Mac/Linux, use virtual environment:**
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Step 4: Configure Frontend (2 minutes)

1. Create frontend environment file:
```bash
cd ../frontend
cp .env.example .env
```

2. Edit `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

3. Install dependencies:
```bash
npm install
```

## Running the Application

You need **3 terminal windows** open:

### Terminal 1: Backend
```bash
cd backend
npm run dev
```
Wait for: `Server running on port 5000`

### Terminal 2: AI Service
```bash
cd ai-service
python main.py
```
Wait for: `Uvicorn running on http://0.0.0.0:8000`

### Terminal 3: Frontend
```bash
cd frontend
npm run dev
```
Wait for: `Local: http://localhost:5173`

## Testing the Complete System

### Access the Application
Open your browser and go to: **http://localhost:5173**

### Test Flow 1: Teacher Creates Exam

1. **Register as Teacher:**
   - Click "Register"
   - Fill form:
     - Email: `teacher@test.com`
     - Password: `Test123!@#`
     - First Name: `John`
     - Last Name: `Doe`
     - Role: Select "Teacher"
     - Employee ID: `T001`
   - Click through the 3-step registration
   - Login with teacher credentials

2. **Create Questions:**
   - Navigate to "Question Bank"
   - Click "Add Question"
   - Create different question types:

     **MCQ Example:**
     - Type: Multiple Choice (Single)
     - Question: "What is 2 + 2?"
     - Marks: 1
     - Difficulty: Easy
     - Options:
       - ☐ 3
       - ☑ 4 (check as correct)
       - ☐ 5
       - ☐ 6
     - Click "Create"

     **Subjective Example:**
     - Type: Subjective
     - Question: "Explain the concept of Object-Oriented Programming"
     - Marks: 5
     - Difficulty: Medium
     - Model Answer: "OOP is a programming paradigm based on objects containing data and methods..."
     - Click "Create"

   - Create 5-10 questions total

3. **Create Exam:**
   - Navigate to "Create Exam"

   **Step 1 - Basic Details:**
   - Title: "Sample Computer Science Test"
   - Description: "Test exam for system verification"
   - Subject: "Computer Science"
   - Instructions: "Answer all questions carefully"
   - Click "Next"

   **Step 2 - Configuration:**
   - Duration: 30 minutes
   - Total Marks: 100
   - Passing Percentage: 40
   - Negative Marking: 0
   - Start Time: (select current date/time + 1 minute)
   - End Time: (select tomorrow)
   - Status: Active
   - Enable AI Proctoring: ON
   - Enable Face Detection: ON
   - Enable Multiple Person Detection: ON
   - Enable Tab Switch Detection: ON
   - Screenshot Interval: 10 seconds
   - Click "Next"

   **Step 3 - Select Questions:**
   - Check all questions you created
   - Verify total marks shown
   - Click "Next"

   **Step 4 - Review:**
   - Review all details
   - Click "Create Exam"

   - You should see success message and redirect to Exams list

### Test Flow 2: Student Takes Exam

1. **Open New Incognito/Private Window**
   - This simulates a different user

2. **Register as Student:**
   - Go to: http://localhost:5173
   - Click "Register"
   - Fill form:
     - Email: `student@test.com`
     - Password: `Test123!@#`
     - First Name: `Jane`
     - Last Name: `Smith`
     - Role: Select "Student"
     - Student ID: `S001`
     - Program: `Computer Science`
     - Year: `2024`
   - Complete registration and login

3. **View Available Exams:**
   - Navigate to "Exams"
   - You should see the exam created by teacher
   - Click "Start Exam"

4. **Grant Camera Permission:**
   - Browser will ask for camera access
   - Click "Allow" (required for proctoring)

5. **Take the Exam:**
   - Exam will enter fullscreen mode
   - You'll see:
     - Timer counting down at top
     - Current question in main area
     - Question palette on right
     - Webcam feed (if proctoring enabled)

   - Answer questions:
     - Click options for MCQ
     - Type text for subjective questions
     - Use "Mark for Review" for questions you want to revisit
     - Use "Previous" and "Next" to navigate
     - Or click question numbers in palette

   - Test proctoring:
     - Try switching tabs (you'll get warning)
     - Try exiting fullscreen (violation recorded)
     - Move away from camera (face detection)

   - Click "Save Progress" to manually save
   - When done, click "Submit Exam"
   - Confirm submission

6. **View Results:**
   - After submission, you'll be redirected to Results page
   - You should see:
     - Overall score and percentage
     - Pass/Fail status
     - Grade (A+, A, B, C, D, F)
     - Time taken
     - Question-wise breakdown:
       - Your answers vs correct answers
       - AI feedback for subjective questions
       - Marks awarded per question
     - Proctoring violations (if any)

### Test Flow 3: View Reports (Teacher)

1. **Switch back to Teacher window**
   - Navigate to "Reports & Analytics"

2. **Review Analytics:**
   - Overview stats:
     - Total exams
     - Total attempts
     - Average scores
     - Pass rate

   - Exam-wise performance table
   - Top performers leaderboard
   - Question difficulty analysis
   - Recent attempts table

   - Use "Select Exam" filter to view specific exam data

3. **View Specific Student Result:**
   - Go to "Exams"
   - Click on the exam
   - View student attempts
   - Click on student's attempt to see detailed results

## Verification Checklist

- [ ] Backend running on port 5000
- [ ] AI service running on port 8000
- [ ] Frontend accessible at http://localhost:5173
- [ ] Can register as teacher
- [ ] Can create questions (all types)
- [ ] Can create exam with proctoring settings
- [ ] Can register as student
- [ ] Can see available exams
- [ ] Can start exam (camera permission works)
- [ ] Can answer all question types
- [ ] Timer counts down correctly
- [ ] Auto-save works (check console logs)
- [ ] Tab switch detection works
- [ ] Can submit exam
- [ ] Can view results with AI feedback
- [ ] Teacher can view reports
- [ ] Teacher can see student attempts

## Troubleshooting

### Backend won't start
```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000  # Windows
lsof -i :5000                  # Mac/Linux

# Kill the process or use different port
```

### AI Service errors
```bash
# Reinstall dependencies
pip install --upgrade -r requirements.txt

# Check Python version
python --version  # Must be 3.9+

# Verify Gemini API key is correct
echo $GEMINI_API_KEY  # Should show your key
```

### Frontend build errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Or use npm clean install
npm ci
```

### Database connection errors
- Verify Supabase URL and key in `backend/.env`
- Check if database schema was run successfully
- Go to Supabase dashboard → SQL Editor → History to see past queries
- Try running schema.sql again

### Camera not working in exam
- Check browser permissions (usually a camera icon in address bar)
- Try different browser (Chrome/Firefox recommended)
- Make sure no other application is using camera
- Check browser console for errors (F12 → Console tab)

### AI evaluation not working
- Verify Gemini API key is correct in `ai-service/.env`
- Check AI service logs in terminal
- Ensure AI service is running and accessible
- Test Gemini API directly: https://makersuite.google.com/app/prompts

## API Health Checks

Test if services are running:

```bash
# Backend health check
curl http://localhost:5000/api/health

# AI Service health check
curl http://localhost:8000/health

# Expected response: {"status": "healthy"}
```

## Advanced Testing

### Test with Multiple Students
1. Use different browsers or incognito windows
2. Register multiple students
3. Have them take the same exam
4. View comparative results in Reports

### Test Proctoring Features
1. Start exam
2. Try violations:
   - Switch to different tab
   - Exit fullscreen
   - Look away from camera
   - Have another person in frame
3. Check violations recorded in Results page

### Test Question Import/Export
1. Go to Question Bank
2. Create several questions
3. Click "Export" (when implemented)
4. Create new questions by importing

### Test with Real Gemini Evaluation
1. Create subjective questions with detailed model answers
2. Have students write varying quality answers
3. Check AI evaluation feedback and marks awarded
4. Verify feedback is helpful and accurate

## Performance Testing

### Load Test (Optional)
```bash
# Install artillery
npm install -g artillery

# Create test script
artillery quick --count 10 --num 50 http://localhost:5000/api/health

# This sends 50 requests from 10 virtual users
```

## Next Steps After Testing

1. **Customize the System:**
   - Update color scheme in frontend theme
   - Modify exam settings defaults
   - Add custom branding/logo

2. **Deploy to Production:**
   - Deploy backend to Railway/Render/Heroku
   - Deploy AI service to Railway/Render
   - Deploy frontend to Vercel/Netlify
   - Update environment variables with production URLs

3. **Add More Features:**
   - Email notifications
   - PDF report generation
   - Bulk question import from Excel
   - Live exam monitoring dashboard
   - Student performance analytics

## Support

If you encounter issues:
1. Check the terminal logs for errors
2. Review the troubleshooting section above
3. Check browser console (F12) for frontend errors
4. Verify all environment variables are set correctly
5. Ensure all three services are running

For detailed API documentation, see `FINAL_STATUS.md`.
