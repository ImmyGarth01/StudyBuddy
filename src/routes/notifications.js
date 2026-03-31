const express = require("express");
const router = express.Router();
const db = require("../services/db");
 
 
// =========================
// GET ALL NOTIFICATIONS
// =========================
router.get("/", async (req, res) => {
  try {
    const userId = req.session.user.user_id;
 
    const [notifications] = await db.query(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [userId]);
 
    res.render("notifications", {
      title: "Notifications",
      notifications
    });
 
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading notifications");
  }
});
 
 
// =========================
// MARK ONE AS READ
// =========================
router.post("/:id/read", async (req, res) => {
  try {
    await db.query(`
      UPDATE notifications 
      SET is_read = TRUE 
      WHERE notification_id = ?
    `, [req.params.id]);
 
    res.redirect("/notifications");
 
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating notification");
  }
});
 
 
// =========================
// MARK ALL AS READ
// =========================
router.post("/mark-all-read", async (req, res) => {
  try {
    const userId = req.session.user.user_id;
 
    await db.query(`
      UPDATE notifications 
      SET is_read = TRUE 
      WHERE user_id = ?
    `, [userId]);
 
    res.redirect("/notifications");
 
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating notifications");
  }
});
 
 
// =========================
// DELETE NOTIFICATION
// =========================
router.post("/:id/delete", async (req, res) => {
  try {
    await db.query(`
      DELETE FROM notifications 
      WHERE notification_id = ?
    `, [req.params.id]);
 
    res.redirect("/notifications");
 
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting notification");
  }
});
 
 
module.exports = router;

// MESSAGE

router.get("/", async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        // Mark all as read (optional)
        await db.query("UPDATE notifications SET is_read = TRUE WHERE user_id = ?", [userId]);
        const [notifications] = await db.query(
            `SELECT * FROM notifications 
             WHERE user_id = ? 
             ORDER BY created_at DESC`,
            [userId]
        );
        res.render("notifications", {
            title: "Notifications",
            notifications
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading notifications");
    }
});

module.exports = router;