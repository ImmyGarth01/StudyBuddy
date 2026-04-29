const mysql = require("mysql2/promise");


let db;


if (process.env.CI) {
  console.log("CI detected — using mock database");
  db = {
    query: async () => {
      return [];
    }
  };
} else {
  db = mysql.createPool({
    host: "db",
    user: "root",
    password: "password",
    database: "studybuddy"
  });
}


module.exports = db;