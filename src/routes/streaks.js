// =========================
// STREAKS
// =========================
app.get("/streaks", requireLogin, async (req, res) => {
    try {
        const userId = req.session.user.user_id;

        // 1. Get all listings the user participates in (hosted or accepted join request)
        const [participatedListings] = await db.query(
            `SELECT DISTINCT 
                l.listing_id, l.user_id, l.title, l.module, l.location, l.start_time, l.status
            FROM listings l
            LEFT JOIN join_requests j ON l.listing_id = j.listing_id
            WHERE l.user_id = ? 
               OR (j.user_id = ? AND j.status = 'accepted')
            ORDER BY l.start_time DESC`,
            [userId, userId]
        );

        // 2. Get distinct dates of past sessions to calculate streak
        const [pastSessionDates] = await db.query(
            `SELECT DISTINCT DATE(l.start_time) as session_date
            FROM listings l
            LEFT JOIN join_requests j ON l.listing_id = j.listing_id
            WHERE (l.user_id = ? OR (j.user_id = ? AND j.status = 'accepted'))
                AND l.start_time <= NOW()
            ORDER BY session_date DESC`,
            [userId, userId]
        );

        // 3. Calculate streak
        let streak = 0;
        if (pastSessionDates.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let expectedDate = today;

            for (const row of pastSessionDates) {
                const sessionDate = new Date(row.session_date);
                sessionDate.setHours(0, 0, 0, 0);
                if (sessionDate.getTime() === expectedDate.getTime()) {
                    streak++;
                    expectedDate.setDate(expectedDate.getDate() - 1);
                } else {
                    break;
                }
            }
        }

        // 4. Render the view
        res.render("streaks", {
            title: "My Streaks",
            listings: participatedListings,
            streak: streak,
            user: req.session.user
        });

    } catch (err) {
        console.error("Streaks error:", err);
        res.status(500).send("Error loading streaks page.");
    }
});


// Leaving sessions that the user has joined:
app.post("/streaks/leave/:id", requireLogin, async (req, res) => {
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

    // create notification to send to those apart of the session
    await db.query(
      "INSERT INTO notifications (user_id, message, is_read) VALUES (?, ?, 0)",
      [listing.user_id, `${fullName} has left your study session "${listing.title}".`]
    );

    res.redirect("/streaks");
  } catch (err) {
    console.error("Leave session error:", err);
    res.status(500).send("Error leaving session.");
  }
});

// for users who own the study session and want to delete it:
app.post("/streaks/delete/:id", requireLogin, async (req, res) => {
  try {
    const listingId = req.params.id;
    const userId = req.session.user.user_id;
    const fullName = `${req.session.user.first_name} ${req.session.user.last_name}`;

    const [listingRows] = await db.query(
      "SELECT * FROM listings WHERE listing_id = ? AND user_id = ?",
      [listingId, userId]
    );

    // validation:
    if (listingRows.length === 0) {
      return res.status(403).send("You can only delete sessions you created.");
    }

    const listing = listingRows[0];

    const [participants] = await db.query(
      "SELECT user_id FROM join_requests WHERE listing_id = ? AND status = 'accepted'",
      [listingId]
    );

    //sends notification to those in the study session to let them know it has been deleted
    for (const participant of participants) {
      await db.query(
        "INSERT INTO notifications (user_id, message, is_read) VALUES (?, ?, 0)",
        [
          participant.user_id,
          `${fullName} has ended the study session "${listing.title}" and it has been deleted.`
        ]
      );
    }

    await db.query("DELETE FROM listing_tags WHERE listing_id = ?", [listingId]);
    await db.query("DELETE FROM join_requests WHERE listing_id = ?", [listingId]);
    await db.query("DELETE FROM listings WHERE listing_id = ?", [listingId]);

    res.redirect("/streaks");
  } catch (err) {
    console.error("Delete session error:", err);
    res.status(500).send("Error deleting session.");
  }
});
