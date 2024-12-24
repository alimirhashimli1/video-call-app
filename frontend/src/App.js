import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { useNavigate, BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import io from 'socket.io-client';
import 'tailwindcss/tailwind.css';
// Initialize socket connection
const socket = io('https://video-call-app-1-o75x.onrender.com');
const App = () => {
    return (_jsx(Router, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Home, {}) }), _jsx(Route, { path: "/room/:roomId", element: _jsx(Room, {}) })] }) }));
};
const Home = () => {
    const navigate = useNavigate();
    const [roomUrl, setRoomUrl] = useState(null);
    const createRoom = () => {
        socket.emit('createRoom');
        socket.on('roomCreated', (roomId) => {
            const url = `${window.location.origin}/room/${roomId}`;
            setRoomUrl(url); // Set the URL for sharing
            navigate(`/room/${roomId}`);
        });
    };
    const copyToClipboard = () => {
        if (roomUrl) {
            navigator.clipboard.writeText(roomUrl);
            alert('Room URL copied to clipboard!');
        }
    };
    return (_jsxs("div", { className: "flex flex-col items-center justify-center h-screen bg-gradient-to-br from-blue-500 to-purple-600 text-white", children: [_jsx("h1", { className: "text-4xl font-bold mb-8", children: "Welcome to the Video Chat App" }), _jsx("button", { onClick: createRoom, className: "px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg shadow-md hover:bg-gray-200 transition duration-300", children: "Create Room" }), roomUrl && (_jsxs("div", { className: "mt-4", children: [_jsx("p", { className: "text-lg", children: "Share this room URL:" }), _jsxs("div", { className: "flex items-center space-x-4 mt-2", children: [_jsx("input", { type: "text", value: roomUrl, readOnly: true, className: "px-4 py-2 border rounded-lg bg-gray-100 w-64" }), _jsx("button", { onClick: copyToClipboard, className: "px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700", children: "Copy URL" })] })] }))] }));
};
const Room = () => {
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [isFullScreen, setIsFullScreen] = useState(false);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const { roomId } = useParams();
    const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
    ];
    useEffect(() => {
        socket.emit('joinRoom', roomId);
        socket.on('message', (msg, sender) => {
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
    const handleOffer = async (offer) => {
        await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnectionRef.current?.createAnswer();
        if (answer) {
            await peerConnectionRef.current?.setLocalDescription(answer);
            socket.emit('answer', { roomId, answer });
        }
    };
    const handleAnswer = async (answer) => {
        await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
    };
    const handleNewICECandidate = (candidate) => {
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
    const toggleFullscreen = (videoRef) => {
        if (videoRef.current) {
            if (videoRef.current.requestFullscreen) {
                videoRef.current.requestFullscreen();
            }
        }
    };
    const handleFullScreenToggle = () => {
        setIsFullScreen(!isFullScreen);
    };
    return (_jsxs("div", { className: `h-screen bg-gray-100 flex flex-col items-center p-6 ${isFullScreen ? 'overflow-hidden' : ''}`, children: [_jsxs("h1", { className: "text-2xl font-bold mb-6", children: ["Room: ", roomId] }), _jsxs("div", { className: `flex ${isFullScreen ? 'absolute top-0 left-0 w-full h-full z-10' : 'space-x-6 mb-6'}`, children: [_jsx("video", { ref: localVideoRef, autoPlay: true, muted: true, onClick: () => toggleFullscreen(localVideoRef), className: `w-64 h-48 bg-black rounded-md shadow-md cursor-pointer ${isFullScreen ? 'w-full h-full' : ''}` }), !isFullScreen && (_jsx("video", { ref: remoteVideoRef, autoPlay: true, onClick: () => toggleFullscreen(remoteVideoRef), className: "w-64 h-48 bg-black rounded-md shadow-md cursor-pointer" }))] }), _jsxs("div", { className: "mb-6", children: [_jsxs("p", { className: "text-lg", children: ["Room URL: ", window.location.href] }), _jsx("button", { onClick: () => navigator.clipboard.writeText(window.location.href), className: "mt-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700", children: "Copy URL" })] }), _jsxs("div", { className: "flex space-x-4 mb-6", children: [_jsx("button", { onClick: startVideo, className: "px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700", children: "Start Video" }), _jsx("button", { onClick: startCall, className: "px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700", children: "Start Call" }), _jsx("button", { onClick: handleFullScreenToggle, className: "px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700", children: "Toggle Fullscreen" })] }), _jsxs("div", { className: "w-full max-w-lg bg-white rounded-lg shadow-md p-4", children: [_jsx("ul", { className: "space-y-2", children: messages.map((msg, index) => (_jsx("li", { className: `text-gray-800 p-2 rounded-lg ${msg.sender === 'self' ? 'bg-blue-100 text-left' : 'bg-green-100 text-right'}`, children: msg.text }, index))) }), _jsxs("div", { className: "mt-4 flex space-x-2", children: [_jsx("input", { type: "text", value: messageInput, onChange: (e) => setMessageInput(e.target.value), className: "w-full px-4 py-2 border rounded-lg", placeholder: "Type a message" }), _jsx("button", { onClick: sendMessage, className: "px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700", children: "Send" })] })] })] }));
};
export default App;
