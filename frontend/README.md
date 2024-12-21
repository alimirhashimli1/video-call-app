# Real-Time Video Chat and Messaging App

This is a web application that allows users to engage in real-time video calls and text messaging. Users can create or join rooms using unique Room IDs (generated via UUID) and decide when to enable their video feed. It is powered by WebRTC for video communication, Socket.IO for real-time messaging and signaling, and React for the frontend.

---

## Features

- **Create or Join Rooms**: Users can create a new room or join an existing room using a unique Room ID.
- **Real-Time Messaging**: Send and receive messages instantly using Socket.IO.
- **Video Calls with WebRTC**: Enable video calls with peers by connecting via WebRTC and exchanging ICE candidates.
- **STUN Server Integration**: Uses public STUN servers for NAT traversal.
- **User-Friendly Interface**: React-based UI for smooth interactions.
- **Self-Hosted Server**: Backed by a Node.js server for signaling and communication.

---

## Prerequisites

Make sure you have the following installed on your computer:

- **Node.js** (v16+ recommended)
- **npm** or **yarn** (to manage dependencies)
- A modern web browser (e.g., Chrome, Firefox, Edge)

---

## Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
