import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Checkbox,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  InputAdornment,
  Alert,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Save as SaveIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import Layout from '../components/Layout';
import { examAPI, questionAPI } from '../services/api';
import { toast } from 'react-toastify';

const steps = ['Basic Details', 'Configuration', 'Select Questions', 'Review & Submit'];

function CreateExam() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const examId = searchParams.get('id');

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    instructions: '',
    duration_minutes: 60,
    total_marks: 100,
    passing_percentage: 40,
    negative_marking_percentage: 0,
    shuffle_questions: true,
    shuffle_options: true,
    show_results_immediately: false,
    allow_review: true,
    proctoring_enabled: true,
    proctoring_config: {
      face_detection: true,
      multiple_person_detection: true,
      mobile_phone_detection: true,
      tab_switch_detection: true,
      screenshot_interval: 10,
      strict_mode: false,
    },
    start_time: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
    status: 'scheduled',
  });

  // Question selection
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [questionPage, setQuestionPage] = useState(0);
  const [questionRowsPerPage, setQuestionRowsPerPage] = useState(10);
  const [questionTotalCount, setQuestionTotalCount] = useState(0);
  const [questionSearch, setQuestionSearch] = useState('');
  const [questionTypeFilter, setQuestionTypeFilter] = useState('all');

  useEffect(() => {
    if (examId) {
      fetchExamData();
    }
  }, [examId]);

  useEffect(() => {
    if (activeStep === 2) {
      fetchQuestions();
    }
  }, [activeStep, questionPage, questionRowsPerPage, questionSearch, questionTypeFilter]);

  const fetchExamData = async () => {
    try {
      setLoading(true);
      const data = await examAPI.getById(examId);
      setFormData({
        ...formData,
        ...data.exam,
        start_time: new Date(data.exam.start_time),
        end_time: new Date(data.exam.end_time),
        proctoring_config: data.exam.proctoring_config || formData.proctoring_config,
      });
      setSelectedQuestions(data.exam.questions || []);
    } catch (error) {
      toast.error('Failed to fetch exam data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      const params = {
        page: questionPage + 1,
        limit: questionRowsPerPage,
        search: questionSearch || undefined,
        type: questionTypeFilter !== 'all' ? questionTypeFilter : undefined,
      };
      const data = await questionAPI.getAll(params);
      setAvailableQuestions(data.questions || []);
      setQuestionTotalCount(data.pagination?.total || 0);
    } catch (error) {
      toast.error('Failed to fetch questions');
      console.error(error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleProctoringConfigChange = (e) => {
    const { name, type, checked, value } = e.target;
    setFormData(prev => ({
      ...prev,
      proctoring_config: {
        ...prev.proctoring_config,
        [name]: type === 'checkbox' ? checked : value
      }
    }));
  };

  const handleDateChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleQuestionToggle = (question) => {
    const isSelected = selectedQuestions.some(q => q.id === question.id);
    if (isSelected) {
      setSelectedQuestions(prev => prev.filter(q => q.id !== question.id));
    } else {
      setSelectedQuestions(prev => [...prev, question]);
    }
  };

  const calculateTotalMarks = () => {
    return selectedQuestions.reduce((sum, q) => sum + parseFloat(q.marks || 0), 0);
  };

  const validateStep = (step) => {
    switch (step) {
      case 0:
        if (!formData.title.trim()) {
          toast.error('Exam title is required');
          return false;
        }
        if (!formData.subject.trim()) {
          toast.error('Subject is required');
          return false;
        }
        return true;

      case 1:
        if (formData.duration_minutes <= 0) {
          toast.error('Duration must be greater than 0');
          return false;
        }
        if (formData.total_marks <= 0) {
          toast.error('Total marks must be greater than 0');
          return false;
        }
        if (formData.passing_percentage < 0 || formData.passing_percentage > 100) {
          toast.error('Passing percentage must be between 0 and 100');
          return false;
        }
        if (formData.start_time >= formData.end_time) {
          toast.error('End time must be after start time');
          return false;
        }
        return true;

      case 2:
        if (selectedQuestions.length === 0) {
          toast.error('Please select at least one question');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const payload = {
        title: formData.title,
        description: formData.description,
        subject: formData.subject,
        instructions: formData.instructions,
        duration_minutes: parseInt(formData.duration_minutes),
        total_marks: parseFloat(formData.total_marks),
        passing_percentage: parseFloat(formData.passing_percentage),
        negative_marking_percentage: parseFloat(formData.negative_marking_percentage),
        shuffle_questions: formData.shuffle_questions,
        shuffle_options: formData.shuffle_options,
        show_results_immediately: formData.show_results_immediately,
        allow_review: formData.allow_review,
        proctoring_enabled: formData.proctoring_enabled,
        proctoring_config: formData.proctoring_config,
        start_time: formData.start_time.toISOString(),
        end_time: formData.end_time.toISOString(),
        status: formData.status,
        question_ids: selectedQuestions.map(q => q.id),
      };

      if (examId) {
        await examAPI.update(examId, payload);
        toast.success('Exam updated successfully');
      } else {
        await examAPI.create(payload);
        toast.success('Exam created successfully');
      }

      navigate('/exams');
    } catch (error) {
      toast.error(error.message || 'Failed to save exam');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Exam Title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                placeholder="e.g., Data Structures Mid-term Exam"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Brief description of the exam"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Subject"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                required
                placeholder="e.g., Computer Science"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Instructions for Students"
                name="instructions"
                value={formData.instructions}
                onChange={handleInputChange}
                placeholder="Important instructions for students..."
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Exam Settings</Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Duration (minutes)"
                name="duration_minutes"
                value={formData.duration_minutes}
                onChange={handleInputChange}
                required
                inputProps={{ min: 1 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Total Marks"
                name="total_marks"
                value={formData.total_marks}
                onChange={handleInputChange}
                required
                inputProps={{ min: 1, step: 0.5 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Passing Percentage"
                name="passing_percentage"
                value={formData.passing_percentage}
                onChange={handleInputChange}
                required
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Negative Marking (%)"
                name="negative_marking_percentage"
                value={formData.negative_marking_percentage}
                onChange={handleInputChange}
                inputProps={{ min: 0, max: 100 }}
                helperText="Leave 0 for no negative marking"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>Schedule</Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateTimePicker
                  label="Start Time"
                  value={formData.start_time}
                  onChange={(value) => handleDateChange('start_time', value)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateTimePicker
                  label="End Time"
                  value={formData.end_time}
                  onChange={(value) => handleDateChange('end_time', value)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  label="Status"
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="scheduled">Scheduled</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>Question Display</Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.shuffle_questions}
                    onChange={handleInputChange}
                    name="shuffle_questions"
                  />
                }
                label="Shuffle Questions"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.shuffle_options}
                    onChange={handleInputChange}
                    name="shuffle_options"
                  />
                }
                label="Shuffle Options"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.show_results_immediately}
                    onChange={handleInputChange}
                    name="show_results_immediately"
                  />
                }
                label="Show Results Immediately"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.allow_review}
                    onChange={handleInputChange}
                    name="allow_review"
                  />
                }
                label="Allow Review Before Submit"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>Proctoring Settings</Typography>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.proctoring_enabled}
                    onChange={handleInputChange}
                    name="proctoring_enabled"
                  />
                }
                label="Enable AI Proctoring"
              />
            </Grid>

            {formData.proctoring_enabled && (
              <>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.proctoring_config.face_detection}
                        onChange={handleProctoringConfigChange}
                        name="face_detection"
                      />
                    }
                    label="Face Detection"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.proctoring_config.multiple_person_detection}
                        onChange={handleProctoringConfigChange}
                        name="multiple_person_detection"
                      />
                    }
                    label="Multiple Person Detection"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.proctoring_config.mobile_phone_detection}
                        onChange={handleProctoringConfigChange}
                        name="mobile_phone_detection"
                      />
                    }
                    label="Mobile Phone Detection"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.proctoring_config.tab_switch_detection}
                        onChange={handleProctoringConfigChange}
                        name="tab_switch_detection"
                      />
                    }
                    label="Tab Switch Detection"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Screenshot Interval (seconds)"
                    name="screenshot_interval"
                    value={formData.proctoring_config.screenshot_interval}
                    onChange={handleProctoringConfigChange}
                    inputProps={{ min: 5, max: 60 }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.proctoring_config.strict_mode}
                        onChange={handleProctoringConfigChange}
                        name="strict_mode"
                      />
                    }
                    label="Strict Mode (Auto-submit on violations)"
                  />
                </Grid>
              </>
            )}
          </Grid>
        );

      case 2:
        return (
          <Box>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Select Questions for Exam
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                {selectedQuestions.length} question(s) selected | Total Marks: {calculateTotalMarks()}
              </Alert>
            </Box>

            <Paper sx={{ p: 2, mb: 3 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    placeholder="Search questions..."
                    value={questionSearch}
                    onChange={(e) => setQuestionSearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={questionTypeFilter}
                      onChange={(e) => setQuestionTypeFilter(e.target.value)}
                      label="Type"
                    >
                      <MenuItem value="all">All Types</MenuItem>
                      <MenuItem value="mcq">MCQ</MenuItem>
                      <MenuItem value="multi_correct">Multi-Correct</MenuItem>
                      <MenuItem value="true_false">True/False</MenuItem>
                      <MenuItem value="subjective">Subjective</MenuItem>
                      <MenuItem value="fill_blank">Fill in Blank</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell padding="checkbox">Select</TableCell>
                    <TableCell>Question</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Difficulty</TableCell>
                    <TableCell align="center">Marks</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {availableQuestions.map((question) => {
                    const isSelected = selectedQuestions.some(q => q.id === question.id);
                    return (
                      <TableRow key={question.id} hover>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleQuestionToggle(question)}
                          />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 400 }}>
                          <Typography variant="body2" noWrap>
                            {question.question_text}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={question.question_type} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Chip label={question.difficulty} size="small" />
                        </TableCell>
                        <TableCell align="center">{question.marks}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={questionTotalCount}
                page={questionPage}
                onPageChange={(e, newPage) => setQuestionPage(newPage)}
                rowsPerPage={questionRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setQuestionRowsPerPage(parseInt(e.target.value, 10));
                  setQuestionPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50]}
              />
            </TableContainer>
          </Box>
        );

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Review Exam Details</Typography>
            </Grid>

            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Basic Details</Typography>
                  <Typography variant="h6">{formData.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {formData.description || 'No description provided'}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Chip label={formData.subject} color="primary" size="small" sx={{ mr: 1 }} />
                    <Chip label={formData.status} size="small" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Duration</Typography>
                  <Typography variant="h5">{formData.duration_minutes} minutes</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Total Marks</Typography>
                  <Typography variant="h5">{formData.total_marks}</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Passing Percentage</Typography>
                  <Typography variant="h5">{formData.passing_percentage}%</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Questions Selected</Typography>
                  <Typography variant="h5">{selectedQuestions.length}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total: {calculateTotalMarks()} marks
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Schedule</Typography>
                  <Typography variant="body2">
                    Start: {formData.start_time.toLocaleString()}
                  </Typography>
                  <Typography variant="body2">
                    End: {formData.end_time.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Features</Typography>
                  <Box sx={{ mt: 1 }}>
                    {formData.shuffle_questions && <Chip label="Shuffle Questions" size="small" sx={{ m: 0.5 }} />}
                    {formData.shuffle_options && <Chip label="Shuffle Options" size="small" sx={{ m: 0.5 }} />}
                    {formData.show_results_immediately && <Chip label="Immediate Results" size="small" sx={{ m: 0.5 }} />}
                    {formData.allow_review && <Chip label="Allow Review" size="small" sx={{ m: 0.5 }} />}
                    {formData.proctoring_enabled && <Chip label="AI Proctoring Enabled" color="primary" size="small" sx={{ m: 0.5 }} />}
                    {formData.negative_marking_percentage > 0 && <Chip label={`Negative Marking: ${formData.negative_marking_percentage}%`} size="small" sx={{ m: 0.5 }} />}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            {examId ? 'Edit Exam' : 'Create New Exam'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {examId ? 'Update exam details and configuration' : 'Set up a new exam with questions and proctoring'}
          </Typography>
        </Box>

        <Paper sx={{ p: 4, borderRadius: 2 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Box sx={{ minHeight: 400 }}>
            {renderStepContent(activeStep)}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              startIcon={<ArrowBackIcon />}
              sx={{ textTransform: 'none' }}
            >
              Back
            </Button>

            <Box>
              <Button
                variant="outlined"
                onClick={() => navigate('/exams')}
                sx={{ mr: 2, textTransform: 'none' }}
              >
                Cancel
              </Button>

              {activeStep === steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={loading}
                  startIcon={<SaveIcon />}
                  sx={{ textTransform: 'none' }}
                >
                  {loading ? 'Saving...' : examId ? 'Update Exam' : 'Create Exam'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  endIcon={<ArrowForwardIcon />}
                  sx={{ textTransform: 'none' }}
                >
                  Next
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
      </Container>
    </Layout>
  );
}

export default CreateExam;
