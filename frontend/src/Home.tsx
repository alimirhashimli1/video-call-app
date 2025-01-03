import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "./socket/socket";

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
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-blue-500 to-purple-600 text-white px-6 py-8">
      <h1 className="text-4xl font-bold mb-8">Welcome to the Video Chat App</h1>
      <button
        onClick={createRoom}
        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300"
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

export default Home;
