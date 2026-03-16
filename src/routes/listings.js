app.get("/listings", async (req, res) => {
  try {

    const [rows] = await db.query(`
      SELECT listing_id, title, module, location, start_time, status
      FROM listings
      ORDER BY start_time ASC
    `);

    res.render("listings", {
      title: "Listings",
      listings: rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Listings error");
  }
});