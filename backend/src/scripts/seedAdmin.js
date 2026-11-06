const dotenv = require("dotenv");
dotenv.config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { ROLES } = require("../utils/constants");

// Run from backend/:  npm run seed:admin
// Override:           npm run seed:admin -- --email "..." --password "..."
// Admin credentials live here, not in .env.
const DEFAULT_ADMIN_EMAIL = "admin@localprinter.com";
const DEFAULT_ADMIN_PASSWORD = "@TheLocalPrinter@Anil123";
const DEFAULT_ADMIN_NAME = "Admin";

const getArgValue = (flag) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
};

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const email = (getArgValue("--email") || DEFAULT_ADMIN_EMAIL).toLowerCase();
    const name = DEFAULT_ADMIN_NAME;
    const password = getArgValue("--password") || DEFAULT_ADMIN_PASSWORD;

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);

    const existing = await User.findOne({ email });

    if (existing) {
      await User.updateOne(
        { _id: existing._id },
        { $set: { passwordHash: hash, role: ROLES.ADMIN, isActive: true } }
      );
      console.log(`Admin password reset for: ${email}`);
    } else {
      await User.create({
        fullName: name,
        email,
        passwordHash: hash,
        role: ROLES.ADMIN,
        isActive: true,
      });
      console.log(`Admin created: ${email}`);
    }

    console.log(`Email: ${email} (password set from script / --password arg)`);
    await mongoose.disconnect();
  } catch (error) {
    console.error("Admin seed error:", error.message);
    process.exit(1);
  }
};

seedAdmin();
