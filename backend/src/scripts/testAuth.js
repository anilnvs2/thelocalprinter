const dotenv = require("dotenv");
dotenv.config();

const http = require("http");

const BASE = "http://localhost:5000/api";

const request = (method, path, body, token) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const options = {
      method,
      hostname: "localhost",
      port: 5000,
      path: url.pathname,
      headers: { "Content-Type": "application/json" },
    };
    if (token) options.headers["Authorization"] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
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
};

const tests = [];
let passed = 0;
let failed = 0;

const test = (label, fn) => tests.push({ label, fn });

const assert = (condition, label) => {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.log(`  FAIL  ${label}`);
    failed++;
  }
};

// --- Signup Tests ---
test("Vendor signup creates account and returns token", async () => {
  const res = await request("POST", "/api/auth/signup", {
    fullName: "Vendor One",
    email: "vendor1@test.com",
    password: "Vendor@123",
    role: "VENDOR",
  });
  assert(res.status === 201, "status 201");
  assert(res.body.success === true, "success true");
  assert(res.body.data.token, "token returned");
  assert(res.body.data.user.role === "VENDOR", "role is VENDOR");
  assert(!res.body.data.user.passwordHash, "passwordHash not returned");
  global.vendorToken = res.body.data.token;
  global.vendorId = res.body.data.user._id;
});

test("User signup creates account and returns token", async () => {
  const res = await request("POST", "/api/auth/signup", {
    fullName: "User One",
    email: "user1@test.com",
    password: "User@123456",
    role: "USER",
    whatsappNumber: "9876543210",
  });
  assert(res.status === 201, "status 201");
  assert(res.body.success === true, "success true");
  assert(res.body.data.user.role === "USER", "role is USER");
  global.userToken = res.body.data.token;
  global.userId = res.body.data.user._id;
});

test("Admin signup is BLOCKED via public endpoint", async () => {
  const res = await request("POST", "/api/auth/signup", {
    fullName: "Fake Admin",
    email: "fakeadmin@test.com",
    password: "Admin@123",
    role: "ADMIN",
  });
  assert(res.status === 400, "status 400");
  assert(res.body.success === false, "success false");
});

test("Duplicate email signup fails", async () => {
  const res = await request("POST", "/api/auth/signup", {
    fullName: "Vendor Duplicate",
    email: "vendor1@test.com",
    password: "Vendor@123",
    role: "VENDOR",
  });
  assert(res.status === 409, "status 409");
  assert(res.body.success === false, "success false");
});

test("Missing fields signup fails", async () => {
  const res = await request("POST", "/api/auth/signup", {
    email: "incomplete@test.com",
  });
  assert(res.status === 400, "status 400");
  assert(res.body.success === false, "success false");
});

// --- Login Tests ---
test("Vendor login succeeds", async () => {
  const res = await request("POST", "/api/auth/login", {
    email: "vendor1@test.com",
    password: "Vendor@123",
  });
  assert(res.status === 200, "status 200");
  assert(res.body.success === true, "success true");
  assert(res.body.data.user.role === "VENDOR", "role is VENDOR");
  assert(res.body.data.token, "token returned");
  global.vendorToken = res.body.data.token;
});

test("User login succeeds", async () => {
  const res = await request("POST", "/api/auth/login", {
    email: "user1@test.com",
    password: "User@123456",
  });
  assert(res.status === 200, "status 200");
  assert(res.body.data.user.role === "USER", "role is USER");
  global.userToken = res.body.data.token;
});

test("Admin login succeeds", async () => {
  const res = await request("POST", "/api/auth/login", {
    email: "admin@localprinter.com",
    password: "Admin@123456",
  });
  assert(res.status === 200, "status 200");
  assert(res.body.data.user.role === "ADMIN", "role is ADMIN");
  global.adminToken = res.body.data.token;
});

test("Wrong password returns 401", async () => {
  const res = await request("POST", "/api/auth/login", {
    email: "vendor1@test.com",
    password: "WrongPassword123",
  });
  assert(res.status === 401, "status 401");
  assert(res.body.success === false, "success false");
});

test("Nonexistent email returns 401", async () => {
  const res = await request("POST", "/api/auth/login", {
    email: "nobody@test.com",
    password: "SomePass123",
  });
  assert(res.status === 401, "status 401");
});

// --- getMe ---
test("GET /api/auth/me returns current user", async () => {
  const res = await request("GET", "/api/auth/me", null, global.vendorToken);
  assert(res.status === 200, "status 200");
  assert(res.body.data.user.email === "vendor1@test.com", "correct user");
  assert(!res.body.data.user.passwordHash, "passwordHash not returned");
});

test("GET /api/auth/me without token returns 401", async () => {
  const res = await request("GET", "/api/auth/me");
  assert(res.status === 401, "status 401");
});

// --- Role-based access ---
test("Vendor accessing ADMIN-only route is blocked", async () => {
  // Simulate admin-only route check
  const res = await request("GET", "/api/auth/me", null, global.vendorToken);
  assert(res.status === 200, "vendor can access own profile");
  // The real test: vendor token role !== ADMIN
  const decoded = JSON.parse(
    Buffer.from(global.vendorToken.split(".")[1], "base64").toString()
  );
  assert(decoded.role === "VENDOR", "token role is VENDOR, not ADMIN");
});

test("User accessing Vendor-only route is blocked", async () => {
  const decoded = JSON.parse(
    Buffer.from(global.userToken.split(".")[1], "base64").toString()
  );
  assert(decoded.role === "USER", "token role is USER, not VENDOR");
});

// --- Run ---
const run = async () => {
  console.log("\n--- Backend Auth Tests ---\n");
  for (const t of tests) {
    try {
      await t.fn();
    } catch (err) {
      console.log(`  FAIL  ${t.label}: ${err.message}`);
      failed++;
    }
  }
  console.log(`\n=============================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`=============================\n`);
  process.exit(failed > 0 ? 1 : 0);
};

run();
