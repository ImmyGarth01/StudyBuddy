// app.js (StudyBuddy)

const express = require("express");
const path = require("path");
const app = express();

// Parse form data
app.use(express.urlencoded({ extended: true }));

// View engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Database
const db = require("./services/db");


// =========================
// HOME
// =========================
app.get("/", (req, res) => {
  res.render("home", { title: "Home" });
});


// =========================
// LOGIN
// =========================

app.post("/login", (req, res) => {
  res.send("Login functionality not fully implemented yet.");
});

app.get("/login", (req, res) => {
  res.render("login", { title: "Login" });
});


// =========================
// USERS LIST
// =========================
app.get("/users", async (req, res) => {
  try {
    const selectedDegree = req.query.degree;

    const [degrees] = await db.query(
      "SELECT DISTINCT degree FROM users ORDER BY degree ASC"
    );

    let users;

    if (selectedDegree) {
      [users] = await db.query(
        "SELECT user_id, first_name, last_name, degree FROM users WHERE degree = ? ORDER BY first_name ASC",
        [selectedDegree]
      );
    } else {
      [users] = await db.query(
        "SELECT user_id, first_name, last_name, degree FROM users ORDER BY first_name ASC"
      );
    }

    res.render("users", {
      title: "Users",
      degrees,
      users,
      selectedDegree
    });

  } catch (err) {
    console.error("Users list error:", err);
    res.status(500).send("Error loading users.");
  }
});


// =========================
// USER PROFILE
// =========================
app.get("/users/:id", async (req, res) => {
  try {

    const userId = req.params.id;

    const [rows] = await db.query(
      "SELECT user_id, first_name, last_name, degree FROM users WHERE user_id = ?",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).send("User not found.");
    }

    res.render("user-profile", {
      title: `${rows[0].first_name} ${rows[0].last_name}`,
      user: rows[0]
    });

  } catch (err) {
    console.error("User profile error:", err);
    res.status(500).send("Error loading user.");
  }
});


// =========================
// REGISTER PAGE
// =========================
app.get("/register", (req, res) => {
  res.render("register", { title: "Register" });
});


// =========================
// REGISTER SUBMIT
// =========================
app.post("/register", async (req, res) => {

  try {

    const { first_name, last_name, degree } = req.body;

    await db.query(
      "INSERT INTO users (first_name, last_name, degree) VALUES (?, ?, ?)",
      [first_name, last_name, degree]
    );

    res.redirect("/users");

  } catch (err) {
    console.error("Register error:", err);
    res.status(500).send("Error registering user.");
  }
});

// =========================
// LISTING PAGE (routing entry)
// =========================
  const listingsRouter = require('./routes/listings');
  app.use('/listings', listingsRouter);


// =========================
// LISTING DETAILS PAGE
// =========================
app.get("/listings/:id", async (req, res) => {
  try {

    const listingId = req.params.id;

    const [rows] = await db.query(
      `SELECT listing_id, title, module, location, start_time, status
       FROM listings
       WHERE listing_id = ?`,
      [listingId]
    );

    if (rows.length === 0) {
      return res.status(404).send("Listing not found");
    }

    res.render("listing-details", {
      title: rows[0].title,
      listing: rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Listing details error");
  }
});


// =========================
// TAGS PAGE
// =========================
app.get("/tags", async (req, res) => {

  try {

    const [tags] = await db.query(
      "SELECT DISTINCT degree FROM users ORDER BY degree ASC"
    );

    res.render("tags", {
      title: "Tags",
      tags
    });

  } catch (err) {
    console.error("Tags error:", err);
    res.status(500).send("Error loading tags.");
  }

});


// =========================
// STREAKS
// =========================
app.get("/streaks", (req, res) => {
  res.render("streaks", { title: "Streaks" });
});


// =========================
// DB TEST
// =========================
app.get("/db_test", async (req, res) => {

  try {
    const users = await db.query("SELECT * FROM users");
    res.json(users);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).send("Database error");
  }

});


// =========================
// START SERVER
// =========================
app.listen(3000, () => {
  console.log("Server running at http://127.0.0.1:3000/");
});