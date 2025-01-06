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
          console.log("Remote stream received:", event.streams[0]);
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("Sending ICE Candidate:", event.candidate);
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
    console.log("Received offer:", offer);
    await peerConnectionRef.current?.setRemoteDescription(
      new RTCSessionDescription(offer)
    );
    const answer = await peerConnectionRef.current?.createAnswer();
    if (answer) {
      console.log("Sending answer:", answer);
      await peerConnectionRef.current?.setLocalDescription(answer);
      socket.emit("answer", { roomId, answer });
    }
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    console.log("Received answer:", answer);
    await peerConnectionRef.current?.setRemoteDescription(
      new RTCSessionDescription(answer)
    );
  };

  const handleNewICECandidate = (candidate: RTCIceCandidateInit) => {
    console.log("Adding ICE Candidate:", candidate);
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
    <div className="h-screen bg-black text-white flex flex-col p-6">
      {/* Copy Modal */}
      {showCopyModal && (
        <div className="absolute top-16 p-4 bg-gray-800 text-white rounded-lg shadow-lg transition-transform duration-500 animate-fade-in-out">
          <p className="text-sm font-medium">Room URL copied to clipboard!</p>
        </div>
      )}
      {/* The rest of the component remains the same */}
    </div>
  );
};

export default Room;
