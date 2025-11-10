import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  Timer as TimerIcon,
  Assignment as AssignmentIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  Download as DownloadIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { attemptAPI } from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';

function Results() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { isStudent } = useAuth();

  const [attempt, setAttempt] = useState(null);
  const [exam, setExam] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [attemptId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const data = await attemptAPI.getResults(attemptId);
      setAttempt(data.attempt);
      setExam(data.attempt.exam);
      setResults(data.results);
    } catch (error) {
      toast.error('Failed to fetch results');
      console.error(error);
      navigate('/exams');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const getGrade = (percentage) => {
    if (percentage >= 90) return { grade: 'A+', color: 'success' };
    if (percentage >= 80) return { grade: 'A', color: 'success' };
    if (percentage >= 70) return { grade: 'B', color: 'info' };
    if (percentage >= 60) return { grade: 'C', color: 'warning' };
    if (percentage >= 50) return { grade: 'D', color: 'warning' };
    return { grade: 'F', color: 'error' };
  };

  const getAnswerStatus = (answer) => {
    if (!answer) return { label: 'Not Attempted', color: 'default', icon: null };

    if (answer.is_correct === null) {
      // Subjective/AI evaluated
      return {
        label: answer.marks_awarded ? `${answer.marks_awarded}/${answer.question.marks} marks` : 'Under Evaluation',
        color: 'info',
        icon: null,
      };
    }

    return answer.is_correct
      ? { label: 'Correct', color: 'success', icon: <CheckCircleIcon /> }
      : { label: 'Incorrect', color: 'error', icon: <CancelIcon /> };
  };

  const renderAnswerComparison = (answer) => {
    const question = answer.question;

    if (question.question_type === 'mcq' || question.question_type === 'multi_correct') {
      return (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Options:</Typography>
          {question.options?.map((option, index) => {
            const isStudentAnswer = question.question_type === 'mcq'
              ? answer.student_answer === (option.id || option.option_text)
              : (answer.student_answer || []).includes(option.id || option.option_text);

            const isCorrect = option.is_correct;

            return (
              <Box
                key={index}
                sx={{
                  p: 1.5,
                  mb: 1,
                  borderRadius: 1,
                  border: 1,
                  borderColor: isCorrect ? 'success.main' : isStudentAnswer ? 'error.main' : 'divider',
                  bgcolor: isCorrect ? 'success.light' : isStudentAnswer ? 'error.light' : 'transparent',
                  opacity: isCorrect || isStudentAnswer ? 1 : 0.6,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {isCorrect && <CheckCircleIcon sx={{ mr: 1, color: 'success.dark' }} />}
                  {isStudentAnswer && !isCorrect && <CancelIcon sx={{ mr: 1, color: 'error.dark' }} />}
                  <Typography variant="body2">
                    {option.option_text}
                    {isCorrect && ' (Correct Answer)'}
                    {isStudentAnswer && ' (Your Answer)'}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      );
    }

    if (question.question_type === 'true_false') {
      const correctAnswer = question.options?.find(opt => opt.is_correct)?.option_text;
      return (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Your Answer: <strong>{answer.student_answer || 'Not Attempted'}</strong>
          </Typography>
          <Typography variant="body2" color="success.main">
            Correct Answer: <strong>{correctAnswer}</strong>
          </Typography>
        </Box>
      );
    }

    if (question.question_type === 'subjective' || question.question_type === 'fill_blank') {
      return (
        <Box sx={{ mt: 2 }}>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Your Answer:</Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {answer.student_answer || 'Not Attempted'}
            </Typography>
          </Paper>

          {question.correct_answer && (
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'success.light', mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom color="success.dark">
                Model Answer:
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {question.correct_answer}
              </Typography>
            </Paper>
          )}

          {answer.ai_feedback && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>AI Evaluation Feedback:</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {answer.ai_feedback}
              </Typography>
            </Alert>
          )}
        </Box>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <Layout>
        <Box sx={{ width: '100%', mt: 4 }}>
          <LinearProgress />
          <Typography align="center" sx={{ mt: 2 }}>
            Loading results...
          </Typography>
        </Box>
      </Layout>
    );
  }

  const percentage = results?.percentage || 0;
  const passed = percentage >= (exam?.passing_percentage || 40);
  const gradeInfo = getGrade(percentage);

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Exam Results
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {exam?.title}
          </Typography>
        </Box>

        {/* Result Status Banner */}
        <Alert
          severity={passed ? 'success' : 'error'}
          icon={passed ? <CheckCircleIcon fontSize="large" /> : <CancelIcon fontSize="large" />}
          sx={{ mb: 4, py: 2 }}
        >
          <Typography variant="h5">
            {passed ? 'Congratulations! You Passed' : 'You Did Not Pass'}
          </Typography>
          <Typography variant="body2">
            You scored {results?.total_marks_obtained || 0} out of {exam?.total_marks || 0} marks ({percentage.toFixed(2)}%)
          </Typography>
        </Alert>

        {/* Score Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AssignmentIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="subtitle2" color="text.secondary">
                    Score
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={600}>
                  {results?.total_marks_obtained || 0} / {exam?.total_marks || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {percentage.toFixed(2)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                  <Typography variant="subtitle2" color="text.secondary">
                    Grade
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={600}>
                  {gradeInfo.grade}
                </Typography>
                <Chip
                  label={passed ? 'Passed' : 'Failed'}
                  color={passed ? 'success' : 'error'}
                  size="small"
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TimerIcon color="info" sx={{ mr: 1 }} />
                  <Typography variant="subtitle2" color="text.secondary">
                    Time Taken
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={600}>
                  {formatTime(attempt?.elapsed_time || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  of {exam?.duration_minutes} min
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                  <Typography variant="subtitle2" color="text.secondary">
                    Accuracy
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={600}>
                  {results?.correct_answers || 0} / {results?.total_questions || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  questions correct
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Question-wise Breakdown */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Question-wise Breakdown
          </Typography>
          <Divider sx={{ mb: 3 }} />

          {results?.answers?.map((answer, index) => {
            const status = getAnswerStatus(answer);

            return (
              <Accordion key={answer.id} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 2 }}>
                    <Typography variant="subtitle1" sx={{ flex: 1 }}>
                      Question {index + 1}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip
                        label={answer.question.question_type.toUpperCase()}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        icon={status.icon}
                        label={status.label}
                        color={status.color}
                        size="small"
                      />
                      <Typography variant="body2" color="text.secondary">
                        {answer.marks_awarded || 0} / {answer.question.marks} marks
                      </Typography>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box>
                    <Typography variant="body1" fontWeight={500} gutterBottom>
                      {answer.question.question_text}
                    </Typography>

                    {renderAnswerComparison(answer)}

                    {answer.question.explanation && (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Explanation:</Typography>
                        <Typography variant="body2">
                          {answer.question.explanation}
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Paper>

        {/* Proctoring Violations */}
        {exam?.proctoring_enabled && results?.proctoring_violations?.length > 0 && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <WarningIcon color="warning" sx={{ mr: 1 }} />
              <Typography variant="h6" fontWeight={600}>
                Proctoring Violations
              </Typography>
            </Box>
            <Alert severity="warning" sx={{ mb: 2 }}>
              {results.proctoring_violations.length} violation(s) detected during the exam
            </Alert>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.proctoring_violations.map((violation, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Chip label={violation.event_type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={violation.severity}
                          size="small"
                          color={
                            violation.severity === 'critical' ? 'error' :
                            violation.severity === 'high' ? 'warning' :
                            'default'
                          }
                        />
                      </TableCell>
                      <TableCell>{violation.description}</TableCell>
                      <TableCell>{new Date(violation.timestamp).toLocaleTimeString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* Performance Stats */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Performance Summary
          </Typography>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Correct Answers
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(results?.correct_answers / results?.total_questions) * 100 || 0}
                  color="success"
                  sx={{ height: 10, borderRadius: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {results?.correct_answers} / {results?.total_questions} ({((results?.correct_answers / results?.total_questions) * 100 || 0).toFixed(1)}%)
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Attempted Questions
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(results?.attempted_questions / results?.total_questions) * 100 || 0}
                  color="info"
                  sx={{ height: 10, borderRadius: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {results?.attempted_questions} / {results?.total_questions} ({((results?.attempted_questions / results?.total_questions) * 100 || 0).toFixed(1)}%)
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<HomeIcon />}
            onClick={() => navigate('/dashboard')}
            sx={{ textTransform: 'none' }}
          >
            Back to Dashboard
          </Button>
          {isStudent && (
            <Button
              variant="outlined"
              startIcon={<AssignmentIcon />}
              onClick={() => navigate('/exams')}
              sx={{ textTransform: 'none' }}
            >
              View More Exams
            </Button>
          )}
        </Box>
      </Container>
    </Layout>
  );
}

export default Results;
