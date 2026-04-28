const express = require("express");
const router = express.Router();
const db = require("../services/db");


// GET data from listings table:
router.get("/", async (req, res) => {
  try {
    const userId = req.session.user.user_id;

    const [rows] = await db.query(`
      SELECT listing_id, user_id, title, module, location, start_time, status
      FROM listings
      ORDER BY start_time ASC
    `);

    const ownedListingIds = rows
      .filter(l => l.user_id === userId)
      .map(l => l.listing_id);

    // Get current user's join requests
    const [requests] = await db.query(
      `SELECT listing_id, status 
      FROM join_requests 
      WHERE user_id = ?`,
      [userId]
    );

    const requestedListingIds = requests
      .filter(r => r.status === "pending")
      .map(r => r.listing_id);

    const acceptedListingIds = requests
      .filter(r => r.status === "accepted")
      .map(r => r.listing_id);

    // Add accepted participants to each listing
    for (let listing of rows) {
      const [participants] = await db.query(`
        SELECT u.user_id, u.first_name
        FROM join_requests jr
        JOIN users u ON jr.user_id = u.user_id
        WHERE jr.listing_id = ?
        AND jr.status = 'accepted'
      `, [listing.listing_id]);

      listing.participants = participants;
    }

    const success = req.query.success;

    res.render("listings", {
      title: "Listings",
      listings: rows,
      requestedListingIds,
      acceptedListingIds,
      ownedListingIds,
      success
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Listings error");
  }
});


// POST data given onto the webpage:

router.post("/:id/join", async (req, res) => {
  try {
    const userId = req.session.user.user_id;; 
    const listingId = req.params.id;

    //  Prevent duplicate requests
    const [existing] = await db.query(
      "SELECT * FROM join_requests WHERE user_id = ? AND listing_id = ?",
      [userId, listingId]
    );

    if (existing.length > 0) {
      return res.redirect("/subjects?error=already_requested");
    }

    // Create request
    await db.query(
      "INSERT INTO join_requests (user_id, listing_id, status) VALUES (?, ?, 'pending')",
      [userId, listingId]
    );

    // Get info for notification
    const [userRows] = await db.query(
      "SELECT first_name FROM users WHERE user_id = ?",
      [userId]
    );

    const [listingRows] = await db.query(
      "SELECT title, user_id AS host_id FROM listings WHERE listing_id = ?",
      [listingId]
    );

    const firstName = userRows[0].first_name;
    const listing = listingRows[0];

    // create notification for host:
      await db.query(
      `INSERT INTO notifications (user_id, message, is_read, created_at)
       VALUES (?, ?, 0, NOW())`,
      [
        listing.host_id,
        `${firstName} requested to join your session "${listing.title}"`
      ]
    );

    // create notification for requester:
      await db.query(
        `INSERT INTO notifications (user_id, message, is_read, created_at)
        VALUES (?, ?, 0, NOW())`,
        [
          userId,
          `Your request to join "${listing.title}" has been sent.`
        ]
      );

    

    res.redirect("/subjects?success=request_sent");

  } catch (err) {
    console.error(err);
    res.status(500).send("Join request failed");
  }
});

router.post("/:id/leave", async (req, res) => {
  try {
    const listingId = req.params.id;
    const userId = req.session.user.user_id;
    const fullName = `${req.session.user.first_name} ${req.session.user.last_name}`;

    const [listingRows] = await db.query(
      "SELECT user_id, title FROM listings WHERE listing_id = ?",
      [listingId]
    );

    const listing = listingRows[0];

    await db.query(
      "DELETE FROM join_requests WHERE listing_id = ? AND user_id = ?",
      [listingId, userId]
    );

    await db.query(
      "INSERT INTO notifications (user_id, message, is_read, created_at) VALUES (?, ?, 0, NOW())",
      [listing.user_id, `${fullName} has left your study session "${listing.title}".`]
    );

    res.redirect("/subjects");
  } catch (err) {
    console.error("Leave session error:", err);
    res.status(500).send("Error leaving session.");
  }
});

router.post("/:id/delete", async (req, res) => {
  try {
    const listingId = req.params.id;
    const userId = req.session.user.user_id;
    const fullName = `${req.session.user.first_name} ${req.session.user.last_name}`;

    const [listingRows] = await db.query(
      "SELECT * FROM listings WHERE listing_id = ? AND user_id = ?",
      [listingId, userId]
    );

    if (listingRows.length === 0) {
      return res.status(403).send("You can only delete sessions you created.");
    }

    const listing = listingRows[0];

    const [participants] = await db.query(
      "SELECT user_id FROM join_requests WHERE listing_id = ? AND status = 'accepted'",
      [listingId]
    );

    for (const participant of participants) {
      await db.query(
        "INSERT INTO notifications (user_id, message, is_read, created_at) VALUES (?, ?, 0, NOW())",
        [
          participant.user_id,
          `${fullName} has ended the study session "${listing.title}" and it has been deleted.`
        ]
      );
    }

    await db.query("DELETE FROM listing_tags WHERE listing_id = ?", [listingId]);
    await db.query("DELETE FROM join_requests WHERE listing_id = ?", [listingId]);
    await db.query("DELETE FROM listings WHERE listing_id = ?", [listingId]);

    res.redirect("/subjects");
  } catch (err) {
    console.error("Delete session error:", err);
    res.status(500).send("Error deleting session.");
  }
});


module.exports = router;