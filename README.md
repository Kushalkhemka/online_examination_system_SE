# Online Examination System with AI Proctoring

A comprehensive full-stack online examination platform with advanced AI-powered proctoring and automatic evaluation capabilities.

## 🌟 Features

### 1. User Management
- **Role-based Access Control**: Admin, Teacher, Student roles
- **Session-based Authentication**: Secure login/logout
- **User Profiles**: Manage personal information and credentials

### 2. Question Management
- **Multiple Question Types**:
  - Multiple Choice Questions (MCQ)
  - Multi-Correct Questions
  - True/False Questions
  - Subjective Questions
  - Fill in the Blanks
- **Question Banks**: Organize questions by subject/topic
- **Import/Export**: Bulk import/export questions in JSON format
- **Rich Content**: Support for images in questions and options

### 3. Exam Creation & Management
- **Flexible Exam Configuration**:
  - Duration control
  - Total marks and passing marks
  - Negative marking policies
  - Question and option randomization
- **Scheduling**: Set start and end times
- **Student Enrollment**: Bulk or individual enrollment
- **Draft/Publish Workflow**: Review before publishing

### 4. AI-Powered Proctoring System ⭐
- **Pre-Exam Verification**: System check and student identity verification
- **Real-time Monitoring**:
  - Webcam feed capture
  - Screen recording
  - Audio monitoring
  - Tab/window switch detection
- **AI-Based Violation Detection**:
  - Face detection (no face, multiple faces)
  - Gaze tracking (looking away detection)
  - Mobile phone detection
  - Suspicious object detection
  - Multiple person detection
- **Automated Reporting**: Risk score and violation summary

### 5. Exam Interface
- **Student-Friendly UI**:
  - Question navigation with progress indicator
  - Question palette/map
  - Mark for review functionality
  - Auto-save answers
  - Timer with warnings
- **Image Support**: Display images in questions
- **Responsive Design**: Works on various screen sizes

### 6. AI-Based Evaluation (Google Gemini 2.5 Pro)
- **Automatic Grading**:
  - MCQ/Multi-correct: Instant evaluation
  - Subjective: AI-powered content analysis
  - Fill in blanks: Fuzzy matching and semantic understanding
- **Detailed Feedback**: Strengths, weaknesses, and improvement suggestions
- **Partial Marking**: For subjective answers

### 7. Comprehensive Reports
- **Student Performance Reports**: Individual analysis
- **Class Performance Reports**: Overall statistics and distribution
- **Question-wise Analysis**: Difficulty and accuracy metrics
- **Proctoring Reports**: Detailed violation logs with evidence
- **Dashboard Analytics**: Visual insights with charts

## 🏗️ Architecture

### Technology Stack

#### Backend
- **Runtime**: Node.js with Express.js
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Socket.io for proctoring streams
- **Storage**: GCP Cloud Storage for media files
- **Authentication**: Session-based with express-session

#### AI Service (Python)
- **Framework**: FastAPI
- **ML Libraries**:
  - MediaPipe (Face detection and tracking)
  - OpenCV (Image processing)
  - TensorFlow (Object detection)
  - Google Gemini 2.5 Pro (AI evaluation)

#### Frontend
- **Framework**: React 18
- **UI Library**: Material-UI (MUI)
- **State Management**: React Context API
- **Routing**: React Router v6
- **Charts**: Recharts
- **Camera**: react-webcam

### System Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   React         │◄───────►│  Node.js/Express │◄───────►│   Supabase      │
│   Frontend      │         │     Backend      │         │   PostgreSQL    │
└────────┬────────┘         └────────┬─────────┘         └─────────────────┘
         │                           │
         │                           │
         │                  ┌────────▼─────────┐
         │                  │   Socket.io      │
         │                  │  (Real-time)     │
         │                  └──────────────────┘
         │
         │                  ┌──────────────────┐
         └─────────────────►│  Python AI       │
                            │  Service         │
                            │  (FastAPI)       │
                            └────────┬─────────┘
                                     │
                            ┌────────▼─────────┐
                            │  GCP Cloud       │
                            │  Storage         │
                            └──────────────────┘
