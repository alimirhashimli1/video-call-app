import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';

// Initialize socket connection
const socket: Socket = io('https://video-call-app-1-o75x.onrender.com'); 

const Room: React.FC = () => {
  const [messages, setMessages] = useState<{ text: string; sender: 'self' | 'other' }[]>([]);
  const [messageInput, setMessageInput] = useState<string>('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null); // Hold local media stream
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();

  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
  ];

  useEffect(() => {
    if (roomId) {
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
        cleanupStream();
      };
    }
  }, [roomId]);

  const cleanupStream = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
  };

  const startVideo = async () => {
    // Stop any previous stream before starting a new one
    cleanupStream();

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream; // Save the local stream for cleanup

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
        <p className="text-lg">Room URL: {location.pathname}</p>
        <button
          onClick={() => navigator.clipboard.writeText(location.pathname)}
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
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-4 space-y-4">
        <div className="space-y-2 h-64 overflow-y-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`p-2 rounded-lg ${message.sender === 'self' ? 'bg-blue-200' : 'bg-gray-200'}`}
            >
              {message.text}
            </div>
          ))}
        </div>

        <div className="flex space-x-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="Type a message"
          />
          <button
            onClick={sendMessage}
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Room;
