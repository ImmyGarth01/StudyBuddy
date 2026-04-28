// app.js (StudyBuddy)

const express = require("express");
const path = require("path");
const app = express();
const session = require("express-session");
const notificationsRouter = require("./routes/notifications");
const messagesRouter = require("./routes/messages");

// import the new profile routes
const userProfileRoutes = require("./routes/userprofiles");

// Parse form data
app.use(express.urlencoded({ extended: true }));

// Sessions
app.use(session({
  secret: "studybuddy-secret",
  resave: false,
  saveUninitialized: false,
  rolling: true, // refresh expiry on activity
  cookie: { maxAge: 600000 } // 10 minutes
}));

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

// make DB available to all routes (needed for Edit Modules)
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Middleware (REQUIRES LOGIN)
const auth = require("./routes/authentication");
const requireLogin = auth.requireLogin;

const authRouter = require("./routes/authentication");
app.use("/", authRouter);

// Make user available in views
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

// Message and notification registering 
app.use("/notifications", notificationsRouter);
app.use("/messages", requireLogin, messagesRouter); // ✅ added requireLogin

// ADDED — mount the profile routes
app.use("/profile", requireLogin, userProfileRoutes);

// =========================
// Login In Page - Opening Page
// =========================
app.get("/", requireLogin, async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  const userId = req.session.user.user_id;
  const userDegree = req.session.user.degree || null;
  const formatDate = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  });

  try {
    const [
      [upcomingCountRows],
      [hostingCountRows],
      [messageCountRows],
      [notificationCountRows],
      [requestCountRows],
      [peerCountRows],
      [upcomingSessionRows],
      [pendingRequestRows]
    ] = await Promise.all([
      db.query(
        `SELECT COUNT(DISTINCT l.listing_id) AS count
         FROM listings l
         LEFT JOIN join_requests jr
           ON jr.listing_id = l.listing_id
          AND jr.user_id = ?
          AND jr.status = 'accepted'
         WHERE (l.user_id = ? OR jr.user_id = ?)
           AND l.start_time >= NOW()`,
        [userId, userId, userId]
      ),
      db.query(
        `SELECT COUNT(*) AS count
         FROM listings
         WHERE user_id = ?
           AND start_time >= NOW()`,
        [userId]
      ),
      db.query(
        `SELECT COUNT(*) AS count
         FROM messages
         WHERE receiver_id = ?
           AND is_read = FALSE`,
        [userId]
      ),
      db.query(
        `SELECT COUNT(*) AS count
         FROM notifications
         WHERE user_id = ?
           AND is_read = FALSE`,
        [userId]
      ),
      db.query(
        `SELECT COUNT(*) AS count
         FROM message_requests
         WHERE receiver_id = ?
           AND status = 'pending'`,
        [userId]
      ),
      userDegree
        ? db.query(
            `SELECT COUNT(*) AS count
             FROM users
             WHERE degree = ?
               AND user_id != ?`,
            [userDegree, userId]
          )
        : Promise.resolve([[{ count: 0 }]]),
      db.query(
        `SELECT DISTINCT
            l.listing_id,
            l.title,
            l.module,
            l.location,
            l.start_time,
            CASE
              WHEN l.user_id = ? THEN 'Hosting'
              ELSE 'Joined'
            END AS role
         FROM listings l
         LEFT JOIN join_requests jr
           ON jr.listing_id = l.listing_id
          AND jr.user_id = ?
          AND jr.status = 'accepted'
         WHERE (l.user_id = ? OR jr.user_id = ?)
           AND l.start_time >= NOW()
         ORDER BY l.start_time ASC
         LIMIT 4`,
        [userId, userId, userId, userId]
      ),
      db.query(
        `SELECT
            mr.sender_id AS user_id,
            mr.created_at,
            u.first_name,
            u.last_name,
            u.degree
         FROM message_requests mr
         JOIN users u ON u.user_id = mr.sender_id
         WHERE mr.receiver_id = ?
           AND mr.status = 'pending'
         ORDER BY mr.created_at DESC
         LIMIT 3`,
        [userId]
      )
    ]);

    const dashboard = {
      upcomingSessions: upcomingCountRows[0].count,
      hostingSessions: hostingCountRows[0].count,
      unreadMessages: messageCountRows[0].count,
      unreadNotifications: notificationCountRows[0].count,
      pendingRequests: requestCountRows[0].count,
      sameDegreePeers: peerCountRows[0].count
    };

    const upcomingSessions = upcomingSessionRows.map((session) => ({
      ...session,
      displayTime: formatDate.format(new Date(session.start_time))
    }));

    const pendingRequests = pendingRequestRows.map((request) => ({
      ...request,
      displayDate: formatDate.format(new Date(request.created_at))
    }));

    res.render("home", {
      title: "Home",
      dashboard,
      upcomingSessions,
      pendingRequests
    });
  } catch (err) {
    console.error("Home page error:", err);
    res.status(500).render("home", {
      title: "Home",
      dashboard: {
        upcomingSessions: 0,
        hostingSessions: 0,
        unreadMessages: 0,
        unreadNotifications: 0,
        pendingRequests: 0,
        sameDegreePeers: 0
      },
      upcomingSessions: [],
      pendingRequests: [],
      loadError: true
    });
  }
});

