const express = require('express');
const multer = require('multer');
const router = express.Router();

// Set up file storage (e.g., in-memory, or on disk)
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded');
    
    // Save file data or metadata here (you can save to disk, a database, etc.)
    res.status(200).send({ message: 'File uploaded successfully' });
});

module.exports = router;
