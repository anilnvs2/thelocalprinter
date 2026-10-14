/**
 * Creates / updates the "Poster Boy" parent category and its skill subcategories,
 * then backfills categoryId + skillIds on every existing PosterBoyProfile.
 *
 * Idempotent (upsert by slug) so it is safe to re-run.
 *
 * Run from backend/:   node src/scripts/seedPosterBoyCategory.js
 *   or via npm:        npm run seed:posterboy
 */
const path = require("path");
const mongoose = require("mongoose");
const Category = require("../models/Category");
const PosterBoyProfile = require("../models/PosterBoyProfile");
const {
  POSTER_BOY_CATEGORY_NAME,
  POSTER_BOY_CATEGORY_SLUG,
  POSTER_BOY_SKILLS,
  POSTER_BOY_IMAGE,
  slugify,
  getSkillMap,
  resolveSkillIds,
} = require("../utils/posterBoyCategory");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

/**
 * Creates/updates the Poster Boy category + skill subcategories and backfills
 * every poster boy profile. Returns { parent, skillMap, profilesBackfilled }.
 */
const seedPosterBoyCategory = async () => {
  let parent = await Category.findOne({ slug: POSTER_BOY_CATEGORY_SLUG });

  if (parent) {
    let dirty = false;
    if (parent.kind !== "staffing") {
      parent.kind = "staffing";
      dirty = true;
    }
    if (!parent.image) {
      parent.image = POSTER_BOY_IMAGE;
      dirty = true;
    }
    if (parent.name !== POSTER_BOY_CATEGORY_NAME) {
      parent.name = POSTER_BOY_CATEGORY_NAME;
      dirty = true;
    }
    if (!parent.isActive) {
      parent.isActive = true;
      dirty = true;
    }
    if (dirty) await parent.save();
  } else {
    parent = await Category.create({
      name: POSTER_BOY_CATEGORY_NAME,
      slug: POSTER_BOY_CATEGORY_SLUG,
      type: "parent",
      kind: "staffing",
      image: POSTER_BOY_IMAGE,
      isActive: true,
      description:
        "Hire local poster boys for flyer pasting, distribution, board fitting and related outdoor work.",
    });
  }

  for (const skillName of POSTER_BOY_SKILLS) {
    const subSlug = slugify(skillName);
    let sub =
      (await Category.findOne({ slug: subSlug })) ||
      (await Category.findOne({ name: skillName, type: "subcategory" }));

    if (sub) {
      let dirty = false;
      if (sub.name !== skillName) {
        sub.name = skillName;
        dirty = true;
      }
      if (String(sub.parentId) !== String(parent._id)) {
        sub.parentId = parent._id;
        dirty = true;
      }
      if (sub.type !== "subcategory") {
        sub.type = "subcategory";
        dirty = true;
      }
      if (!sub.isActive) {
        sub.isActive = true;
        dirty = true;
      }
      if (dirty) await sub.save();
    } else {
      try {
        await Category.create({
          name: skillName,
          slug: subSlug,
          type: "subcategory",
          parentId: parent._id,
          isActive: true,
        });
      } catch (err) {
        if (err.code !== 11000) throw err;
        console.log(`  name conflict, skipped subcategory: ${skillName}`);
      }
    }
  }

  // Replace flow: drop skill subcategories that are no longer offered so the
  // public category page and search only expose the current skill list.
  const keepSlugs = new Set(POSTER_BOY_SKILLS.map(slugify));
  const stale = await Category.find({
    parentId: parent._id,
    type: "subcategory",
    slug: { $nin: [...keepSlugs] },
  });
  let removedSkills = 0;
  if (stale.length) {
    const staleIds = stale.map((s) => s._id);
    await PosterBoyProfile.updateMany(
      { skillIds: { $in: staleIds } },
      { $pull: { skillIds: { $in: staleIds } } }
    );
    await Category.deleteMany({ _id: { $in: staleIds } });
    removedSkills = stale.length;
  }

  // Re-fetch after the cleanup so backfill only resolves the current skills.
  const skillMap = await getSkillMap(parent._id);

  const profiles = await PosterBoyProfile.find({});
  let profilesBackfilled = 0;
  for (const profile of profiles) {
    const skillIds = resolveSkillIds(profile.skills, skillMap);
    const same =
      String(profile.categoryId || "") === String(parent._id) &&
      profile.skillIds.length === skillIds.length &&
      skillIds.every((id, i) => String(id) === String(profile.skillIds[i]));
    if (same) continue;
    profile.categoryId = parent._id;
    profile.skillIds = skillIds;
    await profile.save();
    profilesBackfilled++;
  }

  return { parent, skillMap, skills: POSTER_BOY_SKILLS, profilesBackfilled, removedSkills };
};

module.exports = { seedPosterBoyCategory };

if (require.main === module) {
  (async () => {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("Connected to MongoDB");
      const { parent, profilesBackfilled, removedSkills } = await seedPosterBoyCategory();
      console.log(`Poster Boy category ready: ${parent.name} (${parent.slug}) [${parent._id}]`);
      const subs = await Category.find({ parentId: parent._id, type: "subcategory" });
      console.log(`Skill subcategories: ${subs.length}`);
      subs.forEach((s) => console.log(`  - ${s.name} (${s.slug})`));
      if (removedSkills) console.log(`Stale skill subcategories removed: ${removedSkills}`);
      console.log(`Profiles backfilled: ${profilesBackfilled}`);
      await mongoose.disconnect();
      console.log("Disconnected from MongoDB");
    } catch (err) {
      console.error("Seed error:", err);
      await mongoose.disconnect().catch(() => {});
      process.exit(1);
    }
  })();
}
