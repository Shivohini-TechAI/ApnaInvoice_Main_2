const fs = require("fs");
const path = require("path");
require("dotenv").config();

const pool = require("./db");

async function runSchema() {
  try {
    const schemaPath = path.join(__dirname, "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");

    await pool.query(schema);

    console.log("Database schema created successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error creating database schema:", error.message);
    process.exit(1);
  }
}

runSchema();