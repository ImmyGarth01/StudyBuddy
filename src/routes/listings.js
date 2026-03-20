const express = require("express");
const router = express.Router();
const db = require("../services/db");


// GET data from listings table:
router.get("/", async (req, res) => {
  try {
    const userId = 1;

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
  console.log("JOIN ROUTE HIT");
  const listingId = req.params.id;
  const userId = 15;

  try {
    await db.query(
      'INSERT INTO join_requests (user_id, listing_id, status) VALUES (?, ?, ?)',
      [userId, listingId, 'pending']
    );

    res.redirect("/listings?success=1");

  } catch (err) {
    console.error(err);
    //redirects user instead of opening an error page:
    res.redirect("/listings?error=1");
  }
});


module.exports = router;