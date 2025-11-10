import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Search,
  CalendarToday,
  Timer,
  Assignment,
  PlayArrow,
  Visibility,
  Edit,
  Delete,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { examAPI } from '../services/api';
import { toast } from 'react-toastify';
import Layout from '../components/Layout';

function ExamList() {
  const navigate = useNavigate();
  const { user, isStudent, isTeacher, isAdmin } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    fetchExams();
  }, [statusFilter]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await examAPI.getAll(params);
      setExams(response.exams || []);
    } catch (error) {
      toast.error('Failed to fetch exams');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async (examId) => {
    if (window.confirm('Are you sure you want to delete this exam?')) {
      try {
        await examAPI.delete(examId);
        toast.success('Exam deleted successfully');
        fetchExams();
      } catch (error) {
        toast.error('Failed to delete exam');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'scheduled':
        return 'primary';
      case 'completed':
        return 'default';
      case 'draft':
        return 'warning';
      default:
        return 'default';
    }
  };

  const canTakeExam = (exam) => {
    if (!isStudent) return false;
    const now = new Date();
    const start = new Date(exam.scheduled_start);
    const end = new Date(exam.scheduled_end);
    return now >= start && now <= end && exam.status === 'active';
  };

  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (exam.subject && exam.subject.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSubject = subjectFilter === 'all' || exam.subject === subjectFilter;
    return matchesSearch && matchesSubject;
  });

  const subjects = [...new Set(exams.map(e => e.subject).filter(Boolean))];

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
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
              {isStudent ? 'My Exams' : 'Manage Exams'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isStudent ? 'View and take your enrolled exams' : 'Create, edit, and manage examinations'}
            </Typography>
          </Box>
          {(isTeacher || isAdmin) && (
            <Button
              variant="contained"
              startIcon={<Assignment />}
              onClick={() => navigate('/create-exam')}
            >
              Create New Exam
            </Button>
          )}
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search exams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="scheduled">Scheduled</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel>Subject</InputLabel>
                <Select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  label="Subject"
                >
                  <MenuItem value="all">All Subjects</MenuItem>
                  {subjects.map(subject => (
                    <MenuItem key={subject} value={subject}>{subject}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Exams Grid */}
        {filteredExams.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <Assignment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No exams found
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              {isStudent
                ? "You don't have any enrolled exams yet"
                : "Get started by creating your first exam"}
            </Typography>
            {(isTeacher || isAdmin) && (
              <Button
                variant="contained"
                onClick={() => navigate('/create-exam')}
              >
                Create Exam
              </Button>
            )}
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {filteredExams.map((exam) => (
              <Grid item xs={12} md={6} lg={4} key={exam.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: 4,
                      transform: 'translateY(-4px)',
                    },
                  }}
                >
                  <CardContent sx={{ flex: 1 }}>
                    {/* Status Badge */}
                    <Box sx={{ mb: 2 }}>
                      <Chip
                        label={exam.status.toUpperCase()}
                        size="small"
                        color={getStatusColor(exam.status)}
                      />
                      {exam.proctoring_enabled && (
                        <Chip
                          label="PROCTORED"
                          size="small"
                          variant="outlined"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>

                    {/* Exam Title */}
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, minHeight: 64 }}>
                      {exam.title}
                    </Typography>

                    {/* Subject */}
                    {exam.subject && (
                      <Typography variant="body2" color="primary" sx={{ mb: 2 }}>
                        {exam.subject}
                      </Typography>
                    )}

                    {/* Exam Details */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarToday sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {new Date(exam.scheduled_start).toLocaleString()}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Timer sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {exam.duration_minutes} minutes
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Assignment sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {exam.total_marks} marks
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>

                  <CardActions sx={{ p: 2, pt: 0 }}>
                    {isStudent ? (
                      canTakeExam(exam) ? (
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={<PlayArrow />}
                          onClick={() => navigate(`/exam/${exam.id}/take`)}
                        >
                          Start Exam
                        </Button>
                      ) : (
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<Visibility />}
                          onClick={() => navigate(`/exams`)}
                        >
                          View Details
                        </Button>
                      )
                    ) : (
                      <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                        <Button
                          variant="outlined"
                          startIcon={<Visibility />}
                          onClick={() => navigate(`/exams`)}
                          sx={{ flex: 1 }}
                        >
                          View
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<Edit />}
                          onClick={() => navigate(`/create-exam?id=${exam.id}`)}
                          sx={{ flex: 1 }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() => handleDeleteExam(exam.id)}
                        >
                          <Delete />
                        </Button>
                      </Box>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Layout>
  );
}

export default ExamList;
