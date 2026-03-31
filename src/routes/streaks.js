// =========================
// STREAKS
// =========================
app.get("/streaks", requireLogin, async (req, res) => {
    try {
        const userId = req.session.user.user_id;

        // 1. Get all listings the user participates in (hosted or accepted join request)
        const [participatedListings] = await db.query(
            `SELECT DISTINCT 
                l.listing_id, l.title, l.module, l.location, l.start_time, l.status
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
            streak: streak
        });

    } catch (err) {
        console.error("Streaks error:", err);
        res.status(500).send("Error loading streaks page.");
    }
});