```

## 📦 Project Structure

```
online_examination_system_SE/
├── backend/                    # Node.js/Express backend
│   ├── src/
│   │   ├── config/            # Database, storage config
│   │   ├── controllers/       # Route controllers
│   │   ├── middleware/        # Auth, validation, error handling
│   │   ├── routes/            # API routes
│   │   └── services/          # Business logic
│   ├── server.js              # Main server file
│   └── package.json
│
├── ai-service/                # Python AI service
│   ├── proctoring/           # Proctoring detection
│   │   └── detector.py       # Face, object detection
│   ├── evaluation/           # AI evaluation
│   │   └── gemini_evaluator.py
│   ├── main.py               # FastAPI application
│   └── requirements.txt
│
├── frontend/                  # React frontend
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── contexts/         # React contexts
│   │   ├── pages/            # Page components
│   │   ├── services/         # API services
│   │   └── utils/            # Utility functions
│   ├── public/
│   └── package.json
│
├── database/
│   └── schema.sql            # Database schema
│
└── docs/                      # Documentation
```

## 🚀 Setup Instructions

### Prerequisites

- Node.js (v18+)
- Python (v3.9+)
- PostgreSQL (via Supabase)
- GCP Account (for Cloud Storage)
- Google Gemini API Key

### 1. Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the schema from `database/schema.sql` in Supabase SQL Editor
3. Note your Supabase URL and service role key

### 2. GCP Cloud Storage Setup

1. Create a GCP project
2. Enable Cloud Storage API
3. Create a storage bucket
4. Create a service account and download JSON credentials
5. Place credentials file in backend directory as `gcp-credentials.json`

### 3. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
nano .env

# Required environment variables:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - SESSION_SECRET
# - GCP_PROJECT_ID
# - GCP_BUCKET_NAME
# - GCP_CREDENTIALS_PATH
# - GEMINI_API_KEY (for backend reference)

# Start server
npm run dev
```

Backend runs on: http://localhost:5000

### 4. AI Service Setup

```bash
cd ai-service

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
nano .env

# Required environment variables:
# - GEMINI_API_KEY
# - SUPABASE_URL
# - SUPABASE_KEY

# Start service
python main.py
```

AI Service runs on: http://localhost:8000

### 5. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:5000/api" > .env

