import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  CircularProgress,
  Paper,
  Button,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp,
  Assessment,
  Assignment,
  CheckCircle,
  Schedule,
  QuestionAnswer,
  Groups,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { reportAPI, examAPI, attemptAPI } from '../services/api';
import Layout from '../components/Layout';

function StatCard({ title, value, icon, color, subtitle }) {
  return (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            <Typography color="text.secondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}.lighter`,
              borderRadius: 2,
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { user, isStudent, isTeacher, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentExams, setRecentExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsData, examsData] = await Promise.all([
        reportAPI.getDashboard(),
        examAPI.getAll({ page: 1, limit: 5 }),
      ]);

      setStats(statsData.stats);
      setRecentExams(examsData.exams);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            Welcome back, {user?.first_name}!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {isStudent && "Here's an overview of your exams and performance"}
            {isTeacher && "Manage your exams and track student progress"}
            {isAdmin && "System overview and administration"}
          </Typography>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {isStudent && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Enrolled Exams"
                  value={stats?.enrolled_exams || 0}
                  icon={<Assignment sx={{ color: 'primary.main', fontSize: 32 }} />}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Completed"
                  value={stats?.completed_exams || 0}
                  icon={<CheckCircle sx={{ color: 'success.main', fontSize: 32 }} />}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Pending"
                  value={stats?.pending_exams || 0}
                  icon={<Schedule sx={{ color: 'warning.main', fontSize: 32 }} />}
                  color="warning"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Average Score"
                  value={`${stats?.average_percentage?.toFixed(1) || 0}%`}
                  icon={<TrendingUp sx={{ color: 'info.main', fontSize: 32 }} />}
                  color="info"
                  subtitle="Overall performance"
                />
              </Grid>
            </>
          )}

          {isTeacher && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Total Exams"
                  value={stats?.total_exams || 0}
                  icon={<Assignment sx={{ color: 'primary.main', fontSize: 32 }} />}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Active Exams"
                  value={stats?.active_exams || 0}
                  icon={<CheckCircle sx={{ color: 'success.main', fontSize: 32 }} />}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Question Banks"
                  value={stats?.question_banks || 0}
                  icon={<QuestionAnswer sx={{ color: 'warning.main', fontSize: 32 }} />}
                  color="warning"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Total Questions"
                  value={stats?.total_questions || 0}
                  icon={<Assessment sx={{ color: 'info.main', fontSize: 32 }} />}
                  color="info"
                />
              </Grid>
            </>
          )}

          {isAdmin && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Total Users"
                  value={stats?.total_users || 0}
                  icon={<Groups sx={{ color: 'primary.main', fontSize: 32 }} />}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Students"
                  value={stats?.total_students || 0}
                  icon={<Assessment sx={{ color: 'success.main', fontSize: 32 }} />}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Teachers"
                  value={stats?.total_teachers || 0}
                  icon={<QuestionAnswer sx={{ color: 'warning.main', fontSize: 32 }} />}
                  color="warning"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Total Exams"
                  value={stats?.total_exams || 0}
                  icon={<Assignment sx={{ color: 'info.main', fontSize: 32 }} />}
                  color="info"
                />
              </Grid>
            </>
          )}
        </Grid>

        {/* Recent Exams Section */}
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {isStudent ? 'My Exams' : 'Recent Exams'}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate('/exams')}
            >
              View All
            </Button>
          </Box>

          {recentExams.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                {isStudent ? 'No exams enrolled yet' : 'No exams created yet'}
              </Typography>
              {isTeacher && (
                <Button
                  variant="contained"
                  sx={{ mt: 2 }}
                  onClick={() => navigate('/create-exam')}
                >
                  Create Your First Exam
                </Button>
              )}
            </Box>
          ) : (
            <Grid container spacing={2}>
              {recentExams.map((exam) => (
                <Grid item xs={12} key={exam.id}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      '&:hover': {
                        boxShadow: 2,
                        borderColor: 'primary.main',
                      },
                      transition: 'all 0.2s',
                    }}
                    onClick={() => navigate(`/exams`)}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 500, mb: 0.5 }}>
                          {exam.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {exam.subject} • {exam.duration_minutes} minutes • {exam.total_marks} marks
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Chip
                            label={exam.status}
                            size="small"
                            color={
                              exam.status === 'active' ? 'success' :
                              exam.status === 'scheduled' ? 'primary' :
                              'default'
                            }
                          />
                          {exam.proctoring_enabled && (
                            <Chip label="Proctored" size="small" variant="outlined" />
                          )}
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {new Date(exam.scheduled_start).toLocaleDateString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(exam.scheduled_start).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>

        {/* Quick Actions */}
        {isTeacher && (
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={() => navigate('/create-exam')}
                sx={{ py: 1.5 }}
              >
                Create New Exam
              </Button>
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                onClick={() => navigate('/questions')}
                sx={{ py: 1.5 }}
              >
                Manage Questions
              </Button>
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                onClick={() => navigate('/reports')}
                sx={{ py: 1.5 }}
              >
                View Reports
              </Button>
            </Grid>
          </Grid>
        )}
      </Box>
    </Layout>
  );
}

export default Dashboard;
