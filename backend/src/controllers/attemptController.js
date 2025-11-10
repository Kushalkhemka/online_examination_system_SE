const { supabase } = require('../config/database');
const axios = require('axios');

/**
 * Start exam attempt
 */
const startExamAttempt = async (req, res, next) => {
  try {
    const { exam_id } = req.body;
    const studentId = req.session.user.id;

    // Get student record
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', studentId)
      .single();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found'
      });
    }

    // Check if exam exists and is active
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('*')
      .eq('id', exam_id)
      .single();

    if (examError || !exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Check if exam is active
    const now = new Date();
    const startTime = new Date(exam.scheduled_start);
    const endTime = new Date(exam.scheduled_end);

    if (now < startTime) {
      return res.status(400).json({
        success: false,
        message: 'Exam has not started yet'
      });
    }

    if (now > endTime) {
      return res.status(400).json({
        success: false,
        message: 'Exam has ended'
      });
    }

    // Check enrollment
    const { data: enrollment } = await supabase
      .from('exam_enrollments')
      .select('id')
      .eq('exam_id', exam_id)
      .eq('student_id', student.id)
      .single();

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this exam'
      });
    }

    // Check if already attempted
    const { data: existingAttempt } = await supabase
      .from('exam_attempts')
      .select('id, status')
      .eq('exam_id', exam_id)
      .eq('student_id', student.id)
      .single();

    if (existingAttempt) {
      if (existingAttempt.status === 'in_progress') {
        return res.status(400).json({
          success: false,
          message: 'You already have an active attempt for this exam',
          attempt_id: existingAttempt.id
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'You have already completed this exam'
        });
      }
    }

    // Create exam attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('exam_attempts')
      .insert({
        exam_id,
        student_id: student.id,
        status: 'in_progress'
      })
      .select()
      .single();

    if (attemptError) throw attemptError;

    // Get exam questions
    const { data: examQuestions } = await supabase
      .from('exam_questions')
      .select(`
        *,
        questions (
          id,
          question_type,
          question_text,
          question_image_url,
          marks,
          question_options (
            id,
            option_text,
            option_image_url,
            option_order
          )
        )
      `)
      .eq('exam_id', exam_id)
      .order('question_order');

    // Randomize questions if enabled
    let questions = examQuestions.map(eq => eq.questions);
    if (exam.randomize_questions) {
      questions = shuffleArray(questions);
    }

    // Randomize options if enabled
    if (exam.randomize_options) {
      questions = questions.map(q => ({
        ...q,
        question_options: shuffleArray(q.question_options)
      }));
    }

    res.status(201).json({
      success: true,
      message: 'Exam attempt started',
      attempt: {
        id: attempt.id,
        exam_id: attempt.exam_id,
        started_at: attempt.started_at,
        duration_minutes: exam.duration_minutes
      },
      exam: {
        id: exam.id,
        title: exam.title,
        instructions: exam.instructions,
        duration_minutes: exam.duration_minutes,
        total_marks: exam.total_marks,
        allow_review: exam.allow_review
      },
      questions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Save answer
 */
const saveAnswer = async (req, res, next) => {
  try {
    const { attempt_id, question_id, answer_text, selected_option_ids, time_spent_seconds } = req.body;

    // Check if answer already exists
    const { data: existingAnswer } = await supabase
      .from('student_answers')
      .select('id')
      .eq('attempt_id', attempt_id)
      .eq('question_id', question_id)
      .single();

    if (existingAnswer) {
      // Update existing answer
      const { data: answer, error } = await supabase
        .from('student_answers')
        .update({
          answer_text,
          selected_option_ids,
          time_spent_seconds
        })
        .eq('id', existingAnswer.id)
        .select()
        .single();

      if (error) throw error;

      return res.json({
        success: true,
        message: 'Answer updated',
        answer
      });
    } else {
      // Create new answer
      const { data: answer, error } = await supabase
        .from('student_answers')
        .insert({
          attempt_id,
          question_id,
          answer_text,
          selected_option_ids,
          time_spent_seconds
        })
        .select()
        .single();

      if (error) throw error;

      return res.json({
        success: true,
        message: 'Answer saved',
        answer
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Submit exam
 */
const submitExam = async (req, res, next) => {
  try {
    const { attempt_id } = req.body;

    // Get attempt details
    const { data: attempt, error: attemptError } = await supabase
      .from('exam_attempts')
      .select('*, exams(*)')
      .eq('id', attempt_id)
      .single();

    if (attemptError || !attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found'
      });
    }

    if (attempt.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Exam already submitted'
      });
    }

    // Calculate time taken
    const startedAt = new Date(attempt.started_at);
    const submittedAt = new Date();
    const timeTakenMinutes = Math.round((submittedAt - startedAt) / 60000);

    // Update attempt status
    await supabase
      .from('exam_attempts')
      .update({
        status: 'submitted',
        submitted_at: submittedAt,
        time_taken_minutes: timeTakenMinutes
      })
      .eq('id', attempt_id);

    // Trigger evaluation
    try {
      await axios.post(`${process.env.AI_SERVICE_URL}/evaluate`, {
        attempt_id
      });
    } catch (error) {
      console.error('Failed to trigger evaluation:', error.message);
    }

    res.json({
      success: true,
      message: 'Exam submitted successfully. Results will be available soon.',
      time_taken_minutes: timeTakenMinutes
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get attempt results
 */
const getAttemptResults = async (req, res, next) => {
  try {
    const { attempt_id } = req.params;
    const userId = req.session.user.id;

    // Get attempt with exam and student details
    const { data: attempt, error } = await supabase
      .from('exam_attempts')
      .select(`
        *,
        exams (*),
        students (
          *,
          users!students_user_id_fkey(*)
        )
      `)
      .eq('id', attempt_id)
      .single();

    if (error || !attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found'
      });
    }

    // Check access
    if (attempt.students.user_id !== userId && req.session.user.role !== 'teacher' && req.session.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get all answers
    const { data: answers } = await supabase
      .from('student_answers')
      .select(`
        *,
        questions (
          *,
          question_options (*)
        )
      `)
      .eq('attempt_id', attempt_id);

    attempt.answers = answers;

    res.json({
      success: true,
      attempt
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get student's attempts
 */
const getMyAttempts = async (req, res, next) => {
  try {
    const userId = req.session.user.id;

    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found'
      });
    }

    const { data: attempts, error } = await supabase
      .from('exam_attempts')
      .select(`
        *,
        exams (title, subject, total_marks)
      `)
      .eq('student_id', student.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      attempts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all attempts for an exam (teacher/admin only)
 */
const getExamAttempts = async (req, res, next) => {
  try {
    const { exam_id } = req.params;

    const { data: attempts, error } = await supabase
      .from('exam_attempts')
      .select(`
        *,
        students (
          *,
          users!students_user_id_fkey(first_name, last_name, email)
        )
      `)
      .eq('exam_id', exam_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      attempts
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to shuffle array
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

module.exports = {
  startExamAttempt,
  saveAnswer,
  submitExam,
  getAttemptResults,
  getMyAttempts,
  getExamAttempts
};
