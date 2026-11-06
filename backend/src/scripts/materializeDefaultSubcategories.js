/**
 * One-time migration: create real Category documents for every subcategory
 * that currently lives only in the frontend hardcoded list.
 *
 * The 9 core categories are hardcoded in `frontend/src/data/categoryDetails.js`
 * and merged into every category list by `frontend/src/data/vendorCategories.js`
 * as `isStatic: true` rows with fake (hashed) IDs. Static subcategories can
 * never be edited/deleted from the DB — the admin UI can only "materialize"
 * them one chip at a time, and that flow fails when the name is taken anywhere
 * (Category.name is globally unique).
 *
 * What this script does:
 *   1. Ensures a DB parent document exists for each of the 9 core categories
 *      (matched by slug, then by case-insensitive name, created when missing).
 *   2. Creates a subcategory doc for every hardcoded item name, skipping:
 *        - docs that already exist by slug or case-insensitive name
 *        - slugs tombstoned in the parent's `hiddenSubs` (admin had deleted
 *          that default earlier — respects that decision)
 *   3. Repairs business links: vendor forms could save the static chips'
 *      fake pseudo-ObjectIds into business.categoryId / serviceIds /
 *      additionalCategories service+category ids (those links never
 *      populated). Each pseudo-id is replaced with the real document id.
 *
 * Source of truth: the script EVALUATES the frontend data file directly, so
 * newly added hardcoded rows are picked up without touching this file.
 *
 * Usage:
 *   node src/scripts/materializeDefaultSubcategories.js            (run)
 *   node src/scripts/materializeDefaultSubcategories.js --dry-run  (preview)
 */
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });

const Category = require("../models/category");
const Business = require("../models/Business");

const MONGODB_URI = process.env.MONGODB_URI;
const dryRun = process.argv.includes("--dry-run");

/* ── Load the frontend hardcode as-is (no duplicated list here) ───────── */

const DETAIL_FILE = path.join(
  __dirname,
  "../../../frontend/src/data/categoryDetails.js"
);

function loadCategoryDetails() {
  const src = fs.readFileSync(DETAIL_FILE, "utf8");
  // Turn the ESM file into an in-memory CommonJS script and evaluate it.
  const cjs = src.replace(/export const /g, "const ");
  const { categoryDetails } = new Function(
    `${cjs}\n;return { categoryDetails };`
  )();
  if (!categoryDetails || Object.keys(categoryDetails).length === 0) {
    throw new Error("Could not read categoryDetails from " + DETAIL_FILE);
  }
  return categoryDetails;
}

/* ── Same helpers the frontend uses (`vendorCategories.js`) ───────────── */

const slugify = (name) =>
  (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const norm = (s) => (s || "").trim().toLowerCase();

// FNV-1a 32-bit — must match the frontend hash so saved pseudo-ids line up.
const hash32 = (str) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
};

const staticId = (key) => {
  let out = "";
  for (let i = 0; i < 3; i += 1) out += hash32(`${key}:${i}`).toString(16).padStart(8, "0");
  return out.slice(0, 24);
};

const subNames = (detail) =>
  detail.type === "comparison" ? detail.columns.slice(1) : detail.items || [];

/* ── Business link repair: swap a pseudo-id for the real document id ──── */

async function repairBusinessCategoryLink(pseudoId, realId, label) {
  if (!pseudoId || !realId) return;
  // Scalar ObjectId path — direct updateMany casts the hex pseudo-id fine.
  const primary = await Business.updateMany(
    { categoryId: pseudoId },
    { $set: { categoryId: realId } }
  );
  if (primary.modifiedCount > 0) {
    console.log(`    Repaired primary category links (${label}): ${primary.modifiedCount} business(es)`);
  }
  // additionalCategories[].categoryId — embedded path, rewritten in JS.
  const additionalTargets = await Business.find({
    "additionalCategories.categoryId": pseudoId,
  })
    .select("additionalCategories")
    .lean();
  let additionalTouchable = 0;
  for (const doc of additionalTargets) {
    let changed = false;
    const entries = (doc.additionalCategories || []).map((entry) => {
      if (String(entry.categoryId) === String(pseudoId)) {
        changed = true;
        return { ...entry, categoryId: realId };
      }
      return entry;
    });
    if (changed) {
      await Business.updateOne(
        { _id: doc._id },
        { $set: { additionalCategories: entries } }
      );
      additionalTouchable++;
    }
  }
  if (additionalTouchable > 0) {
    console.log(`    Repaired additional-category links (${label}): ${additionalTouchable} business(es)`);
  }
}