# Start development server
npm run dev
```

Frontend runs on: http://localhost:3000

## 🔑 API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Question Endpoints

- `POST /api/questions` - Create question
- `GET /api/questions` - Get all questions
- `PUT /api/questions/:id` - Update question
- `DELETE /api/questions/:id` - Delete question
- `POST /api/questions/import` - Import questions
- `GET /api/questions/export` - Export questions

### Exam Endpoints

- `POST /api/exams` - Create exam
- `GET /api/exams` - Get all exams
- `GET /api/exams/:id` - Get exam by ID
- `PUT /api/exams/:id` - Update exam
- `DELETE /api/exams/:id` - Delete exam
- `POST /api/exams/:id/publish` - Publish exam

### Exam Attempt Endpoints

- `POST /api/attempts/start` - Start exam attempt
- `POST /api/attempts/save-answer` - Save answer
- `POST /api/attempts/submit` - Submit exam
- `GET /api/attempts/my-attempts` - Get student attempts
- `GET /api/attempts/:id/results` - Get results

### Proctoring Endpoints

- `POST /api/proctoring/initialize` - Initialize session
- `POST /api/proctoring/event` - Log violation
- `POST /api/proctoring/upload` - Upload recording
- `POST /api/proctoring/analyze-frame` - Analyze frame
- `GET /api/proctoring/report/:attemptId` - Get report

### Report Endpoints

- `GET /api/reports/dashboard` - Dashboard stats
- `GET /api/reports/student/:id/performance` - Student report
- `GET /api/reports/class/:examId/performance` - Class report

## 🧪 Testing

### Create Sample Data

1. **Register Users**:
   - Admin: admin@test.com
   - Teacher: teacher@test.com
   - Student: student@test.com

2. **Create Question Bank** (as Teacher)

3. **Add Questions** to the bank

4. **Create Exam** with questions

5. **Enroll Students** in the exam

6. **Take Exam** as student with proctoring

7. **View Results** and reports

### Test Proctoring Features

The proctoring system detects:
- Face absence (move out of camera frame)
- Multiple faces (bring another person)
- Looking away (look left/right significantly)
- Tab switching (switch to another tab)
- Screen minimizing

## 🔒 Security Features

- Session-based authentication with secure cookies
- Password hashing with bcrypt
- SQL injection prevention via parameterized queries
- XSS protection with helmet.js
- Rate limiting on API endpoints
- CORS configuration
- Secure file upload validation

## 📊 Database Schema

Key tables:
- `users` - User accounts
- `students` - Student information
- `teachers` - Teacher information
- `questions` - Question bank
- `question_options` - MCQ options
- `exams` - Exam configuration
- `exam_attempts` - Student attempts
- `student_answers` - Submitted answers
- `proctoring_sessions` - Proctoring data
- `proctoring_events` - Violation logs
- `proctoring_reports` - Analysis reports

See `database/schema.sql` for complete schema.

## 🤖 AI Features

### Proctoring Detection

Uses **MediaPipe** for:
- Face detection and tracking
- Face mesh for gaze estimation
- Hand detection for suspicious activity
- Pose estimation

### Answer Evaluation

Uses **Google Gemini 2.5 Pro** for:
- Subjective answer evaluation
- Contextual understanding
- Detailed feedback generation
- Partial marking based on rubrics

## 🎨 Frontend Pages

- **Login/Register**: User authentication
- **Dashboard**: Role-specific dashboard with statistics
- **Exam List**: Browse available exams
- **Question Bank**: Manage questions (Teacher)
- **Create Exam**: Design and configure exams (Teacher)
- **Exam Interface**: Take exam with proctoring (Student)
- **Results**: View exam results and feedback
- **Reports**: Performance analytics (Teacher/Admin)

## 📝 Usage Flow

### For Teachers:
1. Login with teacher credentials
2. Create question bank
3. Add questions (MCQ, subjective, etc.)
4. Create exam from question bank
5. Configure exam settings (duration, marks, proctoring)
6. Enroll students
7. Publish exam
8. Monitor live proctoring (optional)
9. View results and reports
10. Generate analytics

### For Students:
1. Login with student credentials
2. View enrolled exams
3. Start exam when available
4. Complete pre-exam verification
5. Enable webcam and screen sharing
6. Answer questions
7. Submit exam
8. View results and feedback

## 🐛 Troubleshooting

### Backend Issues

**Database connection fails**:
- Verify Supabase URL and keys in `.env`
- Check network connectivity
- Ensure database schema is created

**GCP upload fails**:
- Verify GCP credentials file path
- Check bucket permissions
- Ensure bucket name is correct

### AI Service Issues

**MediaPipe errors**:
```bash
# Install system dependencies (Ubuntu/Debian)
sudo apt-get install libgl1-mesa-glx
```

**Gemini API errors**:
- Verify API key is valid
- Check API quota limits
- Ensure correct model name

### Frontend Issues

**API calls fail**:
- Check backend is running on port 5000
- Verify CORS settings
- Check browser console for errors

**Camera not working**:
- Grant camera permissions in browser
- Use HTTPS in production
- Check camera is not used by another app

## 🚀 Deployment

### Backend Deployment (Heroku/Railway)

```bash
# Add engines to package.json
"engines": {
  "node": "18.x"
}

# Deploy
git push heroku main
```

### Frontend Deployment (Vercel/Netlify)

```bash
# Build
npm run build

# Deploy to Vercel
vercel --prod

# Or deploy to Netlify
netlify deploy --prod
```

### AI Service Deployment (GCP Cloud Run)

```dockerfile
# Dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "main.py"]
```

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Google Gemini API](https://ai.google.dev/docs)
- [MediaPipe Documentation](https://google.github.io/mediapipe/)
- [Socket.io Documentation](https://socket.io/docs/)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 👥 Team

Developed as a comprehensive examination management system for educational institutions.

## 📧 Support

For issues and questions:
- Create an issue on GitHub
- Check documentation
- Review troubleshooting section

---

**Note**: This is a complete MVP implementation. For production use, consider:
- Implementing comprehensive testing
- Adding more robust error handling
- Scaling infrastructure
- Enhanced security measures
- Performance optimization
- Accessibility improvements
