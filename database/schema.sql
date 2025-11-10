-- Online Examination System Database Schema
-- Database: Supabase (PostgreSQL)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- User Management Tables
-- =============================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
    profile_image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Student specific information
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id VARCHAR(50) UNIQUE NOT NULL,
    department VARCHAR(100),
    year INTEGER,
    semester INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Teacher specific information
CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    department VARCHAR(100),
    specialization VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Question Management Tables
-- =============================================

-- Question banks
CREATE TABLE question_banks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(100),
    created_by UUID NOT NULL REFERENCES users(id),
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Questions table
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_id UUID REFERENCES question_banks(id) ON DELETE CASCADE,
    question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('mcq', 'multi_correct', 'true_false', 'subjective', 'fill_blank')),
    question_text TEXT NOT NULL,
    question_image_url TEXT,
    marks DECIMAL(5, 2) NOT NULL DEFAULT 1.0,
    difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    explanation TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Question options (for MCQ, Multi-Correct, True/False)
CREATE TABLE question_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    option_image_url TEXT,
    is_correct BOOLEAN DEFAULT FALSE,
    option_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Question tags for categorization
CREATE TABLE question_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    tag VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(question_id, tag)
);

-- =============================================
-- Exam Management Tables
-- =============================================

-- Exams table
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(100),
    created_by UUID NOT NULL REFERENCES users(id),
    duration_minutes INTEGER NOT NULL,
    total_marks DECIMAL(7, 2) NOT NULL,
    passing_marks DECIMAL(7, 2),
    negative_marking BOOLEAN DEFAULT FALSE,
    negative_marks_percentage DECIMAL(5, 2) DEFAULT 0,
    randomize_questions BOOLEAN DEFAULT FALSE,
    randomize_options BOOLEAN DEFAULT FALSE,
    show_results_immediately BOOLEAN DEFAULT FALSE,
    allow_review BOOLEAN DEFAULT TRUE,
    proctoring_enabled BOOLEAN DEFAULT TRUE,
    instructions TEXT,
    scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Exam questions mapping
CREATE TABLE exam_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    question_order INTEGER,
    marks_override DECIMAL(5, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(exam_id, question_id)
);

-- Exam enrollments (which students can take which exam)
CREATE TABLE exam_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    enrolled_by UUID REFERENCES users(id),
    UNIQUE(exam_id, student_id)
);

-- =============================================
-- Exam Attempt & Response Tables
-- =============================================

-- Student exam attempts
CREATE TABLE exam_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP WITH TIME ZONE,
    time_taken_minutes INTEGER,
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'auto_submitted', 'terminated')),
    total_marks DECIMAL(7, 2),
    obtained_marks DECIMAL(7, 2),
    percentage DECIMAL(5, 2),
    is_passed BOOLEAN,
    proctoring_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Student answers
CREATE TABLE student_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answer_text TEXT,
    selected_option_ids UUID[],
    is_correct BOOLEAN,
    marks_obtained DECIMAL(5, 2),
    is_reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewer_comments TEXT,
    ai_evaluation_score DECIMAL(5, 2),
    ai_evaluation_feedback TEXT,
    time_spent_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(attempt_id, question_id)
);

-- =============================================
-- Proctoring Tables
-- =============================================

-- Proctoring sessions
CREATE TABLE proctoring_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID UNIQUE NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    browser_info JSONB,
    system_info JSONB,
    ip_address VARCHAR(45),
    pre_exam_verification_completed BOOLEAN DEFAULT FALSE,
    verification_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Proctoring events (suspicious activities detected)
CREATE TABLE proctoring_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES proctoring_sessions(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'face_not_detected',
        'multiple_faces',
        'no_face',
        'looking_away',
        'mobile_detected',
        'person_detected',
        'suspicious_object',
        'tab_switch',
        'window_blur',
        'fullscreen_exit',
        'suspicious_audio',
        'copy_paste',
        'right_click',
        'keyboard_shortcut'
    )),
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT,
    evidence_url TEXT,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Proctoring recordings
CREATE TABLE proctoring_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES proctoring_sessions(id) ON DELETE CASCADE,
    recording_type VARCHAR(20) CHECK (recording_type IN ('webcam', 'screen', 'audio')),
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT,
    duration_seconds INTEGER,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Reports & Analytics Tables
-- =============================================

-- Proctoring reports
CREATE TABLE proctoring_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID UNIQUE NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
    total_violations INTEGER DEFAULT 0,
    critical_violations INTEGER DEFAULT 0,
    high_violations INTEGER DEFAULT 0,
    medium_violations INTEGER DEFAULT 0,
    low_violations INTEGER DEFAULT 0,
    risk_score DECIMAL(5, 2),
    recommendation VARCHAR(50) CHECK (recommendation IN ('approved', 'review_required', 'flagged', 'rejected')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewer_comments TEXT,
    report_data JSONB,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance analytics
CREATE TABLE performance_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    metric_value DECIMAL(10, 2),
    metadata JSONB,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Indexes for Performance
-- =============================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_teachers_user_id ON teachers(user_id);

CREATE INDEX idx_questions_bank_id ON questions(bank_id);
CREATE INDEX idx_questions_type ON questions(question_type);
CREATE INDEX idx_question_options_question_id ON question_options(question_id);

CREATE INDEX idx_exams_created_by ON exams(created_by);
CREATE INDEX idx_exams_status ON exams(status);
CREATE INDEX idx_exams_scheduled_start ON exams(scheduled_start);
CREATE INDEX idx_exam_questions_exam_id ON exam_questions(exam_id);
CREATE INDEX idx_exam_enrollments_exam_id ON exam_enrollments(exam_id);
CREATE INDEX idx_exam_enrollments_student_id ON exam_enrollments(student_id);

CREATE INDEX idx_exam_attempts_exam_id ON exam_attempts(exam_id);
CREATE INDEX idx_exam_attempts_student_id ON exam_attempts(student_id);
CREATE INDEX idx_exam_attempts_status ON exam_attempts(status);
CREATE INDEX idx_student_answers_attempt_id ON student_answers(attempt_id);

CREATE INDEX idx_proctoring_sessions_attempt_id ON proctoring_sessions(attempt_id);
CREATE INDEX idx_proctoring_events_session_id ON proctoring_events(session_id);
CREATE INDEX idx_proctoring_events_type ON proctoring_events(event_type);
CREATE INDEX idx_proctoring_recordings_session_id ON proctoring_recordings(session_id);

CREATE INDEX idx_proctoring_reports_attempt_id ON proctoring_reports(attempt_id);
CREATE INDEX idx_performance_analytics_exam_id ON performance_analytics(exam_id);
CREATE INDEX idx_performance_analytics_student_id ON performance_analytics(student_id);

-- =============================================
-- Triggers for updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON exams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exam_attempts_updated_at BEFORE UPDATE ON exam_attempts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_answers_updated_at BEFORE UPDATE ON student_answers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_proctoring_reports_updated_at BEFORE UPDATE ON proctoring_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
