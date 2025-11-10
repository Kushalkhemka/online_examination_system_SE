import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Grid,
  LinearProgress,
  Chip,
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
  FormGroup,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  Timer as TimerIcon,
  Flag as FlagIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UnansweredIcon,
  Fullscreen as FullscreenIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import Webcam from 'react-webcam';
import { io } from 'socket.io-client';
import { examAPI, attemptAPI } from '../services/api';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function ExamInterface() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const socketRef = useRef(null);
  const autoSaveTimerRef = useRef(null);

  // Exam data
  const [exam, setExam] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Navigation state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState(new Set());

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerWarning, setTimerWarning] = useState(false);

  // Proctoring state
  const [proctoringSession, setProctoringSession] = useState(null);
  const [violations, setViolations] = useState([]);
  const [webcamError, setWebcamError] = useState(false);

  // UI state
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Initialize exam
  useEffect(() => {
    initializeExam();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [examId]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1;
        if (newTime === 300) { // 5 minutes warning
          setTimerWarning(true);
          toast.warning('5 minutes remaining!');
        }
        if (newTime === 0) {
          handleAutoSubmit();
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

  // Auto-save answers
  useEffect(() => {
    if (attempt?.id) {
      autoSaveTimerRef.current = setInterval(() => {
        saveAnswers(false);
      }, 30000); // Auto-save every 30 seconds

      return () => {
        if (autoSaveTimerRef.current) {
          clearInterval(autoSaveTimerRef.current);
        }
      };
    }
  }, [attempt, answers]);

  // Fullscreen detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);

      if (!isNowFullscreen && exam?.proctoring_enabled) {
        recordViolation('fullscreen_exit', 'high', 'Exited fullscreen mode');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [exam]);

  // Tab switch detection
  useEffect(() => {
    if (!exam?.proctoring_enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation('tab_switch', 'medium', 'Switched tab or window');
        toast.error('Warning: Tab switching detected');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [exam]);

  const initializeExam = async () => {
    try {
      setLoading(true);

      // Fetch exam details
      const examData = await examAPI.getById(examId);
      setExam(examData.exam);
      setQuestions(examData.exam.questions || []);

      // Start or resume attempt
      const attemptData = await attemptAPI.start(examId);
      setAttempt(attemptData.attempt);

      // Load existing answers if resuming
      if (attemptData.attempt.answers) {
        const answersMap = {};
        attemptData.attempt.answers.forEach(ans => {
          answersMap[ans.question_id] = ans.student_answer;
        });
        setAnswers(answersMap);
      }

      // Calculate time remaining
      const elapsed = attemptData.attempt.elapsed_time || 0;
      const totalTime = examData.exam.duration_minutes * 60;
      setTimeRemaining(totalTime - elapsed);

      // Initialize proctoring if enabled
      if (examData.exam.proctoring_enabled) {
        await initializeProctoring(attemptData.attempt.id);
        requestFullscreen();
      }

      setLoading(false);
    } catch (error) {
      toast.error('Failed to initialize exam');
      console.error(error);
      navigate('/exams');
    }
  };

  const initializeProctoring = async (attemptId) => {
    try {
      // Connect to Socket.io
      socketRef.current = io(`${API_URL}/proctoring`, {
        transports: ['websocket'],
        withCredentials: true,
      });

      socketRef.current.on('connect', () => {
        console.log('Proctoring connected');
        socketRef.current.emit('join-session', attemptId);
      });

      socketRef.current.on('violation-detected', (data) => {
        setViolations(prev => [...prev, data]);
        if (data.severity === 'critical' && exam?.proctoring_config?.strict_mode) {
          toast.error('Critical violation detected. Exam will be submitted.');
          setTimeout(() => handleAutoSubmit(), 3000);
        }
      });

      // Start webcam capture
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

      // Capture and send frames periodically
      setInterval(() => {
        captureAndSendFrame();
      }, (exam?.proctoring_config?.screenshot_interval || 10) * 1000);

    } catch (error) {
      console.error('Proctoring initialization failed:', error);
      setWebcamError(true);
      toast.error('Failed to initialize proctoring. Please allow camera access.');
    }
  };

  const captureAndSendFrame = () => {
    if (webcamRef.current && socketRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        socketRef.current.emit('video-chunk', {
          sessionId: attempt.id,
          image: imageSrc,
          timestamp: new Date().toISOString(),
        });
      }
    }
  };

  const recordViolation = async (eventType, severity, description) => {
    try {
      const violation = {
        event_type: eventType,
        severity,
        description,
        timestamp: new Date().toISOString(),
      };

      setViolations(prev => [...prev, violation]);

      if (socketRef.current) {
        socketRef.current.emit('proctoring-event', {
          sessionId: attempt.id,
          ...violation,
        });
      }
    } catch (error) {
      console.error('Failed to record violation:', error);
    }
  };

  const requestFullscreen = () => {
    document.documentElement.requestFullscreen().catch(err => {
      console.error('Fullscreen request failed:', err);
    });
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleToggleMarkForReview = () => {
    const currentQuestion = questions[currentQuestionIndex];
    setMarkedForReview(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestion.id)) {
        newSet.delete(currentQuestion.id);
      } else {
        newSet.add(currentQuestion.id);
      }
      return newSet;
    });
  };

  const saveAnswers = async (showToast = true) => {
    try {
      const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
        question_id: questionId,
        student_answer: answer,
      }));

      await attemptAPI.saveAnswers(attempt.id, { answers: answersArray });

      if (showToast) {
        toast.success('Answers saved');
      }
    } catch (error) {
      console.error('Failed to save answers:', error);
      if (showToast) {
        toast.error('Failed to save answers');
      }
    }
  };

  const handleAutoSubmit = () => {
    toast.info('Time is up! Submitting exam...');
    handleSubmitExam();
  };

  const handleSubmitExam = async () => {
    try {
      setSubmitting(true);

      // Final save
      await saveAnswers(false);

      // Submit attempt
      await attemptAPI.submit(attempt.id);

      toast.success('Exam submitted successfully!');

      // Disconnect proctoring
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      // Exit fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }

      // Navigate to results
      navigate(`/results/${attempt.id}`);
    } catch (error) {
      toast.error('Failed to submit exam');
      console.error(error);
      setSubmitting(false);
    }
  };

  const goToQuestion = (index) => {
    setCurrentQuestionIndex(index);
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const goToNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getQuestionStatus = (question) => {
    if (answers[question.id]) return 'answered';
    if (markedForReview.has(question.id)) return 'marked';
    return 'unanswered';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'answered': return 'success';
      case 'marked': return 'warning';
      default: return 'default';
    }
  };

  const renderQuestionContent = () => {
    if (!questions.length) return null;

    const question = questions[currentQuestionIndex];
    const answer = answers[question.id];

    return (
      <Box>
        <Box sx={{ mb: 3 }}>
          <Chip
            label={`Question ${currentQuestionIndex + 1} of ${questions.length}`}
            color="primary"
            size="small"
            sx={{ mr: 1 }}
          />
          <Chip
            label={`${question.marks} marks`}
            size="small"
          />
        </Box>

        <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
          {question.question_text}
        </Typography>

        {question.question_type === 'mcq' && (
          <RadioGroup
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          >
            {question.options?.map((option, index) => (
              <FormControlLabel
                key={index}
                value={option.id || option.option_text}
                control={<Radio />}
                label={option.option_text}
                sx={{ mb: 1 }}
              />
            ))}
          </RadioGroup>
        )}

        {question.question_type === 'multi_correct' && (
          <FormGroup>
            {question.options?.map((option, index) => {
              const selectedOptions = answer || [];
              const isChecked = selectedOptions.includes(option.id || option.option_text);

              return (
                <FormControlLabel
                  key={index}
                  control={
                    <Checkbox
                      checked={isChecked}
                      onChange={(e) => {
                        let newAnswer = [...(answer || [])];
                        const optionValue = option.id || option.option_text;

                        if (e.target.checked) {
                          newAnswer.push(optionValue);
                        } else {
                          newAnswer = newAnswer.filter(v => v !== optionValue);
                        }
                        handleAnswerChange(question.id, newAnswer);
                      }}
                    />
                  }
                  label={option.option_text}
                  sx={{ mb: 1 }}
                />
              );
            })}
          </FormGroup>
        )}

        {question.question_type === 'true_false' && (
          <RadioGroup
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          >
            <FormControlLabel value="true" control={<Radio />} label="True" />
            <FormControlLabel value="false" control={<Radio />} label="False" />
          </RadioGroup>
        )}

        {(question.question_type === 'subjective' || question.question_type === 'fill_blank') && (
          <TextField
            fullWidth
            multiline
            rows={question.question_type === 'subjective' ? 8 : 3}
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Type your answer here..."
            variant="outlined"
          />
        )}
      </Box>
    );
  };

  const renderQuestionPalette = () => {
    return (
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Question Palette
        </Typography>
        <Grid container spacing={1} sx={{ mb: 3 }}>
          {questions.map((question, index) => {
            const status = getQuestionStatus(question);
            return (
              <Grid item xs={3} key={question.id}>
                <Button
                  fullWidth
                  variant={index === currentQuestionIndex ? 'contained' : 'outlined'}
                  color={getStatusColor(status)}
                  onClick={() => goToQuestion(index)}
                  size="small"
                  sx={{ minWidth: 0 }}
                >
                  {index + 1}
                </Button>
              </Grid>
            );
          })}
        </Grid>

        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" display="block" gutterBottom>
            <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main', mr: 0.5, verticalAlign: 'middle' }} />
            Answered: {Object.keys(answers).length}
          </Typography>
          <Typography variant="caption" display="block" gutterBottom>
            <UnansweredIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
            Unanswered: {questions.length - Object.keys(answers).length}
          </Typography>
          <Typography variant="caption" display="block">
            <FlagIcon sx={{ fontSize: 16, color: 'warning.main', mr: 0.5, verticalAlign: 'middle' }} />
            Marked: {markedForReview.size}
          </Typography>
        </Box>

        {violations.length > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="caption">
              Proctoring Violations: {violations.length}
            </Typography>
          </Alert>
        )}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <LinearProgress />
        <Typography align="center" sx={{ mt: 2 }}>
          Loading exam...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh' }}>
      {/* Header */}
      <Paper sx={{ py: 2, px: 3, borderRadius: 0 }}>
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid item>
            <Typography variant="h5" fontWeight={600}>
              {exam?.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {exam?.subject}
            </Typography>
          </Grid>
          <Grid item>
            <Chip
              icon={<TimerIcon />}
              label={formatTime(timeRemaining)}
              color={timerWarning ? 'error' : 'primary'}
              sx={{ fontSize: '1.1rem', py: 2.5, px: 1 }}
            />
            {!isFullscreen && exam?.proctoring_enabled && (
              <Tooltip title="Enter fullscreen">
                <IconButton onClick={requestFullscreen} color="warning" sx={{ ml: 1 }}>
                  <FullscreenIcon />
                </IconButton>
              </Tooltip>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Grid container spacing={3}>
          {/* Question Area */}
          <Grid item xs={12} md={exam?.proctoring_enabled ? 6 : 9}>
            <Paper sx={{ p: 3, minHeight: 500 }}>
              {renderQuestionContent()}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                <Button
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={goToPrevious}
                  disabled={currentQuestionIndex === 0}
                  sx={{ textTransform: 'none' }}
                >
                  Previous
                </Button>

                <Button
                  variant="outlined"
                  color={markedForReview.has(questions[currentQuestionIndex]?.id) ? 'warning' : 'default'}
                  startIcon={<FlagIcon />}
                  onClick={handleToggleMarkForReview}
                  sx={{ textTransform: 'none' }}
                >
                  {markedForReview.has(questions[currentQuestionIndex]?.id) ? 'Unmark' : 'Mark for Review'}
                </Button>

                {currentQuestionIndex === questions.length - 1 ? (
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => setShowSubmitDialog(true)}
                    sx={{ textTransform: 'none' }}
                  >
                    Submit Exam
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    endIcon={<ArrowForwardIcon />}
                    onClick={goToNext}
                    sx={{ textTransform: 'none' }}
                  >
                    Next
                  </Button>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={exam?.proctoring_enabled ? 6 : 3}>
            {/* Question Palette */}
            <Paper sx={{ p: 2, mb: 2 }}>
              {renderQuestionPalette()}
            </Paper>

            {/* Proctoring */}
            {exam?.proctoring_enabled && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Proctoring Active
                </Typography>
                {!webcamError ? (
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    width="100%"
                    videoConstraints={{
                      width: 640,
                      height: 480,
                      facingMode: 'user',
                    }}
                    style={{ borderRadius: '8px' }}
                  />
                ) : (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    Camera access required for proctored exam
                  </Alert>
                )}
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Your activity is being monitored
                </Typography>
              </Paper>
            )}

            {/* Save Button */}
            <Button
              fullWidth
              variant="outlined"
              onClick={() => saveAnswers(true)}
              sx={{ mt: 2, textTransform: 'none' }}
            >
              Save Progress
            </Button>
          </Grid>
        </Grid>
      </Container>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onClose={() => !submitting && setShowSubmitDialog(false)}>
        <DialogTitle>Submit Exam?</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to submit your exam?
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Answered: {Object.keys(answers).length} / {questions.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Marked for Review: {markedForReview.size}
            </Typography>
            {markedForReview.size > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                You have {markedForReview.size} question(s) marked for review
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSubmitDialog(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleSubmitExam}
            disabled={submitting}
            sx={{ textTransform: 'none' }}
          >
            {submitting ? 'Submitting...' : 'Yes, Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ExamInterface;
