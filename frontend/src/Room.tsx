import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { socket } from "./socket/socket";

const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];

const Room: React.FC = () => {
  const [messages, setMessages] = useState<
    { text: string; sender: "self" | "other" }[]
  >([]);
  const [messageInput, setMessageInput] = useState<string>("");
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [fullScreenVideo, setFullScreenVideo] = useState<"local" | "remote" | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const { roomId } = useParams<{ roomId: string }>();
  const roomUrl = roomId ? `${window.location.origin}/room/${roomId}` : "";

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
      setTimeout(() => setShowCopyModal(false), 2000);
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

  const toggleFullScreen = (type: "local" | "remote") => {
    setFullScreenVideo((prev) => (prev === type ? null : type));
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold">Room URL</h1>
          <div className="flex items-center space-x-2">
            <p className="text-sm">{roomUrl}</p>
            <button onClick={handleCopy} className="bg-blue-500 text-white p-2 rounded">
              Copy
            </button>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={startVideo}
            className="bg-green-500 text-white p-2 rounded"
          >
            {isVideoActive ? "Stop Video" : "Start Video"}
          </button>
          <button
            onClick={startCall}
            className="bg-red-500 text-white p-2 rounded"
          >
            {isCallActive ? "End Call" : "Start Call"}
          </button>
        </div>
      </div>
      <div className="flex flex-1">
        <div
          className={`flex flex-1 ${fullScreenVideo ? "hidden" : "flex"}`}
          style={{ width: "80%" }}
        >
          <div className="flex-1 relative">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              onDoubleClick={() => toggleFullScreen("local")}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 relative">
            <video
              ref={remoteVideoRef}
              autoPlay
              onDoubleClick={() => toggleFullScreen("remote")}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        <div
          className={`flex-1 ${
            fullScreenVideo ? "flex" : "hidden"
          } justify-center items-center`}
        >
          <video
            ref={fullScreenVideo === "local" ? localVideoRef : remoteVideoRef}
            autoPlay
            muted={fullScreenVideo === "local"}
            onDoubleClick={() => setFullScreenVideo(null)}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="w-1/5 bg-gray-200 p-4">
          <div className="flex flex-col h-full">
            <div className="flex-grow overflow-auto">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-2 mb-2 rounded ${
                    msg.sender === "self"
                      ? "bg-blue-500 text-white text-right"
                      : "bg-gray-300 text-black"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>
            <div className="flex">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="flex-grow p-2 border border-gray-300 rounded-l"
                placeholder="Type a message"
              />
              <button
                onClick={sendMessage}
                className="bg-blue-500 text-white p-2 rounded-r"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Copy Modal */}
      {showCopyModal && (
        <div className="absolute top-16 p-4 bg-gray-800 text-white rounded-lg shadow-lg transition-transform duration-500 animate-fade-in-out">
          <p className="text-sm font-medium">Room URL copied to clipboard!</p>
        </div>
      )}
    </div>
  );
};

export default Room;
