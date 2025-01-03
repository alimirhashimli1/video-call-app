import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { socket } from "./socket/socket";

const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];


const Room: React.FC<{ roomUrl: string }> = ({ roomUrl }) => {
  const [messages, setMessages] = useState<
    { text: string; sender: "self" | "other" }[]
  >([]);
  const [messageInput, setMessageInput] = useState<string>("");
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const { roomId } = useParams<{ roomId: string }>();

  
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

  const handleCopy = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomUrl);
      setShowCopyModal(true);
      setTimeout(() => setShowCopyModal(false), 2000); // Hide modal after 2 seconds
    }
  };

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
        .forEach((track) => peerConnectionRef.current?.addTrack(track, stream));

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
      <div className="relative flex flex-col items-center mb-8 w-full max-w-md">
        <h1 className="text-3xl font-extrabold text-gray-800 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg shadow-md text-center">
          Room URL
        </h1>
        <p className="mt-4 text-lg text-gray-700 font-medium px-4 py-2 bg-gray-100 rounded-lg shadow-sm">
          {roomUrl}
        </p>
        <button
          onClick={handleCopy}
          className="mt-4 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300"
        >
          Copy URL
        </button>

        {showCopyModal && (
          <div className="absolute top-16 p-4 bg-gray-800 text-white rounded-lg shadow-lg transition-transform duration-500 animate-fade-in-out">
            <p className="text-sm font-medium">Room URL copied to clipboard!</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center mb-6 space-x-4 w-full max-w-md">
        <button
          onClick={startVideo}
          className={`px-6 py-3 font-semibold rounded-lg shadow-md ${
            isVideoActive
              ? "bg-teal-600 text-white hover:bg-teal-700"
              : "bg-gray-400 text-gray-800 hover:bg-gray-500"
          } w-32 mb-4 md:mb-0`}
        >
          {isVideoActive ? "Stop Video" : "Start Video"}
        </button>
        <button
          onClick={startCall}
          className={`px-6 py-3 font-semibold rounded-lg shadow-md ${
            isCallActive
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-green-600 text-white hover:bg-green-700"
          } w-32 mb-4 md:mb-0`}
        >
          {isCallActive ? "End Call" : "Start Call"}
        </button>
      </div>

      <div className="w-full max-w-md mb-4">
        <div className="flex flex-col space-y-4 bg-white p-4 rounded-lg shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            className="w-full h-64 object-cover rounded-lg border-2 border-gray-300"
          />
          <video
            ref={remoteVideoRef}
            autoPlay
            className="w-full h-64 object-cover rounded-lg border-2 border-gray-300"
          />
        </div>
      </div>

      <div className="w-full max-w-md">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Type a message"
          />
          <button
            onClick={sendMessage}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Send
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`p-2 rounded-lg ${
                msg.sender === "self"
                  ? "bg-blue-600 text-white text-right"
                  : "bg-gray-300 text-black"
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Room;
