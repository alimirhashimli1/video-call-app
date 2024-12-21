const express = require('express');
const qr = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const router = express.Router();

router.get('/generate', (req, res) => {
    const sessionId = uuidv4() + crypto.randomBytes(4).toString('hex');
    
    qr.toDataURL(`http://yourserver.com/${sessionId}`, (err, url) => {
        if (err) return res.status(500).send('Error generating QR code');
        res.send({ qrCodeUrl: url });
    });
});

module.exports = router;
