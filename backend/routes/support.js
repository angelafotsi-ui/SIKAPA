const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const SUPPORT_LOG_PATH = path.join(__dirname, '../logs/support_messages.json');

function ensureSupportLogFile() {
    if (!fs.existsSync(SUPPORT_LOG_PATH)) {
        fs.writeFileSync(SUPPORT_LOG_PATH, JSON.stringify([], null, 2));
    }
}

function readSupportMessages() {
    ensureSupportLogFile();
    try {
        const raw = fs.readFileSync(SUPPORT_LOG_PATH, 'utf8');
        const parsed = JSON.parse(raw || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('[Support] Failed reading support_messages.json:', error);
        return [];
    }
}

function writeSupportMessages(messages) {
    ensureSupportLogFile();
    fs.writeFileSync(SUPPORT_LOG_PATH, JSON.stringify(messages, null, 2));
}

router.get('/messages/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        const messages = readSupportMessages()
            .filter(msg => msg.userId === userId)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        return res.json({ success: true, messages });
    } catch (error) {
        console.error('[Support] Error getting user messages:', error);
        return res.status(500).json({ success: false, message: 'Failed to load support messages' });
    }
});

router.post('/messages', (req, res) => {
    try {
        const { userId, userName, userEmail, text } = req.body;
        if (!userId || !text) {
            return res.status(400).json({ success: false, message: 'userId and text are required' });
        }

        const cleanedText = String(text).trim();
        if (!cleanedText) {
            return res.status(400).json({ success: false, message: 'Message cannot be empty' });
        }

        const messages = readSupportMessages();
        const newMessage = {
            id: `msg_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            userId,
            userName: userName || 'User',
            userEmail: userEmail || '',
            senderType: 'user',
            text: cleanedText,
            createdAt: new Date().toISOString(),
            readByAdmin: false
        };

        messages.push(newMessage);
        writeSupportMessages(messages);

        return res.json({ success: true, message: 'Message sent', data: newMessage });
    } catch (error) {
        console.error('[Support] Error saving user message:', error);
        return res.status(500).json({ success: false, message: 'Failed to send message' });
    }
});

router.get('/admin/conversations', (req, res) => {
    try {
        const messages = readSupportMessages();
        const grouped = new Map();

        messages.forEach(msg => {
            const key = msg.userId;
            if (!grouped.has(key)) {
                grouped.set(key, {
                    userId: msg.userId,
                    userName: msg.userName || 'User',
                    userEmail: msg.userEmail || '',
                    lastMessage: msg.text,
                    lastMessageAt: msg.createdAt,
                    unreadCount: 0
                });
            }

            const current = grouped.get(key);
            if (new Date(msg.createdAt) > new Date(current.lastMessageAt)) {
                current.lastMessage = msg.text;
                current.lastMessageAt = msg.createdAt;
            }

            if (msg.senderType === 'user' && !msg.readByAdmin) {
                current.unreadCount += 1;
            }
        });

        const conversations = Array.from(grouped.values()).sort(
            (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
        );

        return res.json({ success: true, conversations });
    } catch (error) {
        console.error('[Support] Error loading admin conversations:', error);
        return res.status(500).json({ success: false, message: 'Failed to load conversations' });
    }
});

router.get('/admin/messages/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        const messages = readSupportMessages();
        const conversation = messages
            .filter(msg => msg.userId === userId)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        const updated = messages.map(msg => {
            if (msg.userId === userId && msg.senderType === 'user') {
                return { ...msg, readByAdmin: true };
            }
            return msg;
        });
        writeSupportMessages(updated);

        return res.json({ success: true, messages: conversation });
    } catch (error) {
        console.error('[Support] Error loading admin messages:', error);
        return res.status(500).json({ success: false, message: 'Failed to load messages' });
    }
});

router.post('/admin/reply', (req, res) => {
    try {
        const { userId, text, adminName } = req.body;
        if (!userId || !text) {
            return res.status(400).json({ success: false, message: 'userId and text are required' });
        }

        const cleanedText = String(text).trim();
        if (!cleanedText) {
            return res.status(400).json({ success: false, message: 'Reply cannot be empty' });
        }

        const messages = readSupportMessages();
        const lastUserMessage = [...messages].reverse().find(msg => msg.userId === userId);
        const newReply = {
            id: `msg_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            userId,
            userName: lastUserMessage?.userName || 'User',
            userEmail: lastUserMessage?.userEmail || '',
            senderType: 'admin',
            senderName: adminName || 'System Agent',
            text: cleanedText,
            createdAt: new Date().toISOString(),
            readByAdmin: true
        };

        messages.push(newReply);
        writeSupportMessages(messages);

        return res.json({ success: true, message: 'Reply sent', data: newReply });
    } catch (error) {
        console.error('[Support] Error saving admin reply:', error);
        return res.status(500).json({ success: false, message: 'Failed to send reply' });
    }
});

module.exports = router;
