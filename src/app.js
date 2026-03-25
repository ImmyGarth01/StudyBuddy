// app.js (StudyBuddy)

const express = require("express");
const path = require("path");
const app = express();
const session = require("express-session");
const notificationsRouter = require("./routes/notifications");
const messagesRouter = require("./routes/messages");

// Parse form data
app.use(express.urlencoded({ extended: true }));

// Sessions
app.use(session({
  secret: "studybuddy-secret",
  resave: false,
  saveUninitialized: false
}));

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
}

app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
}); 

// Messge and notification registering 
app.use("/notifications", notificationsRouter);
app.use("/messages", messagesRouter);
// View engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Database
const mysql = require("mysql2/promise");

const db = mysql.createPool({
  host: "db",
  user: "root",     
  password: "password",  
  database: "studybuddy"
});
// =====================
// Login In Page - Opening Page
// =========================
app.get("/", requireLogin, (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  res.render("home", { title: "Home" });
});

// =========================
// LOGIN
// =========================

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  console.log("LOGIN ATTEMPT:", email, password); // 👈 add this

  try {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    console.log("DB RESULT:", rows); // 👈 add this

    if (rows.length === 0) {
      console.log("❌ User not found");
      return res.send("User not found");
    }

    const user = rows[0];

    console.log("FOUND USER:", user); // 👈 add this

    if (user.password !== password) {
      console.log("❌ Password mismatch");
      return res.send("Incorrect password");
    }

    console.log("✅ LOGIN SUCCESS");

    req.session.user = user;
    res.redirect("/");

  } catch (err) {
    console.error(err);
    res.status(500).send("Login error");
  }
});
app.get("/login", (req, res) => {
  res.render("login"); // make sure login.pug exists
});

//Log out page 
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// =========================
// USERS LIST
// =========================
app.get("/users", requireLogin, async (req, res) => {
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
app.get("/users/:id", requireLogin, async (req, res) => {
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
    const { first_name, last_name, degree, email } = req.body;

    await db.query(
      "INSERT INTO users (first_name, last_name, degree, email) VALUES (?, ?, ?, ?)",
      [first_name, last_name, degree, email]
    );

    res.redirect("/login");

  } catch (err) {
    console.error(err);
    res.status(500).send("Register error");
  }
});

// =========================
// LISTING PAGE (routing entry)
// =========================
  const listingsRouter = require('./routes/listings');
  app.use('/listings', requireLogin, listingsRouter);


// =========================
// LISTING DETAILS PAGE
// =========================
app.get("/listings/:id", requireLogin, async (req, res) => {
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
// SUBJECTS PAGE
// =========================

app.use("/subjects", require("./routes/subjects"));


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

        // 2. (Optional) For each listing, fetch participants (host + accepted join requests)
        //    This enriches the data with a `participants` array.
        const listingsWithParticipants = [];
        for (const listing of participatedListings) {
            // Get the host (the user who created the listing)
            const [hostRows] = await db.query(
                `SELECT u.user_id, u.first_name, u.last_name, u.degree
                 FROM users u
                 WHERE u.user_id = (SELECT user_id FROM listings WHERE listing_id = ?)`,
                [listing.listing_id]
            );
            const host = hostRows[0] || null;

            // Get other participants with accepted join requests
            const [participants] = await db.query(
                `SELECT u.user_id, u.first_name, u.last_name, u.degree
                 FROM users u
                 INNER JOIN join_requests j ON u.user_id = j.user_id
                 WHERE j.listing_id = ? AND j.status = 'accepted'
                 AND u.user_id != ?`,  // exclude host if they also requested (unlikely)
                [listing.listing_id, host?.user_id || 0]
            );

            // Combine host and other participants
            const allParticipants = [host, ...participants].filter(p => p !== null);
            // Remove duplicates (just in case)
            const uniqueParticipants = allParticipants.filter((p, idx, self) =>
                idx === self.findIndex(p2 => p2.user_id === p.user_id)
            );

            listingsWithParticipants.push({
                ...listing,
                participants: uniqueParticipants
            });
        }

        // 3. Calculate streak based on past session dates
        const [pastSessionDates] = await db.query(
            `SELECT DISTINCT DATE(l.start_time) as session_date
            FROM listings l
            LEFT JOIN join_requests j ON l.listing_id = j.listing_id
            WHERE (l.user_id = ? OR (j.user_id = ? AND j.status = 'accepted'))
                AND l.start_time <= NOW()
            ORDER BY session_date DESC`,
            [userId, userId]
        );

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

        // 4. Render the view with the data
        res.render("streaks", {
            title: "My Streaks",
            listings: listingsWithParticipants,  // or just participatedListings if you skip participant fetch
            streak: streak
        });

    } catch (err) {
        console.error("Streaks error:", err);
        res.status(500).send("Error loading streaks page.");
    }
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