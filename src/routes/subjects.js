const express = require("express");
const router = express.Router();
const db = require("../services/db");

//getting list of all Degrees  from module table to display on screen
router.get("/", async (req, res) => {
  try {
    const [degrees] = await db.query(
  "SELECT DISTINCT degree FROM modules ORDER BY degree ASC"
);
    //renders tags.pug to display data on browser
    res.render("tags", { 
      //data being sent to the pug file:
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

router.get("/:degree/create", async (req, res) => {
  try {
    const degree = decodeURIComponent(req.params.degree);

    // get modules for this degree so user can choose from a dropdown
    const [modules] = await db.query(`
      SELECT module_name
      FROM modules
      WHERE degree = ?
      ORDER BY module_name ASC
    `, [degree]);

    const now = new Date();
    const minDateTime = now.toISOString().slice(0, 16);

    res.render("create-listing", {
      title: "Create Listing",
      selectedDegree: degree,
      modules,
      minDateTime
    });

  } catch (err) {
    console.error("Error loading create listing page:", err);
    res.status(500).send("Error loading create listing page");
  }
});

router.post("/:degree/create", async (req, res) => {
  try {
    const degree = decodeURIComponent(req.params.degree);
    const userId = req.session.user.user_id;

    const {
      title,
      module,
      location,
      start_time,
      end_time,
      sessionType
    } = req.body;

    const start = new Date(start_time);
    const end = new Date(end_time);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).send("Invalid date or time");
    }

    if (start < now) {
      return res.status(400).send("Start time cannot be in the past");
    }

    if (end <= start) {
      return res.status(400).send("End time must be after the start time");
    }

        // check module belongs to this degree
        const [moduleCheck] = await db.query(`
          SELECT module_name
          FROM modules
          WHERE module_name = ? AND degree = ?
        `, [module, degree]);

        if (moduleCheck.length === 0) {
          return res.status(400).send("Invalid module for this degree");
        }

    // insert into listings table
    const [result] = await db.query(`
      INSERT INTO listings (user_id, title, module, location, start_time, end_time, status)
      VALUES (?, ?, ?, ?, ?, ?, 'Open')
    `, [userId, title, module, location, start_time, end_time]);

    const listingId = result.insertId;

    // add session type tag if chosen
    if (sessionType) {
      const [tagRows] = await db.query(`
        SELECT tag_id
        FROM tags
        WHERE sessionType = ?
        LIMIT 1
      `, [sessionType]);

      if (tagRows.length > 0) {
        await db.query(`
          INSERT INTO listing_tags (listing_id, tag_id)
          VALUES (?, ?)
        `, [listingId, tagRows[0].tag_id]);
      }
    }

    res.redirect(`/subjects/${encodeURIComponent(degree)}`);

  } catch (err) {
    console.error("Error creating listing:", err);
    res.status(500).send("Error creating listing");
  }
});


// 
router.get("/:degree", async (req, res) => {
  try {
    const degree = decodeURIComponent(req.params.degree);

    const [rows] = await db.query(`
      SELECT 
        listings.listing_id,
        listings.user_id,
        listings.title,
        listings.location,
        listings.start_time,
        listings.end_time,
        listings.status,
        modules.module_name,
        modules.level,
        MAX(tags.sessionType) AS sessionType 
      FROM listings
      JOIN modules ON listings.module = modules.module_name
      LEFT JOIN listing_tags ON listings.listing_id = listing_tags.listing_id
      LEFT JOIN tags ON listing_tags.tag_id = tags.tag_id
      WHERE modules.degree = ?
      GROUP BY 
        listings.listing_id,
        listings.user_id,
        listings.title,
        listings.location,
        listings.start_time,
        listings.end_time,
        listings.status,
        modules.module_name,
        modules.level
      ORDER BY listings.start_time ASC
    `, [degree]);

    const userId = req.session.user.user_id;

    const [requests] = await db.query(
      'SELECT listing_id FROM join_requests WHERE user_id = ?',
      [userId]
    );

    const requestedListingIds = requests.map(r => r.listing_id);

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
    }

    res.render("tags", {
      title: "StudyBuddy",
      selectedDegree: degree,
      listings: rows,
      requestedListingIds,
      degrees: [],
      modules: []
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading listings");
  }
});

module.exports = router;