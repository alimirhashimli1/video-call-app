import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "./socket/socket";

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");

  const createRoom = () => {
    setIsLoading(true);
    setLoadingMessage("Loading the room...");

    const messages = ["Loading the room...", "Please wait...", "Creating the chat..."];
    let messageIndex = 0;

    const interval = setInterval(() => {
      messageIndex++;
      if (messageIndex < messages.length) {
        setLoadingMessage(messages[messageIndex]);
      }
    }, 2000);

    socket.emit("createRoom");
    socket.on("roomCreated", (roomId: string) => {
      clearInterval(interval);
      const url = `${window.location.origin}/room/${roomId}`;
      setRoomUrl(url);
      setIsLoading(false);
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
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white px-6 py-8">
      <h1 className="text-4xl font-bold mb-8">Welcome to the Video Chat App</h1>
      <button
        onClick={createRoom}
        disabled={isLoading}
        className="w-60 h-14 px-6 py-3 text-white font-semibold rounded-lg shadow-md transition duration-300 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            <span>{loadingMessage}</span>
          </div>
        ) : (
          "Create Room"
        )}
      </button>

      {/* Informational Paragraphs */}
      <div className="mt-8 text-center space-y-6 max-w-lg">
        <p className="text-lg font-medium">
          <span className="underline decoration-blue-500">Test Mode:</span> To try the app, either send the room link to another PC or open it in another tab in your browser.
        </p>
        <p className="text-lg font-medium">
          Avoid opening another browser as it might not allow simultaneous use of your camera.
        </p>
        <p className="text-lg font-medium">
          Please refrain from using a mobile phone for testing. It might not be compatible with this version. We’re working on a mobile version!
        </p>
      </div>

      {roomUrl && (
        <div className="mt-6">
          <p className="text-lg font-bold">Share this room URL:</p>
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
