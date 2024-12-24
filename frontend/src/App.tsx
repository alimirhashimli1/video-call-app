import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';
import 'tailwindcss/tailwind.css';

// Initialize socket connection
const socket: Socket = io('https://video-call-app-1-o75x.onrender.com');

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
  const [roomUrl, setRoomUrl] = useState<string | null>(null);

  // Create a new room and generate the URL
  const createRoom = () => {
    socket.emit('createRoom');
    socket.on('roomCreated', (roomId: string) => {
      const url = `${window.location.origin}/room/${roomId}`;
      setRoomUrl(url); // Set the URL for sharing
      navigate(`/room/${roomId}`);
    });
  };

  // Copy the room URL to clipboard
  const copyToClipboard = () => {
    if (roomUrl) {
      navigator.clipboard.writeText(roomUrl);
      alert('Room URL copied to clipboard!');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-blue-500 to-purple-600 text-white">
      <h1 className="text-4xl font-bold mb-8">Welcome to the Video Chat App</h1>
      <button
        onClick={createRoom}
        className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg shadow-md hover:bg-gray-200 transition duration-300"
      >
        Create Room
      </button>
      {roomUrl && (
        <div className="mt-4">
          <p className="text-lg">Share this room URL:</p>
          <div className="flex items-center space-x-4 mt-2">
            <input
              type="text"
              value={roomUrl}
              readOnly
              className="px-4 py-2 border rounded-lg bg-gray-100 w-64"
            />
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700"
            >
              Copy URL
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Room: React.FC = () => {
  const [messages, setMessages] = useState<{ text: string; sender: 'self' | 'other' }[]>([]);
  const [messageInput, setMessageInput] = useState<string>('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const { roomId } = useParams<{ roomId: string }>();

  const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];

  useEffect(() => {
    socket.emit('joinRoom', roomId);

    socket.on('message', (msg: string, sender: 'self' | 'other') => {
      setMessages((prev) => [...prev, { text: msg, sender }]);
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

  const startVideo = async () => {
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

  const startCall = async () => {
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
      setMessages((prev) => [...prev, { text: messageInput, sender: 'self' }]);
      setMessageInput('');
    }
  };

  const toggleFullscreen = (videoRef: React.RefObject<HTMLVideoElement>) => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const handleFullScreenToggle = () => {
    setIsFullScreen(!isFullScreen);
  };

  return (
    <div className={`h-screen bg-gray-100 flex flex-col items-center p-6 ${isFullScreen ? 'overflow-hidden' : ''}`}>
      <h1 className="text-2xl font-bold mb-6">Room: {roomId}</h1>

      {/* Video Section */}
      <div className={`flex ${isFullScreen ? 'absolute top-0 left-0 w-full h-full z-10' : 'space-x-6 mb-6'}`}>
        <video
          ref={localVideoRef}
          autoPlay
          muted
          onClick={() => toggleFullscreen(localVideoRef)}
          className={`w-64 h-48 bg-black rounded-md shadow-md cursor-pointer ${isFullScreen ? 'w-full h-full' : ''}`}
        />
        {!isFullScreen && (
          <video
            ref={remoteVideoRef}
            autoPlay
            onClick={() => toggleFullscreen(remoteVideoRef)}
            className="w-64 h-48 bg-black rounded-md shadow-md cursor-pointer"
          />
        )}
      </div>

      {/* URL Display and Copy Button */}
      <div className="mb-6">
        <p className="text-lg">Room URL: {window.location.href}</p>
        <button
          onClick={() => navigator.clipboard.writeText(window.location.href)}
          className="mt-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700"
        >
          Copy URL
        </button>
      </div>

      {/* Video Controls */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={startVideo}
          className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700"
        >
          Start Video
        </button>
        <button
          onClick={startCall}
          className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700"
        >
          Start Call
        </button>
        <button
          onClick={handleFullScreenToggle}
          className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700"
        >
          Toggle Fullscreen
        </button>
      </div>

      {/* Chat Section */}
      <div className="flex flex-col items-center space-y-2 w-full max-w-lg">
        <div className="overflow-y-auto max-h-40 w-full bg-gray-100 p-4 rounded-md shadow-md space-y-2 mb-4">
          {messages.map((msg, index) => (
            <p key={index} className={`text-sm ${msg.sender === 'self' ? 'text-blue-600' : 'text-gray-800'}`}>
              {msg.text}
            </p>
          ))}
        </div>

        <div className="flex w-full max-w-lg">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            className="w-full p-2 border rounded-l-md"
            placeholder="Type a message..."
          />
          <button
            onClick={sendMessage}
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-r-md"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
