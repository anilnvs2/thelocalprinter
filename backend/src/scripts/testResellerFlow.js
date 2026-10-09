/**
 * WhatsApp mandatory field / Payment Rule multi-select / Reseller manual
 * approval end-to-end API test.
 *
 * Run from backend/:   node src/scripts/testResellerFlow.js
 * Requires the API server on localhost:5000.
 * Creates throwaway accounts, walks the whole flow, then deletes everything it
 * created. Does NOT touch other accounts.
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

// Multipart POST — mirrors what the Reseller signup form sends.
const multipartRequest = async (path, fields, token) => {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => form.append(key, value));
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method: "POST", headers, body: form });
  let body;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  return { status: res.status, body };
};

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

const stamp = Date.now();
const USER_EMAIL = `wa.user.${stamp}@localprinter.test`;
const BUSINESS_EMAIL = `wa.business.${stamp}@localprinter.test`;
const BUSINESS2_EMAIL = `wa.business2.${stamp}@localprinter.test`;
const RESELLER_EMAIL = `wa.reseller.${stamp}@localprinter.test`;
const PASSWORD = "Test@123456";
const TEST_EMAILS = [USER_EMAIL, BUSINESS_EMAIL, BUSINESS2_EMAIL, RESELLER_EMAIL];

const seedOtp = async (email) => {
  const OtpVerification = require("../models/OtpVerification");
  await OtpVerification.deleteMany({ email });
  await new OtpVerification({
    email,
    otpHash: "seeded-for-test",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    verified: true,
  }).save();
};

const cleanup = async () => {
  const User = require("../models/User");
  const ResellerApplication = require("../models/ResellerApplication");
  const OtpVerification = require("../models/OtpVerification");
  const users = await User.find({ email: { $in: TEST_EMAILS } }).select("_id");
  const ids = users.map((u) => u._id);
  if (ids.length) {
    await ResellerApplication.deleteMany({ user: { $in: ids } });
    await User.deleteMany({ _id: { $in: ids } });
  }
  await OtpVerification.deleteMany({ email: { $in: TEST_EMAILS } });
};

const validationMessage = (body) =>
  (body.errors || []).map((e) => e.message).join(" | ");

const run = async () => {
  console.log("\n--- WhatsApp / Payment Rule / Reseller Approval Tests ---\n");
  await mongoose.connect(process.env.MONGODB_URI);

  const User = require("../models/User");
  const ResellerApplication = require("../models/ResellerApplication");

  try {
    // ─── 1. WhatsApp is mandatory for USER sign-ups ───
    let res = await request("POST", "/auth/signup-json", {
      fullName: "WhatsApp Missing",
      email: `wa.missing.${stamp}@localprinter.test`,
      password: PASSWORD,
      role: "USER",
      registrationType: "PERSONAL_USE",
    });
    assert(res.status === 400, "USER signup without WhatsApp is blocked (400)");
    assert(
      /whatsapp/i.test(validationMessage(res.body)),
      `validation message mentions WhatsApp (got "${validationMessage(res.body)}")`
    );

    res = await request("POST", "/auth/signup-json", {
      fullName: "WhatsApp Invalid",
      email: `wa.invalid.${stamp}@localprinter.test`,
      password: PASSWORD,
      role: "USER",
      registrationType: "PERSONAL_USE",
      whatsappNumber: "abc",
    });
    assert(res.status === 400, "USER signup with an invalid WhatsApp number is blocked");

    res = await multipartRequest("/auth/signup", {
      fullName: "Reseller No WhatsApp",
      email: `wa.reseller.missing.${stamp}@localprinter.test`,
      password: PASSWORD,
      role: "USER",
      registrationType: "RESELLER",
      resellerDetails: JSON.stringify({
        companyName: "No WhatsApp Traders",
        businessCategory: "Designer",
        contactNumber: "9876543210",
      }),
    });
    assert(res.status === 400, "Reseller signup without WhatsApp is blocked (multipart)");

    res = await request("POST", "/auth/signup-json", {
      fullName: "Vendor No WhatsApp",
      email: `wa.vendor.${stamp}@localprinter.test`,
      password: PASSWORD,
      role: "VENDOR",
    });
    assert(
      res.status !== 201 && !/whatsapp/i.test(validationMessage(res.body)),
      "Vendor signup is not affected by the WhatsApp rule"
    );

    // ─── 2. USER signup with a valid WhatsApp number works ───
    await seedOtp(USER_EMAIL);
    res = await request("POST", "/auth/signup-json", {
      fullName: "WhatsApp User",
      email: USER_EMAIL,
      password: PASSWORD,
      role: "USER",
      registrationType: "PERSONAL_USE",
      whatsappNumber: "+91 98765 43210",
    });
    assert(res.status === 201, "USER signup with WhatsApp returns 201");
    assert(
      res.body?.data?.user?.whatsappNumber === "+91 98765 43210",
      "WhatsApp number is saved on the account"
    );

    // ─── 3. Personal Use keeps the normal flow (no reseller approval) ───
    const personalUser = await User.findOne({ email: USER_EMAIL }).lean();
    assert(
      personalUser && personalUser.registrationType === "PERSONAL_USE",
      "Personal Use registration type is stored"
    );
    assert(
      personalUser && !personalUser.resellerApprovalStatus,
      "Personal Use has no reseller approval status"
    );

    // ─── 4. Business Purpose: payment rule accepts multiple values ───
    await seedOtp(BUSINESS_EMAIL);
    res = await request("POST", "/auth/signup-json", {
      fullName: "Business Purpose User",
      email: BUSINESS_EMAIL,
      password: PASSWORD,
      role: "USER",
      registrationType: "BUSINESS_PURPOSE",
      whatsappNumber: "9876543210",
      businessPurposeDetails: {
        companyName: "Print & Pack Co",
        location: "Indore",
        businessCategory: "Retail Store",
        contactNumber: "9876543210",
        paymentRule: ["Cash & Carry", "PO Based"],
      },
    });
    assert(res.status === 201, "Business Purpose signup returns 201");

    let businessUser = await User.findOne({ email: BUSINESS_EMAIL }).lean();
    assert(
      Array.isArray(businessUser?.businessPurposeDetails?.paymentRule) &&
        businessUser.businessPurposeDetails.paymentRule.includes("Cash & Carry") &&
        businessUser.businessPurposeDetails.paymentRule.includes("PO Based"),
      `both payment rules are stored (got ${JSON.stringify(
        businessUser?.businessPurposeDetails?.paymentRule
      )})`
    );
    assert(
      !businessUser.resellerApprovalStatus,
      "Business Purpose has no reseller approval workflow"
    );

    await seedOtp(BUSINESS2_EMAIL);
    res = await request("POST", "/auth/signup-json", {
      fullName: "Business Purpose Single",
      email: BUSINESS2_EMAIL,
      password: PASSWORD,
      role: "USER",
      registrationType: "BUSINESS_PURPOSE",
      whatsappNumber: "9876543210",
      businessPurposeDetails: {
        companyName: "PO Traders",
        location: "Pune",
        businessCategory: "Corporate Office",
        contactNumber: "9876543210",
        paymentRule: ["PO Based"],
      },
    });
    assert(res.status === 201, "Single payment rule signup returns 201");
    businessUser = await User.findOne({ email: BUSINESS2_EMAIL }).lean();
    assert(
      JSON.stringify(businessUser?.businessPurposeDetails?.paymentRule) ===
        JSON.stringify(["PO Based"]),
      "single payment rule is stored as a one-item array"
    );

    // ─── 5. Reseller signup stays PENDING ───
    await seedOtp(RESELLER_EMAIL);
    res = await multipartRequest("/auth/signup", {
      fullName: "Reseller Flow Test",
      email: RESELLER_EMAIL,
      password: PASSWORD,
      role: "USER",
      whatsappNumber: "9876543210",
      registrationType: "RESELLER",
      resellerDetails: JSON.stringify({
        companyName: "Reseller Flow Traders",
        address: "12 MG Road, Indore",
        businessCategory: "Printer",
        contactNumber: "9876543210",
      }),
    });
    assert(res.status === 201, "Reseller signup returns 201");
    const resellerUserId = res.body?.data?.user?._id;
    assert(!!resellerUserId, "reseller account is created");

    let resellerUser = await User.findById(resellerUserId).lean();
    assert(
      resellerUser && resellerUser.role === "USER",
      "reseller account role stays USER"
    );
    assert(
      resellerUser && resellerUser.registrationType === "RESELLER",
      "registration type is RESELLER before approval"
    );
    assert(
      resellerUser && resellerUser.resellerApprovalStatus === "PENDING",
      "reseller approval status starts PENDING (never auto-approved)"
    );

    let application = await ResellerApplication.findOne({ user: resellerUserId }).lean();
    assert(!!application, "reseller application is created");
    assert(
      application && application.status === "PENDING",
      "reseller application status is PENDING"
    );

    // ─── 6. Pending application is visible under Admin -> Businesses ───
    const adminLogin = await request("POST", "/auth/login", {
      email: "admin@localprinter.com",
      password: "admin@123456",
    });
    assert(adminLogin.status === 200, "admin can log in");
    const adminToken = adminLogin.body?.data?.token;
    assert(adminLogin.body?.data?.user?.role === "ADMIN", "admin role is ADMIN");

    res = await request(
      "GET",
      "/admin/reseller-applications?status=PENDING",
      null,
      adminToken
    );
    assert(res.status === 200, "admin can list pending reseller applications");
    const pendingList = res.body?.data?.applications || [];
    const listed = pendingList.find((a) => String(a._id) === String(application._id));
    assert(!!listed, "pending reseller application appears in the admin listing");
    assert(
      listed && listed.user?.fullName === "Reseller Flow Test",
      "application is linked to the registered user account"
    );

    // The account is still pending while it waits for approval.
    res = await request("GET", "/admin/users", null, adminToken);
    assert(res.status === 200, "admin can list users before approval");

    // ─── 7. Admin approves the reseller ───
    res = await request(
      "PATCH",
      `/admin/reseller-applications/${application._id}/approve`,
      {},
      adminToken
    );
    assert(res.status === 200, "admin approve endpoint returns 200");

    const approvedUser = await User.findById(resellerUserId).lean();
    assert(
      approvedUser && approvedUser.resellerApprovalStatus === "APPROVED",
      "the SAME account becomes APPROVED"
    );
    assert(
      approvedUser && approvedUser.registrationType === "RESELLER",
      "registration type stays RESELLER after approval"
    );
    assert(
      approvedUser && approvedUser.publicId &&
        String(approvedUser.publicId).startsWith("USR-"),
      "public id keeps the USR- prefix"
    );

    application = await ResellerApplication.findById(application._id).lean();
    assert(application && application.status === "APPROVED", "application is APPROVED");

    const accountCount = await User.countDocuments({ email: RESELLER_EMAIL });
    assert(accountCount === 1, "no duplicate account was created");

    res = await request("PATCH", `/admin/reseller-applications/${application._id}/approve`, {}, adminToken);
    assert(res.status === 400, "approving twice is rejected");

    // ─── 8. Approved reseller shows up in Admin -> Users ───
    res = await request("GET", `/admin/users?search=${encodeURIComponent(RESELLER_EMAIL)}`, null, adminToken);
    assert(res.status === 200, "admin can search users after approval");
    const found = (res.body?.data?.users || []).filter((u) => u.email === RESELLER_EMAIL);
    assert(found.length === 1, "exactly one user record is returned");
    assert(
      found[0] && found[0].registrationType === "RESELLER",
      "Users view shows Registration Type = RESELLER"
    );
    assert(
      found[0] && found[0].resellerApprovalStatus === "APPROVED",
      "Users view shows Approval Status = APPROVED"
    );
    assert(
      found[0] && found[0].role === "USER",
      "Users view shows Role = USER"
    );
  } finally {
    await cleanup();
    console.log("\n  Cleanup: test accounts removed.");
  }

  console.log(`\n  ${passed} passed, ${failed} failed\n`);
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
};

run().catch(async (err) => {
  console.error("Test run failed:", err);
  try {
    await cleanup();
  } catch (e) {
    /* ignore */
  }
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
