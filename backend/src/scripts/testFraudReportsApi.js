// Integration-style test for GET /api/vendor/fraud-reports.
// Stubs the Mongoose models (no DB required) and drives the real Express app
// through HTTP: authorization, response shape, search filtering, pagination.
// Run with: node src/scripts/testFraudReportsApi.js
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/test";

const http = require("http");
const jwt = require("jsonwebtoken");
const assert = require("assert");

const User = require("../models/User");
const Business = require("../models/Business");

// ── Seed data: 23 businesses, 23 fraud reports (plus one clean business) ──
const seedBusinesses = [];
for (let i = 1; i <= 23; i += 1) {
  seedBusinesses.push({
    _id: `biz${i}`,
    name: `Business ${i}`,
    createdAt: new Date(2026, 0, i),
    fraudReport: [
      {
        contactName: i === 17 ? "Rahul Sharma" : `Contact ${i}`,
        designation: i === 17 ? "Manager" : `Role ${i}`,
        contactNumber: i === 17 ? "+91 98765-43210" : `99001122${String(i).padStart(2, "0")}`,
      },
    ],
  });
}
seedBusinesses.push({ _id: "bizClean", name: "Clean Biz", createdAt: new Date(2026, 5, 1), fraudReport: [] });

const leanResult = (docs) => ({
  select: function () { return this; },
  sort: function () { return this; },
  lean: function () { return Promise.resolve(docs); },
});

Business.find = (query) => {
  // Emulate the real query filter used by the controller.
  if (query && query["fraudReport.0"] && query["fraudReport.0"].$exists) {
    return leanResult(seedBusinesses.filter((b) => Array.isArray(b.fraudReport) && b.fraudReport.length > 0));
  }
  return leanResult([]);
};

const fakeUsers = {
  "u-vendor": { _id: "u-vendor", role: "VENDOR", isActive: true, approvalStatus: "approved", fullName: "V", email: "v@x.com" },
  "u-admin": { _id: "u-admin", role: "ADMIN", isActive: true, approvalStatus: "approved", fullName: "A", email: "a@x.com" },
  "u-user": { _id: "u-user", role: "USER", isActive: true, approvalStatus: "approved", fullName: "U", email: "u@x.com" },
};
User.findById = async (id) => fakeUsers[id] || null;

const tokenFor = (id, role) => jwt.sign({ userId: id, role }, process.env.JWT_SECRET, { expiresIn: "1h" });

const app = require("../app");

const request = (port, path, token) =>
  new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "127.0.0.1", port, path, method: "GET", headers: token ? { Authorization: `Bearer ${token}` } : {} },
      (res) => {
        let body = "";
        res.on("data", (c) => { body += c; });
        res.on("end", () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
          catch (e) { resolve({ status: res.statusCode, body }); }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });

let passed = 0;
let failed = 0;
const test = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message}`);
  }
};

const server = http.createServer(app);

server.listen(0, "127.0.0.1", async () => {
  const port = server.address().port;
  const base = `/api/vendor/fraud-reports`;

  console.log("\nFraud Reports API — integration tests\n");

  await test("unauthenticated request is rejected (401)", async () => {
    const res = await request(port, base);
    assert.strictEqual(res.status, 401);
  });

  await test("ordinary USER role is rejected (403)", async () => {
    const res = await request(port, base, tokenFor("u-user", "USER"));
    assert.strictEqual(res.status, 403);
  });

  await test("VENDOR can access the list", async () => {
    const res = await request(port, base, tokenFor("u-vendor", "VENDOR"));
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.reports.length, 10, "page 1 shows 10 reports");
    assert.strictEqual(res.body.data.pagination.total, 23);
    assert.strictEqual(res.body.data.pagination.pages, 3);
    assert.strictEqual(res.body.data.pagination.limit, 10);
  });

  await test("ADMIN can access the list too", async () => {
    const res = await request(port, base, tokenFor("u-admin", "ADMIN"));
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.pagination.total, 23);
  });

  await test("page 2 and page 3 paginate correctly (prev/next math)", async () => {
    const p2 = await request(port, `${base}?page=2`, tokenFor("u-vendor", "VENDOR"));
    assert.strictEqual(p2.status, 200);
    assert.strictEqual(p2.body.data.reports.length, 10);
    assert.strictEqual(p2.body.data.pagination.page, 2);
    const p3 = await request(port, `${base}?page=3`, tokenFor("u-vendor", "VENDOR"));
    assert.strictEqual(p3.body.data.reports.length, 3);
    assert.strictEqual(p3.body.data.pagination.page, 3);
    const ids = new Set();
    [p2, p3].forEach((p) => p.body.data.reports.forEach((r) => ids.add(r.reportId)));
    assert.strictEqual(ids.size, 13, "pages 2+3 contain 13 distinct reports");
  });

  await test("search by reported number (formatted) finds the report", async () => {
    const res = await request(port, `${base}?search=${encodeURIComponent("98765 43210")}`, tokenFor("u-vendor", "VENDOR"));
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.search.type, "number");
    assert.strictEqual(res.body.data.pagination.total, 1);
    assert.strictEqual(res.body.data.reports[0].contactName, "Rahul Sharma");
    assert.strictEqual(res.body.data.reports[0].designation, "Manager");
    assert.strictEqual(res.body.data.reports[0].contactNumber, "+91 98765-43210");
  });

  await test("same number with different formatting also matches", async () => {
    for (const q of ["9876543210", "09876543210", "(+91) 98765 43210"]) {
      const res = await request(port, `${base}?search=${encodeURIComponent(q)}`, tokenFor("u-vendor", "VENDOR"));
      assert.strictEqual(res.body.data.pagination.total, 1, `query "${q}" should match exactly one report`);
    }
  });

  await test("number not in any fraud report → empty result (not an error)", async () => {
    const res = await request(port, `${base}?search=${encodeURIComponent("9112223334")}`, tokenFor("u-vendor", "VENDOR"));
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.pagination.total, 0);
    assert.deepStrictEqual(res.body.data.reports, []);
    assert.strictEqual(res.body.data.search.type, "number");
  });

  await test("search by reported name (case-insensitive, partial)", async () => {
    const res = await request(port, `${base}?search=${encodeURIComponent("RAHUL")}`, tokenFor("u-vendor", "VENDOR"));
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.search.type, "name");
    assert.strictEqual(res.body.data.pagination.total, 1);
    assert.strictEqual(res.body.data.reports[0].contactName, "Rahul Sharma");
  });

  await test("name not in any fraud report → empty result", async () => {
    const res = await request(port, `${base}?search=${encodeURIComponent("Amitabh Bachchan")}`, tokenFor("u-vendor", "VENDOR"));
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.pagination.total, 0);
    assert.deepStrictEqual(res.body.data.reports, []);
  });

  await test("search scans records beyond page 1 (report #17 of 23)", async () => {
    const res = await request(port, `${base}?search=${encodeURIComponent("Contact 20")}`, tokenFor("u-vendor", "VENDOR"));
    assert.strictEqual(res.body.data.pagination.total, 1);
    assert.strictEqual(res.body.data.reports[0].contactName, "Contact 20");
  });

  await test("search + pagination operate on the filtered set", async () => {
    const res = await request(port, `${base}?search=${encodeURIComponent("Contact")}&page=2`, tokenFor("u-vendor", "VENDOR"));
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.pagination.total, 22, "22 name matches total");
    assert.strictEqual(res.body.data.pagination.pages, 3);
    assert.strictEqual(res.body.data.reports.length, 10);
  });

  await test("clearing the search restores the full authorized list", async () => {
    const res = await request(port, `${base}?search=`, tokenFor("u-vendor", "VENDOR"));
    assert.strictEqual(res.body.data.pagination.total, 23);
  });

  await test("controller failure yields an error response, never a false 'not on list'", async () => {
    const original = Business.find;
    Business.find = () => ({ select: () => ({ sort: () => ({ lean: () => Promise.reject(new Error("boom")) }) }) });
    const res = await request(port, base, tokenFor("u-vendor", "VENDOR"));
    Business.find = original;
    assert.strictEqual(res.status, 500);
    assert.strictEqual(res.body.success, false);
    assert.ok(!/not on the fraud list/i.test(JSON.stringify(res.body)));
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  server.close();
  process.exit(failed > 0 ? 1 : 0);
});
