const express = require("express");
const router = express.Router();
const db = require("../services/db");

// Helper: can two users message directly?
async function canMessage(userId, otherId) {
    const [userRows] = await db.query("SELECT degree FROM users WHERE user_id = ?", [userId]);
    const [otherRows] = await db.query("SELECT degree FROM users WHERE user_id = ?", [otherId]);
    if (!userRows.length || !otherRows.length) return false;
    const userDegree = userRows[0].degree;
    const otherDegree = otherRows[0].degree;
    if (userDegree === otherDegree) return true;

    const [reqRows] = await db.query(
        `SELECT * FROM message_requests 
         WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) 
           AND status = 'accepted'`,
        [userId, otherId, otherId, userId]
    );
    return reqRows.length > 0;
}

// Inbox
router.get("/", async (req, res) => {
    try {
        const userId = req.session.user.user_id;

        const [conversations] = await db.query(`
            WITH ranked_messages AS (
                SELECT 
                    m.*,
                    CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END AS other_user_id,
                    ROW_NUMBER() OVER (
                        PARTITION BY CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END 
                        ORDER BY m.created_at DESC
                    ) AS rn
                FROM messages m
                WHERE m.sender_id = ? OR m.receiver_id = ?
            )
            SELECT 
                u.user_id,
                u.first_name,
                u.last_name,
                u.degree,
                rm.content AS last_message,
                rm.created_at AS last_message_time,
                CASE WHEN rm.sender_id = ? THEN rm.is_read ELSE TRUE END AS is_read_by_current_user
            FROM ranked_messages rm
            JOIN users u ON u.user_id = rm.other_user_id
            WHERE rm.rn = 1
            ORDER BY rm.created_at DESC
        `, [userId, userId, userId, userId, userId]);

        const [requests] = await db.query(`
            SELECT
                r.request_id,
                r.sender_id,
                r.receiver_id,
                r.status,
                u.user_id,
                u.first_name,
                u.last_name,
                u.degree
            FROM message_requests r
            JOIN users u ON (r.sender_id = u.user_id OR r.receiver_id = u.user_id) AND u.user_id != ?
            WHERE (r.sender_id = ? OR r.receiver_id = ?) AND r.status = 'pending'
        `, [userId, userId, userId]);

        res.render("messages/inbox", {
            title: "Messages",
            conversations,
            requests
        });
    } catch (err) {
        console.error("Inbox error:", err);
        res.status(500).send("Error loading messages");
    }
});

// Conversation with a specific user
router.get("/:userId", async (req, res) => {
    try {
        const currentUserId = req.session.user.user_id;
        const otherUserId = parseInt(req.params.userId);
        if (isNaN(otherUserId)) return res.status(400).send("Invalid user");

        if (!(await canMessage(currentUserId, otherUserId))) {
            return res.redirect(`/messages/request/${otherUserId}`);
        }

        const [messages] = await db.query(`
            SELECT * FROM messages
            WHERE (sender_id = ? AND receiver_id = ?)
               OR (sender_id = ? AND receiver_id = ?)
            ORDER BY created_at ASC
        `, [currentUserId, otherUserId, otherUserId, currentUserId]);

        await db.query(`
            UPDATE messages SET is_read = TRUE
            WHERE receiver_id = ? AND sender_id = ? AND is_read = FALSE
        `, [currentUserId, otherUserId]);

        const [otherUser] = await db.query(
            "SELECT user_id, first_name, last_name, degree FROM users WHERE user_id = ?",
            [otherUserId]
        );

        res.render("messages/conversation", {
            title: `Chat with ${otherUser[0].first_name}`,
            otherUser: otherUser[0],
            messages
        });
    } catch (err) {
        console.error("Conversation error:", err);
        res.status(500).send("Error loading conversation");
    }
});

// Send a message
router.post("/send", async (req, res) => {
    try {
        const currentUserId = req.session.user.user_id;
        const { receiver_id, content } = req.body;
        if (!receiver_id || !content) return res.status(400).send("Missing fields");

        if (!(await canMessage(currentUserId, receiver_id))) {
            return res.status(403).send("Cannot message this user");
        }

        await db.query(
            "INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)",
            [currentUserId, receiver_id, content]
        );

        // Insert notification for receiver
        const [receiverRow] = await db.query(
            "SELECT first_name, last_name FROM users WHERE user_id = ?",
            [receiver_id]
        );
        const senderName = `${req.session.user.first_name} ${req.session.user.last_name}`;
        await db.query(
            "INSERT INTO notifications (user_id, message, type) VALUES (?, ?, 'message')",
            [receiver_id, `New message from ${senderName}`]
        );

        res.redirect(`/messages/${receiver_id}`);
    } catch (err) {
        console.error("Send message error:", err);
        res.status(500).send("Error sending message");
    }
});

