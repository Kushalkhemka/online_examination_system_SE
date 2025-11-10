const { supabase } = require('../config/database');
const { uploadQuestionImage } = require('../config/storage');

/**
 * Create new question
 */
const createQuestion = async (req, res, next) => {
  try {
    const {
      bank_id,
      question_type,
      question_text,
      marks,
      difficulty,
      explanation,
      options,
      tags
    } = req.body;

    const userId = req.session.user.id;

    // Create question
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .insert({
        bank_id,
        question_type,
        question_text,
        marks,
        difficulty,
        explanation,
        created_by: userId
      })
      .select()
      .single();

    if (questionError) throw questionError;

    // Create options if provided
    if (options && options.length > 0) {
      const optionsData = options.map((opt, index) => ({
        question_id: question.id,
        option_text: opt.option_text,
        is_correct: opt.is_correct || false,
        option_order: index + 1
      }));

      const { error: optionsError } = await supabase
        .from('question_options')
        .insert(optionsData);

      if (optionsError) throw optionsError;
    }

    // Create tags if provided
    if (tags && tags.length > 0) {
      const tagsData = tags.map(tag => ({
        question_id: question.id,
        tag
      }));

      await supabase.from('question_tags').insert(tagsData);
    }

    // Fetch complete question with options
    const completeQuestion = await getQuestionById(question.id);

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      question: completeQuestion
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get question by ID
 */
const getQuestionById = async (questionId) => {
  const { data: question } = await supabase
    .from('questions')
    .select(`
      *,
      question_options (*),
      question_tags (tag)
    `)
    .eq('id', questionId)
    .single();

  return question;
};

/**
 * Get all questions with filters
 */
const getQuestions = async (req, res, next) => {
  try {
    const {
      bank_id,
      question_type,
      difficulty,
      page = 1,
      limit = 50
    } = req.query;

    let query = supabase
      .from('questions')
      .select(`
        *,
        question_options (*),
        question_tags (tag)
      `, { count: 'exact' });

    if (bank_id) query = query.eq('bank_id', bank_id);
    if (question_type) query = query.eq('question_type', question_type);
    if (difficulty) query = query.eq('difficulty', difficulty);

    // Pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: questions, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      questions,
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
 * Update question
 */
const updateQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      question_text,
      question_type,
      marks,
      difficulty,
      explanation,
      options,
      tags
    } = req.body;

    // Update question
    const { data: question, error: updateError } = await supabase
      .from('questions')
      .update({
        question_text,
        question_type,
        marks,
        difficulty,
        explanation
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Update options if provided
    if (options) {
      // Delete existing options
      await supabase
        .from('question_options')
        .delete()
        .eq('question_id', id);

      // Insert new options
      if (options.length > 0) {
        const optionsData = options.map((opt, index) => ({
          question_id: id,
          option_text: opt.option_text,
          is_correct: opt.is_correct || false,
          option_order: index + 1
        }));

        await supabase.from('question_options').insert(optionsData);
      }
    }

    // Update tags if provided
    if (tags) {
      await supabase.from('question_tags').delete().eq('question_id', id);

      if (tags.length > 0) {
        const tagsData = tags.map(tag => ({
          question_id: id,
          tag
        }));

        await supabase.from('question_tags').insert(tagsData);
      }
    }

    const completeQuestion = await getQuestionById(id);

    res.json({
      success: true,
      message: 'Question updated successfully',
      question: completeQuestion
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete question
 */
const deleteQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create question bank
 */
const createQuestionBank = async (req, res, next) => {
  try {
    const { name, description, subject, is_public } = req.body;
    const userId = req.session.user.id;

    const { data: bank, error } = await supabase
      .from('question_banks')
      .insert({
        name,
        description,
        subject,
        is_public,
        created_by: userId
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Question bank created successfully',
      bank
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all question banks
 */
const getQuestionBanks = async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const { subject } = req.query;

    let query = supabase
      .from('question_banks')
      .select('*, users!question_banks_created_by_fkey(first_name, last_name)');

    // Users can see their own banks or public banks
    query = query.or(`created_by.eq.${userId},is_public.eq.true`);

    if (subject) {
      query = query.eq('subject', subject);
    }

    const { data: banks, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      banks
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Import questions from JSON
 */
const importQuestions = async (req, res, next) => {
  try {
    const { bank_id, questions } = req.body;
    const userId = req.session.user.id;

    const createdQuestions = [];

    for (const q of questions) {
      const { data: question, error } = await supabase
        .from('questions')
        .insert({
          bank_id,
          question_type: q.question_type,
          question_text: q.question_text,
          marks: q.marks,
          difficulty: q.difficulty,
          explanation: q.explanation,
          created_by: userId
        })
        .select()
        .single();

      if (error) throw error;

      // Insert options
      if (q.options && q.options.length > 0) {
        const optionsData = q.options.map((opt, index) => ({
          question_id: question.id,
          option_text: opt.option_text,
          is_correct: opt.is_correct,
          option_order: index + 1
        }));

        await supabase.from('question_options').insert(optionsData);
      }

      createdQuestions.push(question);
    }

    res.status(201).json({
      success: true,
      message: `${createdQuestions.length} questions imported successfully`,
      count: createdQuestions.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export questions to JSON
 */
const exportQuestions = async (req, res, next) => {
  try {
    const { bank_id } = req.query;

    let query = supabase
      .from('questions')
      .select(`
        *,
        question_options (*),
        question_tags (tag)
      `);

    if (bank_id) {
      query = query.eq('bank_id', bank_id);
    }

    const { data: questions, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      questions,
      count: questions.length
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createQuestion,
  getQuestions,
  updateQuestion,
  deleteQuestion,
  createQuestionBank,
  getQuestionBanks,
  importQuestions,
  exportQuestions
};
