import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';

// Initialize socket connection
const socket: Socket = io('http://localhost:5000'); // Replace with your backend URL

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomId" element={<Room />} />
      </Routes>
    </Router>
  );
};

const Home: React.FC = () => {
  const navigate = useNavigate();

  const createRoom = () => {
    socket.emit('createRoom'); // Request backend to create a room
    socket.on('roomCreated', (roomId: string) => {
      navigate(`/room/${roomId}`); // Redirect to the room
    });
  };

  return (
    <div>
      <h1>Welcome to the Video Chat App</h1>
      <button onClick={createRoom}>Create Room</button>
    </div>
  );
};

const Room: React.FC = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [messageInput, setMessageInput] = useState<string>('');
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const { roomId } = useParams<{ roomId: string }>();

  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' }, // Google's public STUN server
  ];

  useEffect(() => {
    socket.emit('joinRoom', roomId); // Join the room upon entering

    socket.on('message', (msg: string) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleNewICECandidate);

    return () => {
      socket.off('message');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
    };
  }, [roomId]);

  const startVideo = async (): Promise<void> => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    peerConnectionRef.current = new RTCPeerConnection({ iceServers });
    stream.getTracks().forEach((track) => peerConnectionRef.current?.addTrack(track, stream));

    peerConnectionRef.current.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { roomId, candidate: event.candidate });
      }
    };
  };

  const startCall = async (): Promise<void> => {
    const offer = await peerConnectionRef.current?.createOffer();
    if (offer) {
      await peerConnectionRef.current?.setLocalDescription(offer);
      socket.emit('offer', { roomId, offer });
    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnectionRef.current?.createAnswer();
    if (answer) {
      await peerConnectionRef.current?.setLocalDescription(answer);
      socket.emit('answer', { roomId, answer });
    }
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const handleNewICECandidate = (candidate: RTCIceCandidateInit) => {
    const iceCandidate = new RTCIceCandidate(candidate);
    peerConnectionRef.current?.addIceCandidate(iceCandidate);
  };

  const sendMessage = () => {
    if (messageInput.trim()) {
      socket.emit('chatMessage', { roomId, message: messageInput });
      setMessageInput('');
    }
  };

  return (
    <div>
      <h1>Room: {roomId}</h1>
      <video ref={localVideoRef} autoPlay muted style={{ width: '300px' }} />
      <video ref={remoteVideoRef} autoPlay style={{ width: '300px' }} />

      <button onClick={startVideo}>Start Video</button>
      <button onClick={startCall}>Start Call</button>

      <ul>
        {messages.map((msg, index) => (
          <li key={index}>{msg}</li>
        ))}
      </ul>
      <input
        type="text"
        value={messageInput}
        onChange={(e) => setMessageInput(e.target.value)}
        placeholder="Type a message"
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};

export default App;
