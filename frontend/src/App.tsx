import React, { useState, useEffect, useRef } from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import io, { Socket } from "socket.io-client";
import "tailwindcss/tailwind.css";

const BACKEND_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5000"
    : "https://video-call-app-1-o75x.onrender.com";

// Initialize socket connection
const socket: Socket = io(BACKEND_URL);

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/room/:roomId" element={<Room />} />
    </Routes>
  );
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [roomUrl, setRoomUrl] = useState<string | null>(null);

  const createRoom = () => {
    socket.emit("createRoom");
    socket.on("roomCreated", (roomId: string) => {
      const url = `${window.location.origin}/room/${roomId}`;
      setRoomUrl(url);
      navigate(`/room/${roomId}`);
    });
  };

  const copyToClipboard = () => {
    if (roomUrl) {
      navigator.clipboard.writeText(roomUrl);
      alert("Room URL copied to clipboard!");
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
  const [messages, setMessages] = useState<
    { text: string; sender: "self" | "other" }[]
  >([]);
  const [messageInput, setMessageInput] = useState<string>("");
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const { roomId } = useParams<{ roomId: string }>();

  const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];

  useEffect(() => {
    socket.emit("joinRoom", roomId);

    socket.on("message", (msg: { text: string; senderId: string }) => {
      const sender = msg.senderId === socket.id ? "self" : "other";
      setMessages((prev) => [...prev, { text: msg.text, sender }]);
    });

    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleNewICECandidate);

    return () => {
      socket.off("message");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
    };
  }, [roomId]);

  const startVideo = async () => {
    if (!isVideoActive) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      peerConnectionRef.current = new RTCPeerConnection({ iceServers });
      stream
        .getTracks()
        .forEach((track) =>
          peerConnectionRef.current?.addTrack(track, stream)
        );

      peerConnectionRef.current.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", { roomId, candidate: event.candidate });
        }
      };
    } else {
      const stream = localVideoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach((track) => track.stop());
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    }
    setIsVideoActive(!isVideoActive);
  };

  const startCall = async () => {
    if (!isCallActive) {
      const offer = await peerConnectionRef.current?.createOffer();
      if (offer) {
        await peerConnectionRef.current?.setLocalDescription(offer);
        socket.emit("offer", { roomId, offer });
      }
    } else {
      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    }
    setIsCallActive(!isCallActive);
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    await peerConnectionRef.current?.setRemoteDescription(
      new RTCSessionDescription(offer)
    );
    const answer = await peerConnectionRef.current?.createAnswer();
    if (answer) {
      await peerConnectionRef.current?.setLocalDescription(answer);
      socket.emit("answer", { roomId, answer });
    }
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    await peerConnectionRef.current?.setRemoteDescription(
      new RTCSessionDescription(answer)
    );
  };

  const handleNewICECandidate = (candidate: RTCIceCandidateInit) => {
    const iceCandidate = new RTCIceCandidate(candidate);
    peerConnectionRef.current?.addIceCandidate(iceCandidate);
  };

  const sendMessage = () => {
    if (messageInput.trim()) {
      socket.emit("chatMessage", { roomId, message: messageInput });
      setMessages((prev) => [...prev, { text: messageInput, sender: "self" }]);
      setMessageInput("");
    }
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col items-center p-6">
      <h1 className="text-2xl font-bold mb-6">Room: {roomId}</h1>
      <div className="flex space-x-4 mb-6">
        <button
          onClick={startVideo}
          className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700"
        >
          {isVideoActive ? "Stop Video" : "Start Video"}
        </button>
        <button
          onClick={startCall}
          className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700"
        >
          {isCallActive ? "Stop Call" : "Start Call"}
        </button>
      </div>
      <div className="flex space-x-4 mb-6 w-full justify-center">
        <div className="relative w-1/2 md:w-1/3 bg-black rounded-lg shadow-lg p-2">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            className="w-full h-full object-cover rounded-lg"
          ></video>
          <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg text-sm">
            Your Video
          </div>
        </div>
        <div className="relative w-1/2 md:w-1/3 bg-black rounded-lg shadow-lg p-2">
          <video
            ref={remoteVideoRef}
            autoPlay
            className="w-full h-full object-cover rounded-lg"
          ></video>
          <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg text-sm">
            Remote Video
          </div>
        </div>
      </div>
      <div className="w-full max-w-md">
        <div className="bg-white shadow-lg rounded-lg p-4 overflow-y-scroll h-64 mb-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`mb-2 p-2 rounded-lg ${
                msg.sender === "self" ? "bg-blue-100 text-right" : "bg-gray-200"
              }`}
            >
              <p>{msg.text}</p>
            </div>
          ))}
        </div>
        <div className="flex">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="Type a message..."
          />
          <button
            onClick={sendMessage}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg ml-2"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
