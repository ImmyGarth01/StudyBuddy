const express = require("express"); // Imports express
const router = express.Router(); // Imports router 
const db = require("../services/db"); // Imports DB
 
 
// =========================
// GET ALL NOTIFICATIONS
// =========================
router.get("/", async (req, res) => { // defines the GET route (retrieve backend)
  try {
    const userId = req.session.user.user_id; // pulls logged in user ID from Session
 
  // gets all notifications from DB by newest first
    const [notifications] = await db.query(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [userId]);
 
    res.render("notifications", { // renders the pug notifcation 
      title: "Notifications",
      notifications
    });
 
  } catch (err) { // error message 
    console.error(err);
    res.status(500).send("Error loading notifications");
  }
});
 
 
// =========================
// MARK ONE AS READ
// =========================
router.post("/:id/read", async (req, res) => { // Sets up a post route
  try { // updates notification on DB as true 
    await db.query(`
      UPDATE notifications 
      SET is_read = TRUE 
      WHERE notification_id = ?
    `, [req.params.id]);
 
    res.redirect("/notifications"); // sends user back to notification page
 
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating notification");
  }
});
 
 // GET = Give me data and POST = Submit Data

// =========================
// MARK ALL AS READ
// =========================
router.post("/mark-all-read", async (req, res) => { // triggered when user clicks all read
  try {
    const userId = req.session.user.user_id; // get logged in user ID
 
    // Marks all notifications in DB as read 
    await db.query(`
      UPDATE notifications 
      SET is_read = TRUE 
      WHERE user_id = ?
    `, [userId]);
 
    res.redirect("/notifications"); // refreshed after update
 
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating notifications");
  }
});
 
 
// =========================
// DELETE NOTIFICATION
// =========================
router.post("/:id/delete", async (req, res) => {
  try { // Removes the notifications off the DB
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
