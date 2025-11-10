import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

// Auth APIs
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// Question APIs
export const questionAPI = {
  create: (data) => api.post('/questions', data),
  getAll: (params) => api.get('/questions', { params }),
  update: (id, data) => api.put(`/questions/${id}`, data),
  delete: (id) => api.delete(`/questions/${id}`),
  createBank: (data) => api.post('/questions/banks', data),
  getBanks: () => api.get('/questions/banks'),
  import: (data) => api.post('/questions/import', data),
  export: (params) => api.get('/questions/export', { params }),
};

// Exam APIs
export const examAPI = {
  create: (data) => api.post('/exams', data),
  getAll: (params) => api.get('/exams', { params }),
  getById: (id) => api.get(`/exams/${id}`),
  update: (id, data) => api.put(`/exams/${id}`, data),
  delete: (id) => api.delete(`/exams/${id}`),
  enrollStudents: (id, data) => api.post(`/exams/${id}/enroll`, data),
  getEnrollments: (id) => api.get(`/exams/${id}/enrollments`),
  publish: (id) => api.post(`/exams/${id}/publish`),
};

// Attempt APIs
export const attemptAPI = {
  start: (data) => api.post('/attempts/start', data),
  saveAnswer: (data) => api.post('/attempts/save-answer', data),
  submit: (data) => api.post('/attempts/submit', data),
  getMyAttempts: () => api.get('/attempts/my-attempts'),
  getResults: (attemptId) => api.get(`/attempts/${attemptId}/results`),
  getExamAttempts: (examId) => api.get(`/attempts/exam/${examId}`),
};

// Proctoring APIs
export const proctoringAPI = {
  initialize: (data) => api.post('/proctoring/initialize', data),
  verify: (data) => api.post('/proctoring/verify', data),
  logEvent: (data) => api.post('/proctoring/event', data),
  uploadRecording: (formData) =>
    api.post('/proctoring/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  analyzeFrame: (data) => api.post('/proctoring/analyze-frame', data),
  getSession: (sessionId) => api.get(`/proctoring/session/${sessionId}`),
  generateReport: (attemptId) => api.post(`/proctoring/report/${attemptId}/generate`),
  getReport: (attemptId) => api.get(`/proctoring/report/${attemptId}`),
};

// Report APIs
export const reportAPI = {
  getDashboard: () => api.get('/reports/dashboard'),
  getStudentPerformance: (studentId) => api.get(`/reports/student/${studentId}/performance`),
  getClassPerformance: (examId) => api.get(`/reports/class/${examId}/performance`),
  getQuestionAnalysis: (examId) => api.get(`/reports/question-analysis/${examId}`),
};

export default api;
