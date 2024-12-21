const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid'); // Import UUID for room IDs

// Create server and attach Socket.IO
const server = http.createServer();
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:5173', // Replace with your frontend URL
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Listen for room creation and joining
  socket.on('createRoom', () => {
    const roomId = uuidv4(); // Generate a unique room ID
    socket.join(roomId); // Join the newly created room
    socket.emit('roomCreated', roomId); // Notify the client of the room ID
    console.log(`Room ${roomId} created by ${socket.id}`);
  });

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId); // Join the specified room
    socket.broadcast.to(roomId).emit('message', 'A new user has joined the room');
    console.log(`${socket.id} joined room ${roomId}`);
  });

  // Handle chat messages in a specific room
  socket.on('chatMessage', ({ roomId, message }) => {
    io.to(roomId).emit('message', message); // Broadcast to the room
  });

  // Handle offer from a user
  socket.on('offer', ({ roomId, offer }) => {
    console.log('Received offer:', offer);
    socket.broadcast.to(roomId).emit('offer', offer); // Send offer to others in the room
  });

  // Handle answer from a user
  socket.on('answer', ({ roomId, answer }) => {
    socket.broadcast.to(roomId).emit('answer', answer); // Send answer to others in the room
  });

  // Handle ICE candidate from a user
  socket.on('ice-candidate', ({ roomId, candidate }) => {
    socket.broadcast.to(roomId).emit('ice-candidate', candidate); // Send candidate to others in the room
  });

  // Notify when a user disconnects
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(5000, () => {
  console.log('Chat server running on http://localhost:5000/');
});
