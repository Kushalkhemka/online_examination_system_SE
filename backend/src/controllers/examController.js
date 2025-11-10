const { supabase } = require('../config/database');

/**
 * Create new exam
 */
const createExam = async (req, res, next) => {
  try {
    const {
      title,
      description,
      subject,
      duration_minutes,
      total_marks,
      passing_marks,
      negative_marking,
      negative_marks_percentage,
      randomize_questions,
      randomize_options,
      show_results_immediately,
      allow_review,
      proctoring_enabled,
      instructions,
      scheduled_start,
      scheduled_end,
      questions,
      enrolled_students
    } = req.body;

    const userId = req.session.user.id;

    // Create exam
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .insert({
        title,
        description,
        subject,
        created_by: userId,
        duration_minutes,
        total_marks,
        passing_marks,
        negative_marking,
        negative_marks_percentage,
        randomize_questions,
        randomize_options,
        show_results_immediately,
        allow_review,
        proctoring_enabled,
        instructions,
        scheduled_start,
        scheduled_end,
        status: 'draft'
      })
      .select()
      .single();

    if (examError) throw examError;

    // Add questions to exam
    if (questions && questions.length > 0) {
      const examQuestionsData = questions.map((q, index) => ({
        exam_id: exam.id,
        question_id: q.question_id,
        question_order: index + 1,
        marks_override: q.marks_override || null
      }));

      const { error: questionsError } = await supabase
        .from('exam_questions')
        .insert(examQuestionsData);

      if (questionsError) throw questionsError;
    }

    // Enroll students if provided
    if (enrolled_students && enrolled_students.length > 0) {
      const enrollmentsData = enrolled_students.map(studentId => ({
        exam_id: exam.id,
        student_id: studentId,
        enrolled_by: userId
      }));

      await supabase.from('exam_enrollments').insert(enrollmentsData);
    }

    res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      exam
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all exams
 */
const getExams = async (req, res, next) => {
  try {
    const { status, subject, page = 1, limit = 20 } = req.query;
    const userId = req.session.user.id;
    const userRole = req.session.user.role;

    let query = supabase
      .from('exams')
      .select(`
        *,
        users!exams_created_by_fkey(first_name, last_name)
      `, { count: 'exact' });

    // Filter based on role
    if (userRole === 'teacher') {
      query = query.eq('created_by', userId);
    } else if (userRole === 'student') {
      // Get exams where student is enrolled
      const { data: enrollments } = await supabase
        .from('exam_enrollments')
        .select('exam_id')
        .eq('student_id', userId);

      const examIds = enrollments?.map(e => e.exam_id) || [];
      if (examIds.length > 0) {
        query = query.in('id', examIds);
      } else {
        return res.json({
          success: true,
          exams: [],
          pagination: { page: 1, limit, total: 0, pages: 0 }
        });
      }
    }

    if (status) query = query.eq('status', status);
    if (subject) query = query.eq('subject', subject);

    // Pagination
    const offset = (page - 1) * limit;
    query = query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    const { data: exams, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      exams,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get exam by ID with questions
 */
const getExamById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;
    const userRole = req.session.user.role;

    // Get exam details
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select(`
        *,
        users!exams_created_by_fkey(first_name, last_name)
      `)
      .eq('id', id)
      .single();

    if (examError) throw examError;

    // Check access permissions
    if (userRole === 'teacher' && exam.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (userRole === 'student') {
      const { data: enrollment } = await supabase
        .from('exam_enrollments')
        .select('id')
        .eq('exam_id', id)
        .eq('student_id', userId)
        .single();

      if (!enrollment) {
        return res.status(403).json({
          success: false,
          message: 'You are not enrolled in this exam'
        });
      }
    }

    // Get exam questions
    const { data: examQuestions } = await supabase
      .from('exam_questions')
      .select(`
        *,
        questions (
          *,
          question_options (*)
        )
      `)
      .eq('exam_id', id)
      .order('question_order');

    exam.questions = examQuestions;

    // Get enrollment count
    const { count: enrollmentCount } = await supabase
      .from('exam_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('exam_id', id);

    exam.enrolled_count = enrollmentCount;

    res.json({
      success: true,
      exam
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update exam
 */
const updateExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.session.user.id;

    // Check ownership
    const { data: exam } = await supabase
      .from('exams')
      .select('created_by')
      .eq('id', id)
      .single();

    if (exam.created_by !== userId && req.session.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Update exam
    const { data: updatedExam, error } = await supabase
      .from('exams')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Exam updated successfully',
      exam: updatedExam
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete exam
 */
const deleteExam = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('exams')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Exam deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Enroll students in exam
 */
const enrollStudents = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { student_ids } = req.body;
    const userId = req.session.user.id;

    const enrollmentsData = student_ids.map(studentId => ({
      exam_id: id,
      student_id: studentId,
      enrolled_by: userId
    }));

    const { error } = await supabase
      .from('exam_enrollments')
      .insert(enrollmentsData);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Students enrolled successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get enrolled students for exam
 */
const getEnrolledStudents = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: enrollments, error } = await supabase
      .from('exam_enrollments')
      .select(`
        *,
        students!exam_enrollments_student_id_fkey (
          *,
          users!students_user_id_fkey (first_name, last_name, email)
        )
      `)
      .eq('exam_id', id);

    if (error) throw error;

    res.json({
      success: true,
      enrollments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Publish exam (change status from draft to scheduled)
 */
const publishExam = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: exam, error } = await supabase
      .from('exams')
      .update({ status: 'scheduled' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Exam published successfully',
      exam
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createExam,
  getExams,
  getExamById,
  updateExam,
  deleteExam,
  enrollStudents,
  getEnrolledStudents,
  publishExam
};
