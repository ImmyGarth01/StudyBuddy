const express = require("express"); //Runs express (handles router) 
const router = express.Router();
const db = require("../services/db"); // Calls on db 
const bcrypt = require("bcrypt"); // This is used for hashed passwords
const crypto = require("crypto"); // This is used for random tokens for paswword reset


function requireLogin(req, res, next) { // middleware function
  if (!req.session.user) { // Checks if the user is not logged in 
    return res.redirect("/login"); // If not logged in it sends to the login page
  }
  next(); // If logged in it continues to the next function 
}

module.exports.requireLogin = requireLogin; // exports middleware so it can be used elsewhere

// Make user available in all views 
router.use((req, res, next) => { // runs on every request in the server
  res.locals.user = req.session.user; // makes sure the user is available in template
  next(); // continues to the next route
});


// LOGIN PAGE

router.get("/login", (req, res) => { // Handles GET requests to Login (GET = HTTP Request to retrieve data to server)
  res.render("login"); // renders the login view
});


// LOGIN HANDLER

router.post("/login", async (req, res) => { // handles submissions from login page
  const { email, password } = req.body; // extracts the email and password

  try { // this is the error handling block 
    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ?", // looks up email in DB
      [email] // Result from the DB
    );

    if (rows.length === 0) {
      return res.send("User not found"); // If no user is found show this error message
    }

    const user = rows[0]; // Get the first and only matching user
    
    const isMatch = await bcrypt.compare(password, user.password); // Compare input password to hashed password
    
    if (!isMatch) {
        return res.send("Incorrect password"); // If the passwords dont match stop 
    }

    req.session.user = user; // Store user in session (i.e log them in)
    res.redirect("/"); // direct to homepage 

  } catch (err) { // If something doesn't work log the error in the console
    console.error(err);
    res.status(500).send("Login error"); // send the error response
  }
});


// REGISTER PAGE

router.get("/register", (req, res) => { // Get the register page
  res.render("register", { title: "Register" }); // render the page
});


// REGISTER HANDLER

router.post("/register", async (req, res) => { // handles the register submissions
  try {
    const { first_name, last_name, degree, email, password } = req.body; // obtain written data

    const emailRegex = /^[a-zA-Z0-9._%+-]+@roehampton\.ac\.uk$/; // validate it's a uni email

    if (!emailRegex.test(email)) { // If the email is invalid 
      return res.render("register", { // Render an error messsage
        title: "Register",
        error: "You must use a Roehampton email (@roehampton.ac.uk)",
        formData: req.body
      });
    }

    const [existing] = await db.query(
      "SELECT * FROM users WHERE email = ?", // Checks if the email exists
      [email]
    );

    if (existing.length > 0) { // If it exists
      return res.render("register", {
        title: "Register",
        error: "This email is already registered" // error message 
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10); // Hash password before saving, 10 is standard
    
    await db.query( // Inserts new user into DB
        "INSERT INTO users (first_name, last_name, degree, email, password) VALUES (?, ?, ?, ?, ?)",
        [first_name, last_name, degree, email, hashedPassword]
    );

    res.redirect("/login"); // Redirected after successful register

  } catch (err) { // error message with register
    console.error(err);
    res.status(500).send("Register error");
  }
});


// Forgot Password Page 

router.get("/forgot-password", (req, res) => { // show forgot password page
  res.render("forgot-password"); // render the page 
});


//F.P Email Submission
router.post("/forgot-password", async (req, res) => { // Handles email handling
  try {
    const { email } = req.body;

    const [users] = await db.query(
      "SELECT user_id FROM users WHERE email = ?", // Finds user via email
      [email]
    );

    if (users.length === 0) { // If no user, show error message
      return res.send("No account with that email.");
    }

    const userId = users[0].user_id; 

    // create secure token
    const token = crypto.randomBytes(32).toString("hex"); // generate a secure token (reset key)
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex"); // creates a hashed token 

    const expires = new Date(Date.now() + 1000 * 60 * 30); // 30 mins - this is how long the token lasts

    await db.query(
      "INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)", // inserts token in DB
      [userId, hashedToken, expires]
    );

    const resetLink = `http://localhost:3000/reset-password?token=${token}`;

    console.log("RESET LINK:", resetLink);

    // FOR NOW: show link instead of email
    res.send(`<a href="${resetLink}">Reset Password</a>`);

  } catch (err) {
    console.error(err);
    res.status(500).send("Forgot password error");
  }
});


// Reset Password Page
router.get("/reset-password", async (req, res) => {
  try {
    const { token } = req.query; // obtains teh token from the URL

    if (!token) {
      return res.send("No token provided");
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const [rows] = await db.query( // checks to see if token is valid 
      "SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW()",
      [hashedToken]
    );

    if (rows.length === 0) {
      return res.send("Invalid or expired token");
    }

    res.render("reset-password", { token }); // if valid show reset form

  } catch (err) {
    console.error(err);
    res.status(500).send("Reset page error");
  }
});


//Save New Password:

router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token) {
      return res.send("Missing token");
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const [rows] = await db.query( // validates the token again
      "SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW()",
      [hashedToken]
    );

    if (rows.length === 0) {
      return res.send("Invalid or expired token");// error handling 
    }

    const userId = rows[0].user_id; // gets user ID

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query( // updates the DB
      "UPDATE users SET password = ? WHERE user_id = ?",
      [hashedPassword, userId]
    );
    
    await db.query( // deletes the token once used
    "DELETE FROM password_resets WHERE token = ?",
    [hashedToken]
  );
  
  res.send(`
    <p>Password reset successful! Redirecting to login...</p>
    <script>
    setTimeout(() => {
      window.location.href = "/login";
    }, 2000);
  </script>
`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Reset password error");
  }
});


// LOGOUT

router.get("/logout", (req, res) => { // Opens the logout page
  req.session.destroy(() => { // destroys the session
    res.redirect("/login");// sends to login page
  });
});

module.exports = router; // exports the rotuer app so it can be used
module.exports.requireLogin = requireLogin; // exports the middleware