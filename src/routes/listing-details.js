app.get("/listings/:id", async (req, res) => {
  try {

    const listingId = req.params.id;

    const [rows] = await db.query(
      `SELECT listing_id, user_id, title, module, location, start_time, status
       FROM listings
       WHERE listing_id = ?`,
      [listingId]
    );

    if (rows.length === 0) {
      return res.status(404).send("Listing not found");
    }

    const listing = rows[0];

    const isOwner = listing.user_id === req.session.user.user_id;

    res.render("listing-details", {
      title: listing.title,
      listing,
      isOwner
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Listing details error");
  }
});

app.post("/listings/:id/edit", async (req, res) => {
  try {
    const listingId = req.params.id;
    const userId = req.session.user.user_id;

    const { title, location, start_time } = req.body;

    // Make sure only the owner can edit
    const [rows] = await db.query(
      "SELECT user_id FROM listings WHERE listing_id = ?",
      [listingId]
    );

    if (rows.length === 0) {
      return res.status(404).send("Listing not found");
    }

    if (rows[0].user_id !== userId) {
      return res.status(403).send("Not allowed to edit this listing");
    }

    // Update listing
    await db.query(
      `UPDATE listings
       SET title = ?, location = ?, start_time = ?
       WHERE listing_id = ?`,
      [title, location, start_time, listingId]
    );

    res.redirect(`/listings/${listingId}`);

  } catch (err) {
    console.error("Edit listing error:", err);
    res.status(500).send("Error updating listing");
  }
});