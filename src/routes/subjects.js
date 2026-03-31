const express = require("express");
const router = express.Router();
const db = require("../services/db");

//getting list of all Degrees to display on screen
router.get("/", async (req, res) => {
  try {
    const [degrees] = await db.query(
  "SELECT DISTINCT degree FROM modules ORDER BY degree ASC"
);
    res.render("tags", {
      title: "Subjects",
      degrees: degrees,
      selectedDegree: null,
      modules: null,
      listings:[]
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading degrees");
  }
});


router.get("/:degree", async (req, res) => {
  try {
    const degree = decodeURIComponent(req.params.degree);

    const [rows] = await db.query(`
      SELECT DISTINCT
        listings.listing_id,
        listings.title,
        listings.location,
        listings.start_time,
        listings.status,
        modules.module_name,
        modules.level,
        tags.sessionType
      FROM listings
      JOIN modules 
        ON listings.module = modules.module_name
      LEFT JOIN listing_tags 
        ON listings.listing_id = listing_tags.listing_id
      LEFT JOIN tags 
        ON listing_tags.tag_id = tags.tag_id
      WHERE modules.degree = ?
      ORDER BY listings.start_time ASC
    `, [degree]);

    const userId = req.session.user.user_id;

    const [requests] = await db.query(
      'SELECT listing_id FROM join_requests WHERE user_id = ?',
      [userId]
    );

    const requestedListingIds = requests.map(r => r.listing_id);

    // ADD PARTICIPANTS TO EACH LISTING
    for (let listing of rows) {
      const [participants] = await db.query(`
          SELECT 
            u.user_id,
            u.first_name,
            u.email,
            u.degree,
            up.hide_email,
            up.hide_degree,
            up.hide_modules,
            up.hide_picture
          FROM join_requests jr
          JOIN users u ON jr.user_id = u.user_id
          LEFT JOIN user_privacy up ON u.user_id = up.user_id
          WHERE jr.listing_id = ?
          AND jr.status = 'accepted'
        `, [listing.listing_id]);

      listing.participants = participants;
      console.log(listing.participants);      

    }

    res.render("tags", {
      title: "StudyBuddy",
      selectedDegree: degree,
      listings: rows,
      requestedListingIds,
      degrees: []
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading listings");
  }
});

module.exports = router;