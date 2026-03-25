const express = require("express");
const router = express.Router();
const db = require("../services/db");
const bcrypt = require("bcrypt");


function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
}

module.exports.requireLogin = requireLogin;

// Make user available in all views 
router.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});


// LOGIN PAGE

router.get("/login", (req, res) => {
  res.render("login");
});


// LOGIN HANDLER

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.send("User not found");
    }

    const user = rows[0];
    
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
        return res.send("Incorrect password");
    }

    req.session.user = user;
    res.redirect("/");

  } catch (err) {
    console.error(err);
    res.status(500).send("Login error");
  }
});


// REGISTER PAGE

router.get("/register", (req, res) => {
  res.render("register", { title: "Register" });
});


// REGISTER HANDLER

router.post("/register", async (req, res) => {
  try {
    const { first_name, last_name, degree, email, password } = req.body;

    const emailRegex = /^[a-zA-Z0-9._%+-]+@roehampton\.ac\.uk$/;

    if (!emailRegex.test(email)) {
      return res.render("register", {
        title: "Register",
        error: "You must use a Roehampton email (@roehampton.ac.uk)",
        formData: req.body
      });
    }

    const [existing] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return res.render("register", {
        title: "Register",
        error: "This email is already registered"
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await db.query(
        "INSERT INTO users (first_name, last_name, degree, email, password) VALUES (?, ?, ?, ?, ?)",
        [first_name, last_name, degree, email, hashedPassword]
    );

    res.redirect("/login");

  } catch (err) {
    console.error(err);
    res.status(500).send("Register error");
  }
});


// LOGOUT

router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

module.exports = router;
module.exports.requireLogin = requireLogin;