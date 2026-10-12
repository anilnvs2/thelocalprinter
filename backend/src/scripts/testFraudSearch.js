// Standalone verification for the Fraud / Hotlist Report search logic.
// Run with: node src/scripts/testFraudSearch.js
const assert = require("assert");
const {
  canonicalPhone,
  phoneMatches,
  nameMatches,
  matchesSearch,
  classifyQuery,
  flattenFraudEntries,
  filterFraudEntries,
  paginateFraudEntries,
} = require("../utils/fraudSearch");

let passed = 0;
let failed = 0;
const test = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message}`);
  }
};

const businesses = [];
for (let i = 1; i <= 50; i += 1) {
  businesses.push({
    _id: `biz${i}`,
    name: `Business ${i}`,
    createdAt: new Date(2026, 0, i),
    fraudReport: [
      {
        contactName: i === 25 ? "Rahul Sharma" : `Contact ${i}`,
        designation: i === 25 ? "Manager" : `Role ${i}`,
        contactNumber: i === 25 ? "+91 98765-43210" : `98765432${String(i).padStart(2, "0")}`,
      },
    ],
  });
}
// A business with no fraud report must never appear in the dataset.
businesses.push({ _id: "bizClean", name: "Clean Business", fraudReport: [] });

const allEntries = flattenFraudEntries(businesses);

console.log("\nFraud Report Search — logic tests\n");

// 1. Existing reported number found within the Fraud Report list
test("existing reported number is found (with formatting differences)", () => {
  const matches = filterFraudEntries(allEntries, "98765 43210");
  assert.ok(matches.some((e) => e.contactName === "Rahul Sharma"));
});

// 7. Phone formatting differences handled (+91, spaces, hyphens, parens, leading 0)
test("canonicalPhone ignores +91, spaces, hyphens, parentheses, leading 0", () => {
  assert.strictEqual(canonicalPhone("+91 98765 43210"), "9876543210");
  assert.strictEqual(canonicalPhone("(0) 98765-43210"), "9876543210");
  assert.strictEqual(canonicalPhone("09876543210"), "9876543210");
  assert.strictEqual(canonicalPhone("98765.43210"), "9876543210");
});

test("number formatting variants all match the same report", () => {
  assert.ok(phoneMatches("+91 98765-43210", "9876543210"));
  assert.ok(phoneMatches("9876543210", "(+91) 98765 43210"));
  assert.ok(phoneMatches("0-98765-43210", "+91 9876543210"));
});

// 3. Number absent from all Fraud Report entries → not on list
test("number absent from all fraud reports does not match", () => {
  assert.strictEqual(phoneMatches("911222333444", "9876543210"), false);
  assert.strictEqual(filterFraudEntries(allEntries, "911222333444").length, 0);
});

// Unrelated numbers sharing a few digits must NOT match
test("unrelated numbers sharing a few digits do not match", () => {
  assert.strictEqual(phoneMatches("9876500000", "9876543210"), false);
  assert.strictEqual(phoneMatches("12345", "1234567890"), false);
  assert.strictEqual(phoneMatches("987654321", "9876543210"), false, "partial shorter number must not exact-match");
});

test("partial tail match works once 6+ digits are typed", () => {
  assert.strictEqual(phoneMatches("9876543210", "6543210"), true, "7-digit tail should match");
  assert.strictEqual(phoneMatches("9876543210", "43210"), false, "5-digit tail must not match");
});

// 4. Existing reported contact name found
test("existing reported contact name is found", () => {
  const matches = filterFraudEntries(allEntries, "Rahul Sharma");
  assert.ok(matches.some((e) => e.contactName === "Rahul Sharma"));
});

test("partial name filtering works", () => {
  const matches = filterFraudEntries(allEntries, "rahul");
  assert.ok(matches.some((e) => e.contactName === "Rahul Sharma"));
});

// 6. Name matching is case-insensitive
test("name matching is case-insensitive", () => {
  assert.ok(nameMatches("Rahul Sharma", "RAHUL sharma"));
  assert.ok(nameMatches("Rahul Sharma", "  rahul  "));
  assert.strictEqual(nameMatches("Rahul Sharma", "rahulK"), false);
});

// 5. Name that exists elsewhere (users/vendors) but not in fraud reports
test("name absent from fraud reports does not match", () => {
  assert.strictEqual(filterFraudEntries(allEntries, "Amitabh Bachchan").length, 0);
});

// 2. Number that exists in a normal user/business record but not in fraud reports
test("business phone of a clean business is never treated as a fraud hit", () => {
  const cleanNumbers = ["9820012345", "9876500001"];
  cleanNumbers.forEach((n) => {
    const matches = filterFraudEntries(allEntries, n);
    assert.ok(!matches.some((e) => e.businessId === "bizClean"));
  });
});

// 8. Searching works across all fraud reports, including records beyond the first 10
test("search scans all 50 reports, not just the first page", () => {
  const page1 = paginateFraudEntries(allEntries, 1, 10);
  assert.strictEqual(page1.items.length, 10);
  const deepEntry = allEntries[40]; // far beyond the first 10 rows
  const matches = filterFraudEntries(allEntries, deepEntry.contactName);
  assert.ok(matches.some((e) => e.reportId === deepEntry.reportId), "deep record must be searchable");
});

// 9. Pagination: 10 per page, totals and prev/next math
test("pagination caps at 10 per page with correct totals", () => {
  const { pagination } = paginateFraudEntries(allEntries, 1, 50);
  assert.strictEqual(pagination.limit, 10);
  assert.strictEqual(pagination.total, allEntries.length);
  assert.strictEqual(pagination.pages, Math.ceil(allEntries.length / 10));
  assert.strictEqual(pagination.page, 1);
});

test("pagination resets/clamps out-of-range pages", () => {
  const p2 = paginateFraudEntries(allEntries, 2, 10);
  assert.strictEqual(p2.pagination.page, 2);
  assert.strictEqual(p2.items.length, 10);
  const pLast = paginateFraudEntries(allEntries, 99, 10);
  assert.strictEqual(pLast.pagination.page, pLast.pagination.pages);
  const p0 = paginateFraudEntries(allEntries, 0, 10);
  assert.strictEqual(p0.pagination.page, 1);
});

test("search filters first, then paginates the matching result set", () => {
  const filtered = filterFraudEntries(allEntries, "Contact 1");
  const { items, pagination } = paginateFraudEntries(filtered, 1, 10);
  assert.strictEqual(pagination.total, filtered.length);
  assert.ok(items.length <= 10);
});

test("empty search returns the complete authorized list", () => {
  assert.strictEqual(filterFraudEntries(allEntries, "").length, allEntries.length);
  assert.strictEqual(filterFraudEntries(allEntries, "   ").length, allEntries.length);
});

// 11. Query classification drives the correct user-facing message
test("classifyQuery distinguishes number vs name queries", () => {
  assert.strictEqual(classifyQuery("98765 43210"), "number");
  assert.strictEqual(classifyQuery("+91-98765-43210"), "number");
  assert.strictEqual(classifyQuery("Rahul Sharma"), "name");
  assert.strictEqual(classifyQuery(""), null);
});

// Blank / malformed entries are dropped from the dataset
test("blank fraud entries are excluded from the searchable dataset", () => {
  const entries = flattenFraudEntries([
    { _id: "b1", name: "B", createdAt: new Date(), fraudReport: [{ contactName: "", designation: "", contactNumber: "" }] },
  ]);
  assert.strictEqual(entries.length, 0);
});

// Legacy single-object fraudReport shape is still flattened
test("legacy single-object fraudReport shape is supported", () => {
  const entries = flattenFraudEntries([
    { _id: "b2", name: "B2", createdAt: new Date(), fraudReport: { contactName: "Old Style", designation: "", contactNumber: "9999999999" } },
  ]);
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].contactName, "Old Style");
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
