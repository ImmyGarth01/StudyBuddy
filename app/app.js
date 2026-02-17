const express = require("express");
const path = require("path");
const app = express();

// Serve static files from the static folder in the project root
app.use(express.static(path.join(__dirname, "../static")));

// Get the functions in the db.js file to use
const db = require('./services/db');

// Step 1: Root route
app.get("/", function(req, res) {
    res.send("Hello Immy!");
});

// Step 4: /roehampton
app.get("/roehampton", function(req, res) {
    console.log("Accessed path:", req.url);
    let path = req.url;
    res.send(path.substring(0, 3));
});

// Step 5: Dynamic route /hello/:name
app.get("/hello/:name", function(req, res) {
    console.log("Route params:", req.params);
    const name = req.params.name;
    res.send("Hello " + name);
});

// Step 6: Dynamic route /user/:id
app.get("/user/:id", function(req, res) {
    const userId = req.params.id;
    res.send("User ID: " + userId);
});

// Step 7: Dynamic route /student/:name/:id
app.get("/student/:name/:id", function(req, res) {
    const name = req.params.name;
    const id = req.params.id;
    res.send(`
        <table border="1">
            <tr><th>Name</th><th>ID</th></tr>
            <tr><td>${name}</td><td>${id}</td></tr>
        </table>
    `);
});

// Step 9: Database test
app.get("/db_test", function(req, res) {
    const sql = 'SELECT * FROM test_table';
    db.query(sql)
      .then(results => {
          console.log(results);
          res.send(results);
      })
      .catch(err => {
          console.error("DB error:", err);
          res.status(500).send("Database error");
      });
});

// /goodbye route
app.get("/goodbye", function(req, res) {
    res.send("Goodbye world!");
});

// Start server
app.listen(3000, function(){
    console.log(`Server running at http://127.0.0.1:3000/`);
});