async function repairBusinessServiceLink(pseudoId, realId, label) {
  if (!pseudoId || !realId) return;
  const pseudo = String(pseudoId);
  // serviceIds / additionalCategories.serviceIds are ObjectId arrays —
  // Mongo rejects $eq strings inside arrayFilters here, so rewrite in JS.
  const [primaryTargets, additionalTargets] = await Promise.all([
    Business.find({ serviceIds: pseudo }).select("serviceIds").lean(),
    Business.find({ "additionalCategories.serviceIds": pseudo })
      .select("additionalCategories")
      .lean(),
  ]);

  const primaryTouchable = primaryTargets.filter(
    (b) => (b.serviceIds || []).some((id) => String(id) === pseudo)
  );
  if (primaryTouchable.length) {
    for (const doc of primaryTouchable) {
      await Business.updateOne(
        { _id: doc._id },
        {
          $set: {
            serviceIds: doc.serviceIds.map((id) =>
              String(id) === pseudo ? realId : id
            ),
          },
        }
      );
    }
    console.log(`    Repaired service links (${label}): ${primaryTouchable.length} business(es)`);
  }

  let additionalTouchable = 0;
  for (const doc of additionalTargets) {
    let changed = false;
    const entries = (doc.additionalCategories || []).map((entry) => {
      if ((entry.serviceIds || []).some((id) => String(id) === pseudo)) {
        changed = true;
        return {
          ...entry,
          serviceIds: entry.serviceIds.map((id) =>
            String(id) === pseudo ? realId : id
          ),
        };
      }
      return entry;
    });
    if (changed) {
      await Business.updateOne(
        { _id: doc._id },
        { $set: { additionalCategories: entries } }
      );
      additionalTouchable++;
    }
  }
  if (additionalTouchable > 0) {
    console.log(`    Repaired additional-category links (${label}): ${additionalTouchable} business(es)`);
  }
}

/* ── Migration ────────────────────────────────────────────────────────── */

async function migrate() {
  const details = loadCategoryDetails();
  console.log(
    `Loaded ${Object.keys(details).length} hardcoded categories from ${path.basename(DETAIL_FILE)}` +
      (dryRun ? " (DRY RUN — nothing will be written)" : "")
  );

  let parentsCreated = 0;
  let parentsReused = 0;
  let subsCreated = 0;
  let subsSkipped = 0;
  let subsTombstoned = 0;

  for (const [slug, detail] of Object.entries(details)) {
    console.log(`\n■ ${detail.label} (${slug})`);

    // 1. Parent document — required so subcategories can attach to it.
    let parent =
      (await Category.findOne({ slug, type: "parent" })) ||
      (await Category.findOne({ name: { $regex: `^${escapeRegex(detail.label)}$`, $options: "i" } }));

    if (dryRun) {
      console.log(`  parent: ${parent ? "exists in DB (" + parent.name + ")" : "WILL BE CREATED"}`);
    } else if (!parent) {
      try {
        parent = await Category.create({ name: detail.label, slug, type: "parent" });
        parentsCreated++;
        console.log(`  created parent: ${parent.name}`);
      } catch (err) {
        console.log(`  ! could not create parent "${detail.label}": ${err.message}`);
        continue;
      }
    } else {
      parentsReused++;
      console.log(`  parent exists: ${parent.name}`);
    }

    if (dryRun) continue;

    // Repair vendor selections that stored the static PARENT pseudo-id.
    await repairBusinessCategoryLink(staticId(`cat:${slug}`), parent._id, detail.label);

    const tombstones = new Set(parent.hiddenSubs || []);

    // 2. Subcategory documents.
    for (const name of subNames(detail)) {
      const subSlug = slugify(name);
      const label = `${detail.label} / ${name}`;

      if (tombstones.has(subSlug)) {
        subsTombstoned++;
        console.log(`  skip (deleted earlier): ${name}`);
        continue;
      }

      const exists =
        (await Category.findOne({ slug: subSlug })) ||
        (await Category.findOne({
          name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
        }));

      if (exists) {
        subsSkipped++;
        // Already in the DB (maybe under another parent). Still repair any
        // business rows that saved the static chip's pseudo-id.
        await repairBusinessServiceLink(
          staticId(`sub:${slug}:${name}`),
          exists._id,
          label
        );
        continue;
      }

      const sub = await Category.create({
        name,
        slug: subSlug,
        type: "subcategory",
        parentId: parent._id,
        image: "",
        description: "",
      });
      subsCreated++;
      console.log(`  created subcategory: ${name}`);

      await repairBusinessServiceLink(
        staticId(`sub:${slug}:${name}`),
        sub._id,
        label
      );
    }
  }

  console.log(`\nDone${dryRun ? " (dry run — no changes written)" : ""}`);
  if (!dryRun) {
    console.log(
      `Parents: ${parentsCreated} created, ${parentsReused} reused | ` +
        `Subcategories: ${subsCreated} created, ${subsSkipped} already existed, ` +
        `${subsTombstoned} skipped (tombstoned)`
    );
    console.log(
      `Total parents in DB: ${await Category.countDocuments({ type: "parent" })}`
    );
    console.log(
      `Total subcategories in DB: ${await Category.countDocuments({ type: "subcategory" })}`
    );
  }
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function run() {
  try {
    if (!MONGODB_URI) {
      console.error("MONGODB_URI missing — check backend/.env");
      process.exit(1);
    }
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");
    await migrate();
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

run();
