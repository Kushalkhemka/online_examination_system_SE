const { supabase } = require('../config/database');
const { uploadProctoringMedia } = require('../config/storage');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

/**
 * Initialize proctoring session
 */
const initializeProctoringSession = async (req, res, next) => {
  try {
    const { attempt_id, browser_info, system_info } = req.body;

    // Verify attempt exists and belongs to user
    const { data: attempt, error: attemptError } = await supabase
      .from('exam_attempts')
      .select('*, students(*)')
      .eq('id', attempt_id)
      .single();

    if (attemptError || !attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found'
      });
    }

    if (attempt.students.user_id !== req.session.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Create proctoring session
    const sessionToken = uuidv4();
    const { data: session, error: sessionError } = await supabase
      .from('proctoring_sessions')
      .insert({
        attempt_id,
        session_token: sessionToken,
        browser_info,
        system_info,
        ip_address: req.ip
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    res.json({
      success: true,
      message: 'Proctoring session initialized',
      session_id: session.id,
      session_token: sessionToken
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete pre-exam verification
 */
const completePreExamVerification = async (req, res, next) => {
  try {
    const { session_id, verification_data } = req.body;

    // Update proctoring session
    const { data: session, error } = await supabase
      .from('proctoring_sessions')
      .update({
        pre_exam_verification_completed: true,
        verification_data
      })
      .eq('id', session_id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Pre-exam verification completed',
      session
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log proctoring event
 */
const logProctoringEvent = async (req, res, next) => {
  try {
    const { session_id, event_type, severity, description, metadata } = req.body;

    const { data: event, error } = await supabase
      .from('proctoring_events')
      .insert({
        session_id,
        event_type,
        severity,
        description,
        metadata
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      event
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload proctoring media (webcam/screen/audio)
 */
const uploadProctoringRecording = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { session_id, recording_type, duration_seconds, start_time } = req.body;

    // Get attempt ID from session
    const { data: session } = await supabase
      .from('proctoring_sessions')
      .select('attempt_id')
      .eq('id', session_id)
      .single();

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Upload to GCP
    const fileExtension = recording_type === 'audio' ? 'webm' : 'webm';
    const fileUrl = await uploadProctoringMedia(
      req.file.buffer,
      session.attempt_id,
      recording_type,
      fileExtension
    );

    // Save recording metadata
    const { data: recording, error } = await supabase
      .from('proctoring_recordings')
      .insert({
        session_id,
        recording_type,
        file_url: fileUrl,
        file_size_bytes: req.file.size,
        duration_seconds: parseInt(duration_seconds),
        start_time,
        end_time: new Date()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Recording uploaded successfully',
      recording
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Analyze proctoring frame (send to AI service)
 */
const analyzeProctoringFrame = async (req, res, next) => {
  try {
    const { session_id, frame_data } = req.body;

    // Send to Python AI service for analysis
    const response = await axios.post(
      `${process.env.AI_SERVICE_URL}/proctoring/analyze-frame`,
      {
        session_id,
        frame_data
      },
      {
        timeout: 10000
      }
    );

    const { violations, evidence_url } = response.data;

    // Log any violations detected
    if (violations && violations.length > 0) {
      for (const violation of violations) {
        await supabase.from('proctoring_events').insert({
          session_id,
          event_type: violation.type,
          severity: violation.severity,
          description: violation.description,
          evidence_url: evidence_url || null,
          metadata: violation.metadata || {}
        });
      }
    }

    res.json({
      success: true,
      violations
    });
  } catch (error) {
    console.error('Frame analysis error:', error.message);
    // Don't fail the request if AI service is down
    res.json({
      success: true,
      violations: []
    });
  }
};

/**
 * Get proctoring session details
 */
const getProctoringSession = async (req, res, next) => {
  try {
    const { session_id } = req.params;

    const { data: session, error } = await supabase
      .from('proctoring_sessions')
      .select(`
        *,
        exam_attempts (
          *,
          exams (title),
          students (
            *,
            users!students_user_id_fkey(first_name, last_name, email)
          )
        )
      `)
      .eq('id', session_id)
      .single();

    if (error || !session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Get events
    const { data: events } = await supabase
      .from('proctoring_events')
      .select('*')
      .eq('session_id', session_id)
      .order('timestamp', { ascending: false });

    // Get recordings
    const { data: recordings } = await supabase
      .from('proctoring_recordings')
      .select('*')
      .eq('session_id', session_id);

    session.events = events;
    session.recordings = recordings;

    res.json({
      success: true,
      session
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate proctoring report
 */
const generateProctoringReport = async (req, res, next) => {
  try {
    const { attempt_id } = req.params;

    // Get proctoring session
    const { data: session } = await supabase
      .from('proctoring_sessions')
      .select('id')
      .eq('attempt_id', attempt_id)
      .single();

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'No proctoring session found'
      });
    }

    // Get all events
    const { data: events } = await supabase
      .from('proctoring_events')
      .select('*')
      .eq('session_id', session.id);

    // Calculate violation counts
    const violationCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    events.forEach(event => {
      violationCounts[event.severity]++;
    });

    const totalViolations = events.length;

    // Calculate risk score (0-100)
    const riskScore = Math.min(
      100,
      (violationCounts.critical * 25) +
      (violationCounts.high * 10) +
      (violationCounts.medium * 5) +
      (violationCounts.low * 2)
    );

    // Determine recommendation
    let recommendation;
    if (riskScore >= 75 || violationCounts.critical > 0) {
      recommendation = 'rejected';
    } else if (riskScore >= 50 || violationCounts.high > 2) {
      recommendation = 'flagged';
    } else if (riskScore >= 25 || totalViolations > 5) {
      recommendation = 'review_required';
    } else {
      recommendation = 'approved';
    }

    // Create or update report
    const { data: existingReport } = await supabase
      .from('proctoring_reports')
      .select('id')
      .eq('attempt_id', attempt_id)
      .single();

    const reportData = {
      attempt_id,
      total_violations: totalViolations,
      critical_violations: violationCounts.critical,
      high_violations: violationCounts.high,
      medium_violations: violationCounts.medium,
      low_violations: violationCounts.low,
      risk_score: riskScore,
      recommendation,
      report_data: {
        event_summary: events.reduce((acc, event) => {
          acc[event.event_type] = (acc[event.event_type] || 0) + 1;
          return acc;
        }, {})
      }
    };

    let report;
    if (existingReport) {
      const { data } = await supabase
        .from('proctoring_reports')
        .update(reportData)
        .eq('id', existingReport.id)
        .select()
        .single();
      report = data;
    } else {
      const { data } = await supabase
        .from('proctoring_reports')
        .insert(reportData)
        .select()
        .single();
      report = data;
    }

    res.json({
      success: true,
      report
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get proctoring report
 */
const getProctoringReport = async (req, res, next) => {
  try {
    const { attempt_id } = req.params;

    const { data: report, error } = await supabase
      .from('proctoring_reports')
      .select(`
        *,
        exam_attempts (
          *,
          exams (title),
          students (
            *,
            users!students_user_id_fkey(first_name, last_name, email)
          )
        )
      `)
      .eq('attempt_id', attempt_id)
      .single();

    if (error || !report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      report
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  initializeProctoringSession,
  completePreExamVerification,
  logProctoringEvent,
  uploadProctoringRecording,
  analyzeProctoringFrame,
  getProctoringSession,
  generateProctoringReport,
  getProctoringReport
};