// Request page
router.get("/request/:userId", async (req, res) => {
    try {
        const currentUserId = req.session.user.user_id;
        const otherUserId = parseInt(req.params.userId);
        if (isNaN(otherUserId)) return res.status(400).send("Invalid user");

        if (await canMessage(currentUserId, otherUserId)) {
            return res.redirect(`/messages/${otherUserId}`);
        }

        const [existing] = await db.query(`
            SELECT * FROM message_requests
            WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
        `, [currentUserId, otherUserId, otherUserId, currentUserId]);

        let requestStatus = null;
        if (existing.length > 0) {
            requestStatus = existing[0].status;
        }

        const [otherUser] = await db.query(
            "SELECT user_id, first_name, last_name, degree FROM users WHERE user_id = ?",
            [otherUserId]
        );

        res.render("messages/request", {
            title: "Message Request",
            otherUser: otherUser[0],
            requestStatus
        });
    } catch (err) {
        console.error("Request page error:", err);
        res.status(500).send("Error loading request page");
    }
});

// Send request
router.post("/request/:userId", async (req, res) => {
    try {
        const currentUserId = req.session.user.user_id;
        const otherUserId = parseInt(req.params.userId);
        if (isNaN(otherUserId)) return res.status(400).send("Invalid user");

        if (await canMessage(currentUserId, otherUserId)) {
            return res.redirect(`/messages/${otherUserId}`);
        }

        await db.query(
            "INSERT IGNORE INTO message_requests (sender_id, receiver_id, status) VALUES (?, ?, 'pending')",
            [currentUserId, otherUserId]
        );

        // Optionally, insert a notification for the receiver (request received)
        const [receiverRow] = await db.query(
            "SELECT first_name, last_name FROM users WHERE user_id = ?",
            [otherUserId]
        );
        const senderName = `${req.session.user.first_name} ${req.session.user.last_name}`;
        await db.query(
            "INSERT INTO notifications (user_id, message, type) VALUES (?, ?, 'request_sent')",
            [otherUserId, `${senderName} wants to message you.`]
        );

        res.redirect(`/messages/request/${otherUserId}`);
    } catch (err) {
        console.error("Send request error:", err);
        res.status(500).send("Error sending request");
    }
});

// Accept request
router.post("/request/:userId/accept", async (req, res) => {
    try {
        const currentUserId = req.session.user.user_id;
        const otherUserId = parseInt(req.params.userId);
        if (isNaN(otherUserId)) return res.status(400).send("Invalid user");

        await db.query(`
            UPDATE message_requests SET status = 'accepted'
            WHERE sender_id = ? AND receiver_id = ?
        `, [otherUserId, currentUserId]);

        // Insert notification for the other user (the one who sent the request)
        const [otherUserRow] = await db.query(
            "SELECT first_name, last_name FROM users WHERE user_id = ?",
            [otherUserId]
        );
        const currentUserName = `${req.session.user.first_name} ${req.session.user.last_name}`;
        await db.query(
            "INSERT INTO notifications (user_id, message, type) VALUES (?, ?, 'request_accepted')",
            [otherUserId, `${currentUserName} accepted your message request.`]
        );

        res.redirect(`/messages/${otherUserId}`);
    } catch (err) {
        console.error("Accept request error:", err);
        res.status(500).send("Error accepting request");
    }
});

// Decline request
router.post("/request/:userId/decline", async (req, res) => {
    try {
        const currentUserId = req.session.user.user_id;
        const otherUserId = parseInt(req.params.userId);
        if (isNaN(otherUserId)) return res.status(400).send("Invalid user");

        await db.query(`
            UPDATE message_requests SET status = 'declined'
            WHERE sender_id = ? AND receiver_id = ?
        `, [otherUserId, currentUserId]);

        // Optional: notification for the other user
        const [otherUserRow] = await db.query(
            "SELECT first_name, last_name FROM users WHERE user_id = ?",
            [otherUserId]
        );
        const currentUserName = `${req.session.user.first_name} ${req.session.user.last_name}`;
        await db.query(
            "INSERT INTO notifications (user_id, message, type) VALUES (?, ?, 'request_declined')",
            [otherUserId, `${currentUserName} declined your message request.`]
        );

        res.redirect(`/messages/request/${otherUserId}`);
    } catch (err) {
        console.error("Decline request error:", err);
        res.status(500).send("Error declining request");
    }
});

module.exports = router;

// Poll for new messages
router.get("/:userId/poll", async (req, res) => {
    try {
        const currentUserId = req.session.user.user_id;
        const otherUserId = parseInt(req.params.userId);
        const lastId = parseInt(req.query.last) || 0;

        const [newMessages] = await db.query(`
            SELECT * FROM messages
            WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
              AND message_id > ?
            ORDER BY created_at ASC
        `, [currentUserId, otherUserId, otherUserId, currentUserId, lastId]);

        res.json({ newMessages });
    } catch (err) {
        console.error("Poll error:", err);
        res.status(500).json({ error: "Internal error" });
    }
});