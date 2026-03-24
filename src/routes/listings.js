const express = require("express");
const router = express.Router();
const db = require("../services/db");


// GET data from listings table:
router.get("/", async (req, res) => {
  try {
    const userId = req.session.user.user_id;

    const [rows] = await db.query(`
      SELECT listing_id, title, module, location, start_time, status
      FROM listings
      ORDER BY start_time ASC
    `);

    const [requests] = await db.query(
      'SELECT listing_id FROM join_requests WHERE user_id = ?',
      [userId]
    );

    const requestedListingIds = requests.map(r => r.listing_id);

    const success = req.query.success;

    res.render("listings", {
      title: "Listings",
      listings: rows,
      requestedListingIds,
      success: req.query.success
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

    res.redirect("/subjects?success=request_sent");

  } catch (err) {
    console.error(err);
    res.status(500).send("Join request failed");
  }
});


module.exports = router;