// =========================
// USERS LIST (with request status and exclusion)
// =========================
app.get("/users", requireLogin, async (req, res) => {
  try {
    const currentUserId = req.session.user.user_id;
    const selectedDegree = req.query.degree;

    const [degrees] = await db.query(
      "SELECT DISTINCT degree FROM users ORDER BY degree ASC"
    );

    let usersQuery = `
      SELECT u.user_id, u.first_name, u.last_name, u.degree,
             mr.status AS request_status
      FROM users u
      LEFT JOIN message_requests mr ON 
          (mr.sender_id = ? AND mr.receiver_id = u.user_id) 
          OR (mr.receiver_id = ? AND mr.sender_id = u.user_id)
      WHERE u.user_id != ?
    `;
    const params = [currentUserId, currentUserId, currentUserId];

    if (selectedDegree) {
      usersQuery += " AND u.degree = ?";
      params.push(selectedDegree);
    }

    usersQuery += " ORDER BY u.first_name ASC";

    const [users] = await db.query(usersQuery, params);

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
// USER PROFILE (with request status)
// =========================
app.get("/users/:id", requireLogin, async (req, res) => {
  try {
    const currentUserId = req.session.user.user_id;
    const userId = req.params.id;

    const [rows] = await db.query(
      "SELECT user_id, first_name, last_name, degree FROM users WHERE user_id = ?",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).send("User not found.");
    }

    const profileUser = rows[0];

    // Get request status between current user and this user
    const [statusRows] = await db.query(`
      SELECT status FROM message_requests
      WHERE (sender_id = ? AND receiver_id = ?)
         OR (sender_id = ? AND receiver_id = ?)
    `, [currentUserId, userId, userId, currentUserId]);

    const requestStatus = statusRows.length ? statusRows[0].status : null;

    res.render("user-profile", {
      title: `${profileUser.first_name} ${profileUser.last_name}`,
      user: profileUser,
      requestStatus
    });
  } catch (err) {
    console.error("User profile error:", err);
    res.status(500).send("Error loading user.");
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

        const listingsWithParticipants = [];
        for (const listing of participatedListings) {
            const [hostRows] = await db.query(
                `SELECT u.user_id, u.first_name, u.last_name, u.degree
                 FROM users u
                 WHERE u.user_id = (SELECT user_id FROM listings WHERE listing_id = ?)`,
                [listing.listing_id]
            );
            const host = hostRows[0] || null;

            const [participants] = await db.query(
                `SELECT u.user_id, u.first_name, u.last_name, u.degree
                 FROM users u
                 INNER JOIN join_requests j ON u.user_id = j.user_id
                 WHERE j.listing_id = ? AND j.status = 'accepted'
                 AND u.user_id != ?`,
                [listing.listing_id, host?.user_id || 0]
            );

            const allParticipants = [host, ...participants].filter(p => p !== null);
            const uniqueParticipants = allParticipants.filter((p, idx, self) =>
                idx === self.findIndex(p2 => p2.user_id === p.user_id)
            );

            listingsWithParticipants.push({
                ...listing,
                participants: uniqueParticipants
            });
        }

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

        res.render("streaks", {
            title: "My Streaks",
            listings: listingsWithParticipants,
            streak: streak
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
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running at http://127.0.0.1:${PORT}/`);
});
