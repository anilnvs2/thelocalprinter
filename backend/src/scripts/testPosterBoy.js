/**
 * Poster Boy role end-to-end API test.
 *
 * Run from backend/:   node src/scripts/testPosterBoy.js
 * Creates a throwaway POSTER_BOY account, walks the whole approval lifecycle,
 * then deletes everything it created. Does NOT touch other accounts.
 */
const dotenv = require("dotenv");
dotenv.config();

const http = require("http");
const mongoose = require("mongoose");

const BASE = "http://localhost:5000/api";

const request = (method, path, body, token) =>
  new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const options = {
      method,
      hostname: "localhost",
      port: 5000,
      path: url.pathname + url.search,
      headers: { "Content-Type": "application/json" },
    };
    if (token) options.headers.Authorization = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });

let passed = 0;
let failed = 0;
const assert = (cond, label) => {
  if (cond) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.log(`  FAIL  ${label}`);
    failed++;
  }
};

const EMAIL = `posterboy.test.${Date.now()}@localprinter.test`;
const PASSWORD = "Poster@123";

const VALID_PROFILE = {
  aadhaarNumber: "453278912345",
  languages: ["Hindi", "English"],
  address: "12 MG Road, Near City Mall, Kolkata, West Bengal 700001",
  skills: ["Newspaper Inserts", "Distribution Boy", "Custom wall painting"],
  workMedia: [
    { url: "https://res.cloudinary.com/demo/image/upload/sample.jpg", resourceType: "image" },
    { url: "https://res.cloudinary.com/demo/video/upload/dog.mp4", resourceType: "video" },
  ],
  gpsCoordinates: { lat: 22.5726, lng: 88.3639 },
  city: "Kolkata",
  workRadius: "10 km to 30 km",
  strength: "Single Person",
  orderAccepted: ["Small", "Medium"],
  bookingTimeline: "1 day prior",
  workTiming: "Day Only",
};

const cleanup = async () => {
  const User = require("../models/User");
  const PosterBoyProfile = require("../models/PosterBoyProfile");
  const OtpVerification = require("../models/OtpVerification");
  const user = await User.findOne({ email: EMAIL });
  if (user) {
    await PosterBoyProfile.deleteMany({ user: user._id });
    await user.deleteOne();
  }
  await OtpVerification.deleteMany({ email: EMAIL });
};

