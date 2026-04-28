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


// =========================
// ACCEPT NOTIFICATION
// =========================
router.post("/:notificationId/accept", async (req, res) => {
  try {
    const hostId = req.session.user.user_id;
    const notificationId = req.params.notificationId;

    // step 1:  get notification
    const [notifRows] = await db.query(
      `SELECT message
       FROM notifications
       WHERE notification_id = ?
       AND user_id = ?`,
      [notificationId, hostId]
    );

    if (notifRows.length === 0) {
      return res.status(404).send("Notification not found");
    }

    const message = notifRows[0].message;

    // step 2: get the session title
    const titleMatch = message.match(/session "(.+)"/);
    const nameMatch = message.split(" requested")[0];

    if (!titleMatch) {
      return res.status(400).send("Could not parse notification");
    }

    const listingTitle = titleMatch[1];
    const requesterName = nameMatch;

    // step 3: find matching join request
    const [rows] = await db.query(
      `SELECT jr.id, jr.user_id, l.title
       FROM join_requests jr
       JOIN listings l ON jr.listing_id = l.listing_id
       JOIN users u ON jr.user_id = u.user_id
       WHERE l.title = ?
       AND l.user_id = ?
       AND u.first_name = ?
       AND jr.status = 'pending'
       LIMIT 1`,
      [listingTitle, hostId, requesterName]
    );

    if (rows.length === 0) {
      return res.status(404).send("Join request not found");
    }

    const request = rows[0];

    // step 4: set status to accepted
    await db.query(
      `UPDATE join_requests
       SET status = 'accepted'
       WHERE id = ?`,
      [request.id]
    );

    // step 5: send notification to requester
    await db.query(
      `INSERT INTO notifications (user_id, message, is_read, created_at)
       VALUES (?, ?, 0, NOW())`,
      [
        request.user_id,
        `You have been accepted into "${request.title}".`
      ]
    );

    // step 6 : delete the original join request notification
    await db.query(
      `DELETE FROM notifications WHERE notification_id = ?`,
      [notificationId]
    );

res.redirect("/notifications");

  } catch (err) {
    console.error(err);
    res.status(500).send("Accept failed");
  }
});


// =========================
// DECLINE NOTIFICATION
// =========================
router.post("/:notificationId/decline", async (req, res) => {
  try {
    const hostId = req.session.user.user_id;
    const notificationId = req.params.notificationId;

    // step 1: extract the notification information
    const [notifRows] = await db.query(
      `SELECT message
       FROM notifications
       WHERE notification_id = ?
       AND user_id = ?`,
      [notificationId, hostId]
    );

    const message = notifRows[0].message;

    const titleMatch = message.match(/session "(.+)"/);
    const nameMatch = message.split(" requested")[0];

    const listingTitle = titleMatch[1];
    const requesterName = nameMatch;

    // step 2: find the join request and requesting user
    const [rows] = await db.query(
      `SELECT jr.id, jr.user_id, l.title
       FROM join_requests jr
       JOIN listings l ON jr.listing_id = l.listing_id
       JOIN users u ON jr.user_id = u.user_id
       WHERE l.title = ?
       AND l.user_id = ?
       AND u.first_name = ?
       AND jr.status = 'pending'
       LIMIT 1`,
      [listingTitle, hostId, requesterName]
    );

    if (rows.length === 0) {
      return res.status(404).send("Join request not found");
    }

    const request = rows[0];

    // step 3: change the request to declined on db
    await db.query(
      `UPDATE join_requests
       SET status = 'declined'
       WHERE id = ?`,
      [request.id]
    );

    // step 4: send notification to requester to say session was declined
    await db.query(
      `INSERT INTO notifications (user_id, message, is_read, created_at)
       VALUES (?, ?, 0, NOW())`,
      [
        request.user_id,
        `Your request to join "${request.title}" was declined.`
      ]
    );

    await db.query(
      `DELETE FROM notifications WHERE notification_id = ?`,
      [notificationId]
    );

    res.redirect("/notifications");

  } catch (err) {
    console.error(err);
    res.status(500).send("Decline failed");
  }
});
 
 
module.exports = router;
