require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

const { testConnection } = require('./src/config/database');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');
const { attachUser } = require('./src/middleware/auth');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const questionRoutes = require('./src/routes/questionRoutes');
const examRoutes = require('./src/routes/examRoutes');
const attemptRoutes = require('./src/routes/attemptRoutes');
const proctoringRoutes = require('./src/routes/proctoringRoutes');
const reportRoutes = require('./src/routes/reportRoutes');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  },
  maxHttpBufferSize: 1e8 // 100MB for video chunks
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(compression());
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Attach user to request
app.use(attachUser);

// Health check route
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/proctoring', proctoringRoutes);
app.use('/api/reports', reportRoutes);

// Socket.io for real-time proctoring
const proctoringNamespace = io.of('/proctoring');

proctoringNamespace.on('connection', (socket) => {
  console.log('Proctoring client connected:', socket.id);

  // Join proctoring room
  socket.on('join-session', (sessionId) => {
    socket.join(`session-${sessionId}`);
    console.log(`Client joined session: ${sessionId}`);
  });

  // Handle video stream chunks
  socket.on('video-chunk', (data) => {
    const { sessionId, chunk, timestamp } = data;
    // Broadcast to teachers/proctors monitoring this session
    socket.to(`monitor-${sessionId}`).emit('student-video', {
      sessionId,
      chunk,
      timestamp
    });
  });

  // Handle screen share chunks
  socket.on('screen-chunk', (data) => {
    const { sessionId, chunk, timestamp } = data;
    socket.to(`monitor-${sessionId}`).emit('student-screen', {
      sessionId,
      chunk,
      timestamp
    });
  });

  // Handle proctoring events
  socket.on('proctoring-event', (data) => {
    const { sessionId, eventType, severity, description } = data;
    console.log('Proctoring event:', eventType, severity);

    // Notify monitors
    socket.to(`monitor-${sessionId}`).emit('violation-detected', {
      sessionId,
      eventType,
      severity,
      description,
      timestamp: new Date().toISOString()
    });
  });

  // Teachers/Proctors monitoring
  socket.on('monitor-session', (sessionId) => {
    socket.join(`monitor-${sessionId}`);
    console.log(`Monitor joined session: ${sessionId}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Proctoring client disconnected:', socket.id);
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.warn('⚠️ Starting server without database connection');
    }

    server.listen(PORT, () => {
      console.log('\n' + '='.repeat(50));
      console.log('🚀 Online Examination System Backend');
      console.log('='.repeat(50));
      console.log(`📡 Server running on port: ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API URL: http://localhost:${PORT}`);
      console.log(`🔌 Socket.io: Connected`);
      console.log('='.repeat(50) + '\n');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  server.close(() => process.exit(1));
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

startServer();

module.exports = { app, io };
