const { supabase } = require('../config/database');

/**
 * Get individual student performance report
 */
const getStudentPerformanceReport = async (req, res, next) => {
  try {
    const { student_id } = req.params;

    // Get all attempts by student
    const { data: attempts, error } = await supabase
      .from('exam_attempts')
      .select(`
        *,
        exams (title, subject, total_marks)
      `)
      .eq('student_id', student_id)
      .eq('status', 'submitted')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Calculate statistics
    const stats = {
      total_exams: attempts.length,
      total_marks_obtained: 0,
      total_marks_possible: 0,
      average_percentage: 0,
      exams_passed: 0,
      exams_failed: 0,
      subject_wise: {}
    };

    attempts.forEach(attempt => {
      if (attempt.obtained_marks !== null) {
        stats.total_marks_obtained += parseFloat(attempt.obtained_marks);
        stats.total_marks_possible += parseFloat(attempt.exams.total_marks);

        if (attempt.is_passed) {
          stats.exams_passed++;
        } else {
          stats.exams_failed++;
        }

        // Subject-wise stats
        const subject = attempt.exams.subject || 'Other';
        if (!stats.subject_wise[subject]) {
          stats.subject_wise[subject] = {
            exams: 0,
            obtained: 0,
            possible: 0,
            average: 0
          };
        }

        stats.subject_wise[subject].exams++;
        stats.subject_wise[subject].obtained += parseFloat(attempt.obtained_marks);
        stats.subject_wise[subject].possible += parseFloat(attempt.exams.total_marks);
      }
    });

    if (stats.total_marks_possible > 0) {
      stats.average_percentage = (stats.total_marks_obtained / stats.total_marks_possible) * 100;
    }

    // Calculate subject-wise averages
    Object.keys(stats.subject_wise).forEach(subject => {
      const subjectStats = stats.subject_wise[subject];
      subjectStats.average = (subjectStats.obtained / subjectStats.possible) * 100;
    });

    res.json({
      success: true,
      stats,
      attempts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get class-wise performance report
 */
const getClassPerformanceReport = async (req, res, next) => {
  try {
    const { exam_id } = req.params;

    // Get all attempts for the exam
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
      .eq('status', 'submitted');

    if (error) throw error;

    // Get exam details
    const { data: exam } = await supabase
      .from('exams')
      .select('*')
      .eq('id', exam_id)
      .single();

    // Calculate statistics
    const stats = {
      total_students: attempts.length,
      students_passed: 0,
      students_failed: 0,
      average_marks: 0,
      average_percentage: 0,
      highest_marks: 0,
      lowest_marks: exam?.total_marks || 0,
      median_marks: 0,
      standard_deviation: 0
    };

    const marks = [];

    attempts.forEach(attempt => {
      if (attempt.obtained_marks !== null) {
        const obtainedMarks = parseFloat(attempt.obtained_marks);
        marks.push(obtainedMarks);

        stats.average_marks += obtainedMarks;

        if (attempt.is_passed) {
          stats.students_passed++;
        } else {
          stats.students_failed++;
        }

        if (obtainedMarks > stats.highest_marks) {
          stats.highest_marks = obtainedMarks;
        }

        if (obtainedMarks < stats.lowest_marks) {
          stats.lowest_marks = obtainedMarks;
        }
      }
    });

    if (attempts.length > 0) {
      stats.average_marks = stats.average_marks / attempts.length;
      stats.average_percentage = (stats.average_marks / exam.total_marks) * 100;
    }

    // Calculate median
    if (marks.length > 0) {
      marks.sort((a, b) => a - b);
      const mid = Math.floor(marks.length / 2);
      stats.median_marks = marks.length % 2 === 0
        ? (marks[mid - 1] + marks[mid]) / 2
        : marks[mid];

      // Calculate standard deviation
      const variance = marks.reduce((acc, mark) => {
        return acc + Math.pow(mark - stats.average_marks, 2);
      }, 0) / marks.length;
      stats.standard_deviation = Math.sqrt(variance);
    }

    // Mark distribution
    const distribution = {
      excellent: 0,  // 90-100%
      good: 0,       // 75-89%
      average: 0,    // 60-74%
      below_average: 0, // 40-59%
      poor: 0        // 0-39%
    };

    marks.forEach(mark => {
      const percentage = (mark / exam.total_marks) * 100;
      if (percentage >= 90) distribution.excellent++;
      else if (percentage >= 75) distribution.good++;
      else if (percentage >= 60) distribution.average++;
      else if (percentage >= 40) distribution.below_average++;
      else distribution.poor++;
    });

    res.json({
      success: true,
      exam,
      stats,
      distribution,
      attempts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get question-wise analysis
 */
const getQuestionWiseAnalysis = async (req, res, next) => {
  try {
    const { exam_id } = req.params;

    // Get all exam questions
    const { data: examQuestions } = await supabase
      .from('exam_questions')
      .select(`
        *,
        questions (*)
      `)
      .eq('exam_id', exam_id);

    // Get all attempts
    const { data: attempts } = await supabase
      .from('exam_attempts')
      .select('id')
      .eq('exam_id', exam_id)
      .eq('status', 'submitted');

    const attemptIds = attempts.map(a => a.id);

    // Get all answers
    const { data: answers } = await supabase
      .from('student_answers')
      .select('*')
      .in('attempt_id', attemptIds);

    // Analyze each question
    const analysis = examQuestions.map(eq => {
      const questionAnswers = answers.filter(a => a.question_id === eq.question_id);

      const stats = {
        question_id: eq.question_id,
        question_text: eq.questions.question_text,
        question_type: eq.questions.question_type,
        marks: eq.marks_override || eq.questions.marks,
        total_attempts: questionAnswers.length,
        correct_answers: 0,
        incorrect_answers: 0,
        unanswered: attempts.length - questionAnswers.length,
        average_marks: 0,
        accuracy: 0
      };

      let totalMarks = 0;
      questionAnswers.forEach(answer => {
        if (answer.is_correct) {
          stats.correct_answers++;
        } else {
          stats.incorrect_answers++;
        }
        totalMarks += parseFloat(answer.marks_obtained || 0);
      });

      if (questionAnswers.length > 0) {
        stats.average_marks = totalMarks / questionAnswers.length;
        stats.accuracy = (stats.correct_answers / questionAnswers.length) * 100;
      }

      return stats;
    });

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get dashboard statistics
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const userRole = req.session.user.role;

    const stats = {};

    if (userRole === 'student') {
      // Get student record
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', userId)
        .single();

      // Get enrolled exams count
      const { count: enrolledCount } = await supabase
        .from('exam_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', student.id);

      // Get completed exams count
      const { count: completedCount } = await supabase
        .from('exam_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', student.id)
        .eq('status', 'submitted');

      // Get pending exams count
      const { count: pendingCount } = await supabase
        .from('exam_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', student.id)
        .eq('status', 'in_progress');

      // Get average performance
      const { data: attempts } = await supabase
        .from('exam_attempts')
        .select('percentage')
        .eq('student_id', student.id)
        .eq('status', 'submitted')
        .not('percentage', 'is', null);

      let averagePercentage = 0;
      if (attempts && attempts.length > 0) {
        const sum = attempts.reduce((acc, a) => acc + parseFloat(a.percentage), 0);
        averagePercentage = sum / attempts.length;
      }

      stats.enrolled_exams = enrolledCount;
      stats.completed_exams = completedCount;
      stats.pending_exams = pendingCount;
      stats.average_percentage = averagePercentage;

    } else if (userRole === 'teacher') {
      // Get created exams count
      const { count: examsCount } = await supabase
        .from('exams')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId);

      // Get active exams count
      const { count: activeCount } = await supabase
        .from('exams')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId)
        .eq('status', 'active');

      // Get total question banks
      const { count: banksCount } = await supabase
        .from('question_banks')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId);

      // Get total questions
      const { count: questionsCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId);

      stats.total_exams = examsCount;
      stats.active_exams = activeCount;
      stats.question_banks = banksCount;
      stats.total_questions = questionsCount;

    } else if (userRole === 'admin') {
      // Get system-wide statistics
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      const { count: studentsCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

      const { count: teachersCount } = await supabase
        .from('teachers')
        .select('*', { count: 'exact', head: true });

      const { count: examsCount } = await supabase
        .from('exams')
        .select('*', { count: 'exact', head: true });

      stats.total_users = usersCount;
      stats.total_students = studentsCount;
      stats.total_teachers = teachersCount;
      stats.total_exams = examsCount;
    }

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudentPerformanceReport,
  getClassPerformanceReport,
  getQuestionWiseAnalysis,
  getDashboardStats
};
