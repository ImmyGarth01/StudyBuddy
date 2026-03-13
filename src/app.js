// app.js (StudyBuddy)
const express = require("express");
const path = require("path");
const app = express();

// Lets the app read data coming from forms (POST)
app.use(express.urlencoded({ extended: true }));

// Tells Express where the pug files are
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

// Serves static files (css, images, etc)
app.use(express.static(path.join(__dirname, "public")));

// Database helper
const db = require("./services/db");

// --------------------
// BASIC ROUTES
// --------------------

// Home page 
app.get("/", (req, res) => {
  res.render("home", { title: "Home" });
});

// Login page (so navbar link doesn't break)
app.get("/login", (req, res) => {
  res.render("login", { title: "Login" });
});

// =====================================================
// USER FEATURES (Sprint 3)
// =====================================================

// 1) USERS LIST (optional degree filter)
// /users?degree=Computer%20Science
app.get("/users", async (req, res) => {
  try {
    const degree = (req.query.degree || "").trim();

    // Get ALL degrees for the "Courses" list 
    const degreeRows = await db.query(
      "SELECT DISTINCT degree FROM users ORDER BY degree ASC"
    );
    const degrees = degreeRows.map((r) => r.degree);

    // Get the users (filtered or not)
    let sql = "SELECT user_id, first_name, last_name, degree FROM users";
    const params = [];

    if (degree) {
      sql += " WHERE degree LIKE ?";
      params.push(`%${degree}%`);
    }

    sql += " ORDER BY user_id ASC";
    const users = await db.query(sql, params);

    res.render("users", { title: "Users", users, degrees, degree });
  } catch (err) {
    console.error("Users list error:", err);
    res.status(500).send("Something went wrong loading users.");
  }
});

// 2) NEW USER FORM PAGE
// IMPORTANT: this must be above /users/:id
app.get("/users/new", (req, res) => {
  res.render("new-user", { title: "Create User" });
});

// 3) CREATE USER (form submit)
app.post("/users", async (req, res) => {
  try {
    const firstName = (req.body.firstName || "").trim();
    const lastName = (req.body.lastName || "").trim();
    const degree = (req.body.degree || "").trim();

    if (!firstName || !lastName || !degree) {
      return res
        .status(400)
        .send("Please fill in First Name, Last Name, and Degree.");
    }

    // Keeping this simple for now
    const password = "Bfsnode112";
    const sessionIds = "";

    const insertSql = `
      INSERT INTO users (first_name, last_name, password, degree, session_ids)
      VALUES (?, ?, ?, ?, ?)
    `;

    const result = await db.query(insertSql, [
      firstName,
      lastName,
      password,
      degree,
      sessionIds,
    ]);

    res.redirect(`/users/${result.insertId}`);
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).send("Something went wrong creating that user.");
  }
});

// 4) USER PROFILE PAGE
app.get("/users/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).send("Invalid user id.");
    }

    const rows = await db.query(
      "SELECT user_id, first_name, last_name, degree FROM users WHERE user_id = ?",
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).send("User not found");
    }

    res.render("user-profile", {
      title: `${rows[0].first_name} ${rows[0].last_name}`,
      user: rows[0],
    });
  } catch (err) {
    console.error("User profile error:", err);
    res.status(500).send("Something went wrong loading that user.");
  }
});
//  register routing page
app.get("/register", (req, res) => {
  res.render("register");
});
// streaks routing page
app.get("/streaks", (req, res) => {
  res.render("streaks");
});

// listings routing page
app.get("/listings", async (req, res) => {
  try {
    const sql = `
      SELECT listing_id, title, module, location, start_time, status
      FROM listings
      ORDER BY start_time ASC
    `;

    const [rows] = await db.query(sql);

    res.render("listings", {
      title: "Listings",
      listings: rows
    });
  } catch (err) {
    console.error("Listings page error:", err);
    res.status(500).send("Something went wrong loading listings");
  }
});

// =====================================================
// DB TEST
// =====================================================
app.get("/db_test", async (req, res) => {
  try {
    const users = await db.query("SELECT * FROM users");
    res.json(users);
  } catch (err) {
    console.error("DB test error:", err);
    res.status(500).send("Database error");
  }
});

// Start server
app.listen(3000, () => {
  console.log("Server running at http://127.0.0.1:3000/");
  console.log("Try: http://127.0.0.1:3000/users");
});