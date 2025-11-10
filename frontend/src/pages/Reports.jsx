import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { reportAPI, examAPI } from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';

function Reports() {
  const { isTeacher, isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState('all');
  const [examPerformance, setExamPerformance] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  const [recentAttempts, setRecentAttempts] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchData();
  }, [selectedExam]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch overall stats
      const statsData = await reportAPI.getDashboard();
      setStats(statsData.stats);

      // Fetch exams list for filter
      const examsData = await examAPI.getAll({ limit: 100 });
      setExams(examsData.exams || []);

      // Fetch exam-wise performance
      const performanceData = await reportAPI.getExamPerformance({
        exam_id: selectedExam !== 'all' ? selectedExam : undefined,
      });
      setExamPerformance(performanceData.performance || []);

      // Fetch top performers
      const topData = await reportAPI.getTopPerformers({
        exam_id: selectedExam !== 'all' ? selectedExam : undefined,
        limit: 10,
      });
      setTopPerformers(topData.students || []);

      // Fetch recent attempts
      const attemptsData = await reportAPI.getRecentAttempts({
        exam_id: selectedExam !== 'all' ? selectedExam : undefined,
        limit: 20,
      });
      setRecentAttempts(attemptsData.attempts || []);

    } catch (error) {
      toast.error('Failed to fetch reports data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = () => {
    toast.info('Export functionality will be available soon');
  };

  const getPassPercentage = (passedCount, totalCount) => {
    if (totalCount === 0) return 0;
    return ((passedCount / totalCount) * 100).toFixed(1);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'evaluated': return 'primary';
      default: return 'default';
    }
  };

  if (loading && !stats) {
    return (
      <Layout>
        <Box sx={{ width: '100%', mt: 4 }}>
          <LinearProgress />
          <Typography align="center" sx={{ mt: 2 }}>
            Loading reports...
          </Typography>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" fontWeight={600} gutterBottom>
              Reports & Analytics
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Comprehensive insights into exam performance and student progress
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportReport}
            sx={{ textTransform: 'none' }}
          >
            Export Report
          </Button>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Select Exam</InputLabel>
                <Select
                  value={selectedExam}
                  onChange={(e) => setSelectedExam(e.target.value)}
                  label="Select Exam"
                >
                  <MenuItem value="all">All Exams</MenuItem>
                  {exams.map(exam => (
                    <MenuItem key={exam.id} value={exam.id}>
                      {exam.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Overview Stats */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AssignmentIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Exams
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={600}>
                  {stats?.total_exams || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stats?.active_exams || 0} active
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PeopleIcon color="success" sx={{ mr: 1 }} />
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Attempts
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={600}>
                  {stats?.total_attempts || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stats?.completed_attempts || 0} completed
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TrendingUpIcon color="info" sx={{ mr: 1 }} />
                  <Typography variant="subtitle2" color="text.secondary">
                    Average Score
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={600}>
                  {stats?.average_percentage?.toFixed(1) || 0}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  across all exams
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
                    Pass Rate
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={600}>
                  {getPassPercentage(stats?.passed_students || 0, stats?.total_attempts || 0)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stats?.passed_students || 0} / {stats?.total_attempts || 0} passed
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Exam Performance */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Exam-wise Performance
          </Typography>
          <Divider sx={{ mb: 3 }} />

          {examPerformance.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No performance data available
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell>Exam Title</TableCell>
                    <TableCell align="center">Attempts</TableCell>
                    <TableCell align="center">Completed</TableCell>
                    <TableCell align="center">Average Score</TableCell>
                    <TableCell align="center">Pass Rate</TableCell>
                    <TableCell align="center">Highest Score</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {examPerformance.map((exam) => (
                    <TableRow key={exam.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {exam.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {exam.subject}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">{exam.total_attempts || 0}</TableCell>
                      <TableCell align="center">{exam.completed_attempts || 0}</TableCell>
                      <TableCell align="center">
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {exam.average_percentage?.toFixed(1) || 0}%
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={exam.average_percentage || 0}
                            sx={{ mt: 0.5, height: 6, borderRadius: 1 }}
                            color={exam.average_percentage >= 70 ? 'success' : exam.average_percentage >= 50 ? 'warning' : 'error'}
                          />
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${getPassPercentage(exam.passed_count, exam.completed_attempts)}%`}
                          size="small"
                          color={exam.passed_count / exam.completed_attempts >= 0.7 ? 'success' : 'warning'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={500}>
                          {exam.highest_score?.toFixed(1) || 0}%
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Top Performers */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Top Performers
              </Typography>
              <Divider sx={{ mb: 3 }} />

              {topPerformers.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    No data available
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Rank</TableCell>
                        <TableCell>Student</TableCell>
                        <TableCell align="right">Average Score</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topPerformers.map((student, index) => (
                        <TableRow key={student.id}>
                          <TableCell>
                            <Chip
                              label={`#${index + 1}`}
                              size="small"
                              color={index === 0 ? 'success' : index === 1 ? 'info' : 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {student.first_name} {student.last_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {student.student_id}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600} color="success.main">
                              {student.average_percentage?.toFixed(1)}%
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grid>

          {/* Question Difficulty Analysis */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Question Difficulty Analysis
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Easy Questions</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {stats?.question_difficulty?.easy || 0} questions
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={((stats?.question_difficulty?.easy || 0) / (stats?.total_questions || 1)) * 100}
                  color="success"
                  sx={{ height: 8, borderRadius: 1 }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Medium Questions</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {stats?.question_difficulty?.medium || 0} questions
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={((stats?.question_difficulty?.medium || 0) / (stats?.total_questions || 1)) * 100}
                  color="warning"
                  sx={{ height: 8, borderRadius: 1 }}
                />
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Hard Questions</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {stats?.question_difficulty?.hard || 0} questions
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={((stats?.question_difficulty?.hard || 0) / (stats?.total_questions || 1)) * 100}
                  color="error"
                  sx={{ height: 8, borderRadius: 1 }}
                />
              </Box>

              <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Total Questions in Bank
                </Typography>
                <Typography variant="h4" fontWeight={600}>
                  {stats?.total_questions || 0}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Recent Exam Attempts */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Recent Exam Attempts
          </Typography>
          <Divider sx={{ mb: 3 }} />

          {recentAttempts.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No recent attempts
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell>Student</TableCell>
                      <TableCell>Exam</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell align="center">Score</TableCell>
                      <TableCell align="center">Percentage</TableCell>
                      <TableCell align="center">Time Taken</TableCell>
                      <TableCell>Submitted At</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentAttempts
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((attempt) => (
                        <TableRow key={attempt.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {attempt.student.first_name} {attempt.student.last_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {attempt.student.student_id}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {attempt.exam.title}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={attempt.status}
                              size="small"
                              color={getStatusColor(attempt.status)}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight={500}>
                              {attempt.total_marks_obtained || 0} / {attempt.exam.total_marks}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography
                              variant="body2"
                              fontWeight={500}
                              color={attempt.percentage >= 70 ? 'success.main' : attempt.percentage >= 50 ? 'warning.main' : 'error.main'}
                            >
                              {attempt.percentage?.toFixed(1) || 0}%
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">
                              {Math.floor(attempt.elapsed_time / 60)}m
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(attempt.submitted_at).toLocaleString()}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={recentAttempts.length}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50]}
              />
            </>
          )}
        </Paper>
      </Container>
    </Layout>
  );
}

export default Reports;
