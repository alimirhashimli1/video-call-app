import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./Home";
import Room from "./Room";

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/room/:roomId" element={<Room />} />
    </Routes>
  );
};

export default App;