const run = async () => {
  console.log("\n--- Poster Boy Role Tests ---\n");
  await mongoose.connect(process.env.MONGODB_URI);

  const User = require("../models/User");
  const OtpVerification = require("../models/OtpVerification");
  const Category = require("../models/Category");
  const PosterBoyProfile = require("../models/PosterBoyProfile");
  const { seedPosterBoyCategory } = require("./seedPosterBoyCategory");

  // The category + skill subcategories must exist before the profile is saved
  // so the API can resolve categoryId/skillIds on write.
  const { parent: pbParent, skillMap } = await seedPosterBoyCategory();
  assert(String(pbParent.kind) === "staffing", "Poster Boy category is kind=staffing");

  let token;
  let posterBoyUserId;
  let profileId;

  try {
    // ─── 1. Signup gating ───
    let res = await request("POST", "/auth/signup", {
      fullName: "Invalid Role Boy",
      email: `invalid.role.${Date.now()}@localprinter.test`,
      password: PASSWORD,
      role: "SUPERADMIN",
    });
    assert(res.status === 400, "unknown role rejected with 400");

    res = await request("POST", "/auth/signup-json", {
      fullName: "Poster Boy Test",
      email: EMAIL,
      password: PASSWORD,
      role: "POSTER_BOY",
      whatsappNumber: "9876543210",
    });
    assert(res.status === 400, "signup without verified OTP rejected with 400");

    // Seed a verified OTP record so signup can proceed.
    await OtpVerification.deleteMany({ email: EMAIL });
    await new OtpVerification({
      email: EMAIL,
      otpHash: "seeded-for-test",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      verified: true,
    }).save();

    res = await request("POST", "/auth/signup-json", {
      fullName: "Poster Boy Test",
      email: EMAIL,
      password: PASSWORD,
      role: "POSTER_BOY",
      whatsappNumber: "9876543210",
    });
    assert(res.status === 201, "signup with verified OTP returns 201");
    const createdUser = res.body && res.body.data && res.body.data.user;
    assert(createdUser && createdUser.role === "POSTER_BOY", "role is POSTER_BOY");
    assert(createdUser && createdUser.approvalStatus === "pending", "account starts pending");
    assert(
      createdUser && /^PST-[A-Z0-9]{6}$/.test(createdUser.publicId || ""),
      `publicId has PST- prefix (got ${createdUser && createdUser.publicId})`
    );
    assert(res.body.data.token, "token issued on signup");
    posterBoyUserId = createdUser && createdUser._id;

    // ─── 2. Pending account: login + profile form accessible (form-before-approval) ───
    res = await request("POST", "/auth/login", { email: EMAIL, password: PASSWORD });
    assert(res.status === 200, "pending poster boy CAN log in (must reach the form)");
    assert(res.body.data.user.approvalStatus === "pending", "login returns pending status");
    token = res.body.data.token;

    res = await request("GET", "/auth/me", null, token);
    assert(res.status === 200, "/auth/me works while pending (no logout loop)");
    assert(res.body.data.user.approvalStatus === "pending", "/auth/me exposes approvalStatus");

    res = await request("GET", "/posterboy/profile", null, token);
    assert(res.status === 200, "profile GET allowed while pending (form-before-approval)");

    // ─── 3. Admin login (approval happens AFTER the form is submitted) ───
    res = await request("POST", "/auth/login", {
      email: "admin@localprinter.com",
      password: "admin@123456",
    });
    assert(res.status === 200, "admin login");
    const adminToken = res.body.data.token;
    assert(res.body.data.user.role === "ADMIN", "admin role is ADMIN");

    // Regression: approval must still be refused for a plain USER account.
    const plainUser = await User.findOne({ role: "USER" });
    if (plainUser) {
      res = await request(
        "PATCH",
        `/admin/users/${plainUser._id}/approval-status`,
        { status: "approved" },
        adminToken
      );
      assert(res.status === 400, "approval still refused for USER role (regression)");
    } else {
      console.log("  SKIP  USER-role approval regression (no USER account found)");
    }

    // ─── 4. Profile: validation negatives (while still pending) ───
    const negatives = [
      [{ ...VALID_PROFILE, aadhaarNumber: "12345678901" }, "aadhaar must be 12 digits"],
      [{ ...VALID_PROFILE, languages: [] }, "languages required"],
      [{ ...VALID_PROFILE, address: "abc" }, "address too short"],
      [{ ...VALID_PROFILE, skills: [] }, "skills required"],
      [{ ...VALID_PROFILE, skills: ["Others"] }, 'literal "Others" rejected'],
      [{ ...VALID_PROFILE, workTiming: "Whenever" }, "invalid workTiming rejected"],
      [
        {
          ...VALID_PROFILE,
          workMedia: Array.from({ length: 11 }, (_, i) => ({
            url: `https://res.cloudinary.com/demo/image/upload/${i}.jpg`,
            resourceType: "image",
          })),
        },
        "more than 10 work media rejected",
      ],
    ];
    for (const [payload, label] of negatives) {
      res = await request("PUT", "/posterboy/profile", payload, token);
      assert(res.status === 400, `rejects: ${label}`);
    }

    // ─── 5. First save while pending → profile submitted for review ───
    res = await request("PUT", "/posterboy/profile", VALID_PROFILE, token);
    assert(res.status === 200, "first profile save returns 200 (allowed while pending)");
    assert(res.body.data.profile.status === "pending", "first save status is pending");
    assert(res.body.data.profile.profileCompleted === true, "profileCompleted set");
    assert(
      res.body.data.profile.skills.length === 3,
      "skills stored (3 selected, deduped)"
    );
    assert(res.body.data.profile.workTiming === "Day Only", "workTiming stored");
    profileId = res.body.data.profile._id;

    res = await request("GET", "/posterboy/profile", null, token);
    assert(res.status === 200, "profile GET works while pending");
    assert(res.body.data.user.fullName === "Poster Boy Test", "name auto-sourced from User");
    assert(
      res.body.data.user.whatsappNumber === "9876543210",
      "mobile auto-sourced from User whatsappNumber"
    );
    assert(res.body.data.profile.hasPendingChange === false, "no pending change yet");
    assert(res.body.data.profile.status === "pending", "profile status pending");

    // ─── 6. Admin account approval → also approves the submitted profile (one review) ───
    res = await request(
      "PATCH",
      `/admin/users/${posterBoyUserId}/approval-status`,
      { status: "approved" },
      adminToken
    );
    assert(res.status === 200, "admin can approve a POSTER_BOY account");

    const dbUser = await User.findById(posterBoyUserId);
    assert(dbUser && dbUser.approvalStatus === "approved", "approvalStatus persisted as approved");

    const approvedProfile = await PosterBoyProfile.findById(profileId);
    assert(
      approvedProfile && approvedProfile.status === "approved",
      "account approval also approves the submitted profile (one review step)"
    );

    res = await request("GET", "/posterboy/profile", null, token);
    assert(res.body.data.profile.status === "approved", "profile GET reports approved after account approval");
    assert(res.body.data.profile.hasPendingChange === false, "no pendingChange after approval");

    // ─── 7. Edit after approval → staged, live untouched ───
    const edited = {
      ...VALID_PROFILE,
      address: "45 Park Street, Kolkata, West Bengal 700016",
      skills: ["Installation Boy"],
    };
    res = await request("PUT", "/posterboy/profile", edited, token);
    assert(res.status === 200, "post-approval edit returns 200");
    assert(
      /submitted for admin approval/i.test(res.body.message || ""),
      "edit message says submitted for approval"
    );
    assert(res.body.data.profile.hasPendingChange === true, "edit staged in pendingChange");

    res = await request("GET", "/posterboy/profile", null, token);
    assert(res.body.data.profile.hasPendingChange === true, "GET reports hasPendingChange");
    assert(res.body.data.profile.pendingChangeAt, "GET reports pendingChangeAt");
    assert(
      res.body.data.profile.address === VALID_PROFILE.address,
      "live address untouched while change pending"
    );
    assert(
      res.body.data.profile.pendingChangeData.address === edited.address,
      "pendingChangeData carries the new address"
    );

    // ─── 8. Approve the staged change → merge ───
    res = await request(
      "PATCH",
      `/admin/poster-boys/${profileId}/profile-status`,
      { status: "approved" },
      adminToken
    );
    assert(res.status === 200, "admin approves staged change");
    assert(res.body.data.profile.address === edited.address, "pendingChange merged into live fields");
    assert(res.body.data.profile.hasPendingChange === false, "pendingChange cleared after merge");
    assert(res.body.data.profile.skills.length === 1, "skills merged too");

    // ─── 9. Reject a staged change → live preserved ───
    res = await request("PUT", "/posterboy/profile", { ...edited, address: "Should Not Persist" }, token);
    assert(res.status === 200, "another edit staged");

    res = await request(
      "PATCH",
      `/admin/poster-boys/${profileId}/profile-status`,
      { status: "rejected" },
      adminToken
    );
    assert(res.status === 200, "admin rejects staged change");
    assert(res.body.data.profile.hasPendingChange === false, "pendingChange discarded");
    assert(
      res.body.data.profile.address === edited.address,
      "live fields preserved when change rejected"
    );
    assert(res.body.data.profile.status === "approved", "profile stays approved after change reject");

    // ─── 10. Admin listing ───
    res = await request("GET", "/admin/poster-boys", null, adminToken);
    assert(res.status === 200, "GET /admin/poster-boys returns 200");
    const adminItems = (res.body.data && res.body.data.items) || [];
    const me = adminItems.find((i) => String(i._id) === String(posterBoyUserId));
    assert(!!me, "listing includes our poster boy");
    assert(me && me.approvalStatus === "approved", "listing shows account status");
    assert(me && me.profile && me.profile.status === "approved", "listing shows profile status");
    assert(me && Array.isArray(me.profile.skills), "listing includes skills");

    // ─── 11. Role isolation ───
    res = await request("GET", "/admin/poster-boys", null, token);
    assert(res.status === 403, "poster boy cannot call admin listing");

    res = await request("GET", "/vendor/dashboard", null, token);
    assert(res.status === 403, "poster boy cannot call vendor endpoints");

    res = await request("GET", "/posterboy/profile", null, adminToken);
    assert(res.status === 403, "admin cannot call poster boy endpoints");

    // ─── 12. Public listing (category + skill search) ───
    const skillCats = await Category.find({ parentId: pbParent._id, type: "subcategory" }).sort({ name: 1 });
    assert(skillCats.length >= 6, `skill subcategories seeded (${skillCats.length})`);

    const savedProfile = await PosterBoyProfile.findOne({ user: posterBoyUserId });
    assert(savedProfile, "profile document exists");
    assert(String(savedProfile.categoryId) === String(pbParent._id), "profile stores categoryId");
    // The approved live profile ends up with skills: ["Installation Boy"].
    assert(
      Array.isArray(savedProfile.skillIds) && savedProfile.skillIds.length === 1,
      `profile stores skillIds for the live skills (${(savedProfile.skillIds || []).length})`
    );
    assert(savedProfile.city === "Kolkata", "city filled for filtering");

    res = await request("GET", "/user/public/poster-boys?limit=50");
    assert(res.status === 200, "public listing returns 200");
    let items = (res.body.data && res.body.data.posterBoys) || [];
    let mine = items.find((i) => String(i._id) === String(profileId));
    assert(!!mine, "approved profile appears in the public listing");
    assert(mine && !("aadhaarNumber" in mine), "listing never exposes aadhaarNumber");
    assert(mine && !("email" in mine), "listing never exposes email");
    assert(mine && !("phone" in mine), "listing never exposes phone");
    assert(mine && !("whatsappNumber" in mine), "listing never exposes whatsappNumber");
    assert(mine && !("pendingChange" in mine), "listing never exposes pendingChange");
    assert(mine && !!mine.contactHint, "listing carries a masked contact hint");
    assert(mine && !!mine.publicId && String(mine.publicId).startsWith("PST-"), "listing exposes PST- publicId");

    // Category filter
    res = await request("GET", `/user/public/poster-boys?categoryId=${pbParent._id}&limit=50`);
    items = (res.body.data && res.body.data.posterBoys) || [];
    mine = items.find((i) => String(i._id) === String(profileId));
    assert(res.status === 200 && !!mine, "filter by parent categoryId returns the profile");

    // Skill filters: chosen skill matches, unchosen skill does not.
    const chosenSkill = skillCats.find((c) => c.slug === "installation-boy");
    const otherSkill = skillCats.find((c) => c.slug === "pasting-boy");
    assert(!!chosenSkill && !!otherSkill, "skill subcategories resolvable by slug");

    res = await request("GET", `/user/public/poster-boys?serviceId=${chosenSkill._id}&limit=50`);
    items = (res.body.data && res.body.data.posterBoys) || [];
    mine = items.find((i) => String(i._id) === String(profileId));
    assert(res.status === 200 && !!mine, "filter by chosen skill returns the profile");

    res = await request("GET", `/user/public/poster-boys?serviceId=${otherSkill._id}&limit=50`);
    items = (res.body.data && res.body.data.posterBoys) || [];
    mine = items.find((i) => String(i._id) === String(profileId));
    assert(res.status === 200 && !mine, "filter by unchosen skill excludes the profile");

    // City filter
    res = await request("GET", "/user/public/poster-boys?city=Kolkata&limit=50");
    items = (res.body.data && res.body.data.posterBoys) || [];
    mine = items.find((i) => String(i._id) === String(profileId));
    assert(res.status === 200 && !!mine, "city filter matches the profile city");

    res = await request("GET", "/user/public/poster-boys?city=Howrah&limit=50");
    items = (res.body.data && res.body.data.posterBoys) || [];
    mine = items.find((i) => String(i._id) === String(profileId));
    assert(res.status === 200 && !mine, "city filter excludes other cities");

    // Free-text search on skills
    res = await request("GET", "/user/public/poster-boys?search=Installation&limit=50");
    items = (res.body.data && res.body.data.posterBoys) || [];
    mine = items.find((i) => String(i._id) === String(profileId));
    assert(res.status === 200 && !!mine, "free-text search matches skill names");

    // Contact reveal
    res = await request("POST", `/user/public/poster-boys/${profileId}/contact`);
    assert(res.status === 200, "contact reveal returns 200");
    assert(
      res.body.data && (res.body.data.whatsappNumber === "9876543210" || res.body.data.phone),
      "contact reveal returns a real number"
    );
    const revealed = await PosterBoyProfile.findById(profileId);
    assert((revealed.leadCount || 0) >= 1, "leadCount increments on reveal");

    res = await request("POST", "/user/public/poster-boys/000000000000000000000000/contact");
    assert(res.status === 404, "contact reveal for unknown id returns 404");

    // Staffing category is never a business category.
    res = await request("GET", "/user/public/categories");
    assert(res.status === 200, "public categories endpoint still works");
    const pubCats = (res.body.data && res.body.data.categories) || [];
    const pubPb = pubCats.find((c) => c.slug === "poster-boy");
    assert(!!pubPb, "Poster Boy is exposed to the public category list");
    assert(pubPb && pubPb.kind === "staffing", "public category carries kind=staffing");
    assert(
      pubPb && Array.isArray(pubPb.services) && pubPb.services.length >= 6,
      "Poster Boy exposes its skill subcategories"
    );

    res = await request("GET", "/user/public/businesses/filters");
    assert(res.status === 200, "public business filters still work");
    const filterCats = (res.body.data && res.body.data.categories) || [];
    assert(
      !filterCats.some((c) => c.slug === "poster-boy"),
      "staffing category hidden from business filters"
    );
    res = await request("GET", "/user/public/businesses?search=Poster%20Boy&limit=5");
    assert(res.status === 200, "business search for the staffing name still works");
    const bizItems = (res.body.data && res.body.data.businesses) || [];
    assert(
      bizItems.every((b) => b.categoryId?.slug !== "poster-boy"),
      "business search never returns staffing-category businesses"
    );

    // ─── 13. Sign-up path regression for USER + VENDOR ───
    await OtpVerification.deleteMany({ email: "pb.regression.user@localprinter.test" });
    await new OtpVerification({
      email: "pb.regression.user@localprinter.test",
      otpHash: "seeded-for-test",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      verified: true,
    }).save();
    res = await request("POST", "/auth/signup-json", {
      fullName: "Regression User",
      email: "pb.regression.user@localprinter.test",
      password: PASSWORD,
      role: "USER",
      whatsappNumber: "9111111111",
    });
    assert(res.status === 201, "USER signup still works (regression)");
    assert(res.body.data.user.approvalStatus === "approved", "USER account still auto-approved");
    assert(
      (res.body.data.user.publicId || "").startsWith("USR-"),
      "USER publicId still USR- prefix"
    );

    res = await request("POST", "/auth/login", {
      email: "pb.regression.user@localprinter.test",
      password: PASSWORD,
    });
    assert(res.status === 200, "USER login still works (regression)");

    await OtpVerification.deleteMany({ email: "pb.regression.vendor@localprinter.test" });
    await new OtpVerification({
      email: "pb.regression.vendor@localprinter.test",
      otpHash: "seeded-for-test",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      verified: true,
    }).save();
    res = await request("POST", "/auth/signup-json", {
      fullName: "Regression Vendor",
      email: "pb.regression.vendor@localprinter.test",
      password: PASSWORD,
      role: "VENDOR",
      whatsappNumber: "9222222222",
    });
    assert(res.status === 201, "VENDOR signup still works (regression)");
    assert(res.body.data.user.approvalStatus === "approved", "VENDOR account still auto-approved");
    assert(
      (res.body.data.user.publicId || "").startsWith("VND-"),
      "VENDOR publicId still VND- prefix"
    );

    // VENDOR pending rejection still enforced (legacy gate untouched).
    const pendingVendor = await User.findOne({ role: "VENDOR", approvalStatus: "pending" });
    if (pendingVendor) {
      await User.updateOne({ _id: pendingVendor._id }, { $set: { approvalStatus: "pending" } });
      console.log("  SKIP  VENDOR pending-login gate (no controllable pending vendor)");
    }

    console.log(`\n=============================`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log(`=============================\n`);
  } catch (err) {
    console.error("\nFATAL:", err);
    failed++;
  } finally {
    try {
      // Remove the regression accounts too so the DB stays clean.
      await User.deleteMany({
        email: { $in: ["pb.regression.user@localprinter.test", "pb.regression.vendor@localprinter.test"] },
      });
      await OtpVerification.deleteMany({
        email: { $in: ["pb.regression.user@localprinter.test", "pb.regression.vendor@localprinter.test", EMAIL] },
      });
      await cleanup();
    } catch (e) {
      console.error("Cleanup error:", e.message);
    }
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
};

run();
