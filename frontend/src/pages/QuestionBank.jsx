import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { questionAPI } from '../services/api';
import { toast } from 'react-toastify';

const QUESTION_TYPES = [
  { value: 'mcq', label: 'Multiple Choice (Single)' },
  { value: 'multi_correct', label: 'Multiple Choice (Multiple)' },
  { value: 'true_false', label: 'True/False' },
  { value: 'subjective', label: 'Subjective' },
  { value: 'fill_blank', label: 'Fill in the Blank' },
];

const DIFFICULTY_LEVELS = [
  { value: 'easy', label: 'Easy', color: 'success' },
  { value: 'medium', label: 'Medium', color: 'warning' },
  { value: 'hard', label: 'Hard', color: 'error' },
];

function QuestionBank() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formData, setFormData] = useState({
    question_type: 'mcq',
    question_text: '',
    marks: 1,
    difficulty: 'medium',
    subject: '',
    topic: '',
    options: [
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
    ],
    correct_answer: '',
    explanation: '',
  });

  useEffect(() => {
    fetchQuestions();
  }, [page, rowsPerPage, searchTerm, typeFilter, difficultyFilter]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm || undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        difficulty: difficultyFilter !== 'all' ? difficultyFilter : undefined,
      };
      const data = await questionAPI.getAll(params);
      setQuestions(data.questions || []);
      setTotalCount(data.pagination?.total || 0);
    } catch (error) {
      toast.error('Failed to fetch questions');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (question = null) => {
    if (question) {
      setEditingQuestion(question);
      setFormData({
        question_type: question.question_type,
        question_text: question.question_text,
        marks: question.marks,
        difficulty: question.difficulty || 'medium',
        subject: question.subject || '',
        topic: question.topic || '',
        options: question.options || [
          { option_text: '', is_correct: false },
          { option_text: '', is_correct: false },
          { option_text: '', is_correct: false },
          { option_text: '', is_correct: false },
        ],
        correct_answer: question.correct_answer || '',
        explanation: question.explanation || '',
      });
    } else {
      setEditingQuestion(null);
      setFormData({
        question_type: 'mcq',
        question_text: '',
        marks: 1,
        difficulty: 'medium',
        subject: '',
        topic: '',
        options: [
          { option_text: '', is_correct: false },
          { option_text: '', is_correct: false },
          { option_text: '', is_correct: false },
          { option_text: '', is_correct: false },
        ],
        correct_answer: '',
        explanation: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingQuestion(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOptionChange = (index, field, value) => {
    const newOptions = [...formData.options];
    newOptions[index][field] = value;

    // For MCQ, only one option can be correct
    if (field === 'is_correct' && value && formData.question_type === 'mcq') {
      newOptions.forEach((opt, i) => {
        if (i !== index) opt.is_correct = false;
      });
    }

    setFormData(prev => ({ ...prev, options: newOptions }));
  };

  const handleAddOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, { option_text: '', is_correct: false }]
    }));
  };

  const handleRemoveOption = (index) => {
    if (formData.options.length > 2) {
      const newOptions = formData.options.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, options: newOptions }));
    }
  };

  const validateForm = () => {
    if (!formData.question_text.trim()) {
      toast.error('Question text is required');
      return false;
    }
    if (formData.marks <= 0) {
      toast.error('Marks must be greater than 0');
      return false;
    }

    if (['mcq', 'multi_correct'].includes(formData.question_type)) {
      const validOptions = formData.options.filter(opt => opt.option_text.trim());
      if (validOptions.length < 2) {
        toast.error('At least 2 options are required');
        return false;
      }
      const correctOptions = validOptions.filter(opt => opt.is_correct);
      if (correctOptions.length === 0) {
        toast.error('At least one correct option must be selected');
        return false;
      }
    }

    if (formData.question_type === 'true_false' && !formData.correct_answer) {
      toast.error('Please select the correct answer');
      return false;
    }

    if (['subjective', 'fill_blank'].includes(formData.question_type) && !formData.correct_answer.trim()) {
      toast.error('Model answer is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const payload = {
        question_type: formData.question_type,
        question_text: formData.question_text,
        marks: parseFloat(formData.marks),
        difficulty: formData.difficulty,
        subject: formData.subject || null,
        topic: formData.topic || null,
        explanation: formData.explanation || null,
      };

      if (['mcq', 'multi_correct'].includes(formData.question_type)) {
        payload.options = formData.options.filter(opt => opt.option_text.trim());
      } else if (formData.question_type === 'true_false') {
        payload.options = [
          { option_text: 'True', is_correct: formData.correct_answer === 'true' },
          { option_text: 'False', is_correct: formData.correct_answer === 'false' },
        ];
      } else {
        payload.correct_answer = formData.correct_answer;
      }

      if (editingQuestion) {
        await questionAPI.update(editingQuestion.id, payload);
        toast.success('Question updated successfully');
      } else {
        await questionAPI.create(payload);
        toast.success('Question created successfully');
      }

      handleCloseDialog();
      fetchQuestions();
    } catch (error) {
      toast.error(error.message || 'Failed to save question');
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;

    try {
      await questionAPI.delete(id);
      toast.success('Question deleted successfully');
      fetchQuestions();
    } catch (error) {
      toast.error('Failed to delete question');
      console.error(error);
    }
  };

  const getTypeLabel = (type) => {
    return QUESTION_TYPES.find(t => t.value === type)?.label || type;
  };

  const getDifficultyColor = (difficulty) => {
    return DIFFICULTY_LEVELS.find(d => d.value === difficulty)?.color || 'default';
  };

  const renderQuestionForm = () => {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Question Type</InputLabel>
            <Select
              name="question_type"
              value={formData.question_type}
              onChange={handleInputChange}
              label="Question Type"
            >
              {QUESTION_TYPES.map(type => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Question Text"
            name="question_text"
            value={formData.question_text}
            onChange={handleInputChange}
            required
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            type="number"
            label="Marks"
            name="marks"
            value={formData.marks}
            onChange={handleInputChange}
            required
            inputProps={{ min: 0.5, step: 0.5 }}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>Difficulty</InputLabel>
            <Select
              name="difficulty"
              value={formData.difficulty}
              onChange={handleInputChange}
              label="Difficulty"
            >
              {DIFFICULTY_LEVELS.map(level => (
                <MenuItem key={level.value} value={level.value}>
                  {level.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Subject"
            name="subject"
            value={formData.subject}
            onChange={handleInputChange}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Topic"
            name="topic"
            value={formData.topic}
            onChange={handleInputChange}
          />
        </Grid>

        {['mcq', 'multi_correct'].includes(formData.question_type) && (
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Options {formData.question_type === 'multi_correct' && '(Check all correct answers)'}
            </Typography>
            {formData.options.map((option, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Checkbox
                  checked={option.is_correct}
                  onChange={(e) => handleOptionChange(index, 'is_correct', e.target.checked)}
                />
                <TextField
                  fullWidth
                  placeholder={`Option ${index + 1}`}
                  value={option.option_text}
                  onChange={(e) => handleOptionChange(index, 'option_text', e.target.value)}
                  sx={{ mr: 1 }}
                />
                {formData.options.length > 2 && (
                  <IconButton onClick={() => handleRemoveOption(index)} color="error">
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>
            ))}
            <Button onClick={handleAddOption} startIcon={<AddIcon />}>
              Add Option
            </Button>
          </Grid>
        )}

        {formData.question_type === 'true_false' && (
          <Grid item xs={12}>
            <FormControl component="fieldset">
              <Typography variant="subtitle1" gutterBottom>Correct Answer</Typography>
              <RadioGroup
                name="correct_answer"
                value={formData.correct_answer}
                onChange={handleInputChange}
              >
                <FormControlLabel value="true" control={<Radio />} label="True" />
                <FormControlLabel value="false" control={<Radio />} label="False" />
              </RadioGroup>
            </FormControl>
          </Grid>
        )}

        {['subjective', 'fill_blank'].includes(formData.question_type) && (
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Model Answer / Expected Answer"
              name="correct_answer"
              value={formData.correct_answer}
              onChange={handleInputChange}
              required
              helperText="This will be used by AI for evaluation"
            />
          </Grid>
        )}

        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Explanation (Optional)"
            name="explanation"
            value={formData.explanation}
            onChange={handleInputChange}
            helperText="Shown to students after exam submission"
          />
        </Grid>
      </Grid>
    );
  };

  return (
    <Layout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" fontWeight={600}>
            Question Bank
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              textTransform: 'none',
              px: 3,
              py: 1.5,
              borderRadius: 2,
            }}
          >
            Add Question
          </Button>
        </Box>

        <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  label="Type"
                >
                  <MenuItem value="all">All Types</MenuItem>
                  {QUESTION_TYPES.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Difficulty</InputLabel>
                <Select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  label="Difficulty"
                >
                  <MenuItem value="all">All Difficulties</MenuItem>
                  {DIFFICULTY_LEVELS.map(level => (
                    <MenuItem key={level.value} value={level.value}>
                      {level.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell>Question</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Difficulty</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell align="center">Marks</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">Loading...</TableCell>
                </TableRow>
              ) : questions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Box sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        No questions found. Create your first question to get started.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                questions.map((question) => (
                  <TableRow
                    key={question.id}
                    hover
                    sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    <TableCell sx={{ maxWidth: 400 }}>
                      <Typography variant="body2" noWrap>
                        {question.question_text}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getTypeLabel(question.question_type)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={question.difficulty}
                        size="small"
                        color={getDifficultyColor(question.difficulty)}
                      />
                    </TableCell>
                    <TableCell>{question.subject || '-'}</TableCell>
                    <TableCell align="center">{question.marks}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(question)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(question.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </TableContainer>

        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editingQuestion ? 'Edit Question' : 'Create New Question'}
          </DialogTitle>
          <DialogContent dividers>
            {renderQuestionForm()}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              sx={{ textTransform: 'none', px: 3 }}
            >
              {editingQuestion ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
}

export default QuestionBank;
