const bcrypt = require("bcryptjs");
require("dotenv").config();

const pool = require("./db");

async function resetPassword() {
  try {
    const email = "2025.kshitijad@isu.ac.in";
    const plainPassword = "123456";

    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const result = await pool.query(
      `UPDATE user_profiles
       SET password = $1
       WHERE email = $2
       RETURNING id, email, role`,
      [hashedPassword, email]
    );

    if (result.rows.length === 0) {
      console.log("User not found");
    } else {
      console.log("Password reset successfully for:", result.rows[0]);
      console.log("Now login with password:", plainPassword);
    }

    process.exit(0);
  } catch (error) {
    console.error("Password reset failed:", error.message);
    process.exit(1);
  }
}

resetPassword();