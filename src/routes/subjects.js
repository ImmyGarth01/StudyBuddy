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
  SELECT 
    listings.listing_id,
    listings.title,
    listings.location,
    listings.start_time,
    listings.status,
    modules.module_name,
    modules.level,
    tags.sessionType
  FROM listings
  JOIN modules ON listings.module = modules.module_name
  LEFT JOIN listing_tags ON listings.listing_id = listing_tags.listing_id
  LEFT JOIN tags ON listing_tags.tag_id = tags.tag_id
  WHERE modules.degree = ?
  ORDER BY listings.start_time ASC
`, [degree]);

    const userId = req.session.user.user_id;;

    const [requests] = await db.query(
      'SELECT listing_id FROM join_requests WHERE user_id = ?',
      [userId]
    );

    const requestedListingIds = requests.map(r => r.listing_id);

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