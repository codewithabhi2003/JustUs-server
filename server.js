const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

// ================= DB =================
const connectDB = require('./config/db');
connectDB();

// ================= APP INIT =================
const app = express();
const httpServer = http.createServer(app);

// ================= ALLOWED ORIGINS =================
const allowedOrigins = [
  "http://localhost:5173",
  "https://just-us-client-orpin.vercel.app"
];

// ================= SOCKET.IO =================
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Make io accessible in controllers
app.set('io', io);

// ================= MIDDLEWARE =================
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("❌ Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// ================= ROUTES =================

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '💕 JustUs API is running 🚀',
    endpoints: [
      '/api/auth',
      '/api/users',
      '/api/messages',
      '/api/conversations',
      '/health'
    ]
  });
});

app.get('/version', (req, res) => {
  res.json({
    version: '1.0.0',
    name: 'JustUs Backend'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app: '💕 JustUs',
    timestamp: new Date()
  });
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/contacts', require('./routes/contactRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/media', require('./routes/mediaRoutes'));
app.use('/api/invite', require('./routes/inviteRoutes'));
app.use('/api/conversations', require('./routes/conversationRoutes'));

// ================= SOCKET HANDLER =================
require('./socket/socketHandler')(io);

// ================= ERROR HANDLER =================
app.use(require('./middleware/errorHandler'));

// ================= SERVER =================
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`✅ 💕JustUs server running on port ${PORT}`);
});