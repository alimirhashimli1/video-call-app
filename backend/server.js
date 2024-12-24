const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid'); // Import UUID for room IDs

// Create server and attach Socket.IO
const server = http.createServer();
const io = socketIo(server, {
  cors: {
    origin: 'https://video-call-app-ruby.vercel.app/',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('createRoom', () => {
    const roomId = uuidv4();
    socket.join(roomId);
    socket.emit('roomCreated', roomId);
    console.log(`Room ${roomId} created by ${socket.id}`);
  });

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    socket.broadcast.to(roomId).emit('message', { text: 'A new user has joined the room', senderId: 'system' });
    console.log(`${socket.id} joined room ${roomId}`);
  });

  socket.on('chatMessage', ({ roomId, message }) => {
    io.to(roomId).emit('message', { text: message, senderId: socket.id });
  });

  socket.on('offer', ({ roomId, offer }) => {
    socket.broadcast.to(roomId).emit('offer', offer);
  });

  socket.on('answer', ({ roomId, answer }) => {
    socket.broadcast.to(roomId).emit('answer', answer);
  });

  socket.on('ice-candidate', ({ roomId, candidate }) => {
    socket.broadcast.to(roomId).emit('ice-candidate', candidate);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(5000, () => {
  console.log('Chat server running on http://localhost:5000/');
});
