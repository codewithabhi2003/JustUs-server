const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const cors     = require('cors');
const dotenv   = require('dotenv');
dotenv.config();

const connectDB = require('./config/db');
connectDB();

const app        = express();
const httpServer = http.createServer(app);
const io         = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL, methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Make io accessible in controllers
app.set('io', io);

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth',          require('./routes/authRoutes'));
app.use('/api/users',         require('./routes/userRoutes'));
app.use('/api/contacts',      require('./routes/contactRoutes'));
app.use('/api/messages',      require('./routes/messageRoutes'));
app.use('/api/media',         require('./routes/mediaRoutes'));
app.use('/api/invite',        require('./routes/inviteRoutes'));
app.use('/api/conversations', require('./routes/conversationRoutes'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', app: '💕JustUs', timestamp: new Date() }));

// Socket.IO handler
require('./socket/socketHandler')(io);

// Error handler (always last)
app.use(require('./middleware/errorHandler'));

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`✅ 💕JustUs server running on port ${PORT}`));
