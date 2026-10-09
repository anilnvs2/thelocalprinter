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

// --- Vendor Signup + Login + Dashboard ---
test("Vendor signup creates account", async () => {
  const res = await request("POST", "/api/auth/signup", {
    fullName: "Print Pro Vendor",
    email: "printpro@test.com",
    password: "Vendor@123",
    role: "VENDOR",
  });
  assert(res.status === 201, "status 201");
  assert(res.body.data.user.role === "VENDOR", "role is VENDOR");
  global.vendorToken = res.body.data.token;
});

test("Vendor login returns token and correct role", async () => {
  const res = await request("POST", "/api/auth/login", {
    email: "printpro@test.com",
    password: "Vendor@123",
  });
  assert(res.status === 200, "status 200");
  assert(res.body.data.user.role === "VENDOR", "role is VENDOR");
  assert(res.body.data.token, "token present");
  global.vendorToken = res.body.data.token;
});

test("Vendor can access own profile via /me", async () => {
  const res = await request("GET", "/api/auth/me", null, global.vendorToken);
  assert(res.status === 200, "status 200");
  assert(res.body.data.user.email === "printpro@test.com", "correct user");
});

// --- User Signup + Login + Dashboard ---
test("User signup creates account", async () => {
  const res = await request("POST", "/api/auth/signup", {
    fullName: "Local Shopper",
    email: "shopper@test.com",
    password: "User@123456",
    role: "USER",
    whatsappNumber: "9876543210",
  });
  assert(res.status === 201, "status 201");
  assert(res.body.data.user.role === "USER", "role is USER");
  global.userToken = res.body.data.token;
});

test("User login returns token and correct role", async () => {
  const res = await request("POST", "/api/auth/login", {
    email: "shopper@test.com",
    password: "User@123456",
  });
  assert(res.status === 200, "status 200");
  assert(res.body.data.user.role === "USER", "role is USER");
  global.userToken = res.body.data.token;
});

test("User can access own profile via /me", async () => {
  const res = await request("GET", "/api/auth/me", null, global.userToken);
  assert(res.status === 200, "status 200");
  assert(res.body.data.user.email === "shopper@test.com", "correct user");
});

// --- Admin Login + Dashboard ---
test("Admin login returns token and ADMIN role", async () => {
  const res = await request("POST", "/api/auth/login", {
    email: "admin@localprinter.com",
    password: "Admin@123456",
  });
  assert(res.status === 200, "status 200");
  assert(res.body.data.user.role === "ADMIN", "role is ADMIN");
  global.adminToken = res.body.data.token;
});

test("Admin can access own profile via /me", async () => {
  const res = await request("GET", "/api/auth/me", null, global.adminToken);
  assert(res.status === 200, "status 200");
  assert(res.body.data.user.role === "ADMIN", "role is ADMIN");
});

// --- Error Cases ---
test("Wrong password returns 401", async () => {
  const res = await request("POST", "/api/auth/login", {
    email: "printpro@test.com",
    password: "WrongPassword123",
  });
  assert(res.status === 401, "status 401");
  assert(res.body.success === false, "success false");
});

test("Duplicate email signup returns 409", async () => {
  const res = await request("POST", "/api/auth/signup", {
    fullName: "Duplicate Vendor",
    email: "printpro@test.com",
    password: "Vendor@123",
    role: "VENDOR",
  });
  assert(res.status === 409, "status 409");
  assert(res.body.success === false, "success false");
});

test("Admin signup blocked via public endpoint", async () => {
  const res = await request("POST", "/api/auth/signup", {
    fullName: "Fake Admin",
    email: "fakeadmin@test.com",
    password: "Admin@123",
    role: "ADMIN",
  });
  assert(res.status === 400, "status 400");
  assert(res.body.success === false, "success false");
});

test("Missing fields returns 400", async () => {
  const res = await request("POST", "/api/auth/signup", {
    email: "incomplete@test.com",
  });
  assert(res.status === 400, "status 400");
});

// --- Role-based access control via JWT ---
test("Vendor token has VENDOR role, not ADMIN", async () => {
  const decoded = JSON.parse(
    Buffer.from(global.vendorToken.split(".")[1], "base64").toString()
  );
  assert(decoded.role === "VENDOR", "token role is VENDOR");
  assert(decoded.role !== "ADMIN", "not ADMIN");
  assert(decoded.userId, "userId present in token");
});

test("User token has USER role, not VENDOR", async () => {
  const decoded = JSON.parse(
    Buffer.from(global.userToken.split(".")[1], "base64").toString()
  );
  assert(decoded.role === "USER", "token role is USER");
  assert(decoded.role !== "VENDOR", "not VENDOR");
});

test("Admin token has ADMIN role", async () => {
  const decoded = JSON.parse(
    Buffer.from(global.adminToken.split(".")[1], "base64").toString()
  );
  assert(decoded.role === "ADMIN", "token role is ADMIN");
});

test("GET /me without token returns 401", async () => {
  const res = await request("GET", "/api/auth/me");
  assert(res.status === 401, "status 401");
});

test("GET /me with invalid token returns 401", async () => {
  const res = await request("GET", "/api/auth/me", null, "invalid.token.here");
  assert(res.status === 401, "status 401");
});

// --- passwordHash never exposed ---
test("passwordHash never returned in signup response", async () => {
  const res = await request("POST", "/api/auth/signup", {
    fullName: "Hash Check",
    email: "hashcheck@test.com",
    password: "Hash@12345",
    role: "USER",
    whatsappNumber: "9876543210",
  });
  assert(res.status === 201, "status 201");
  assert(!res.body.data.user.passwordHash, "passwordHash not in response");
});

test("passwordHash never returned in login response", async () => {
  const res = await request("POST", "/api/auth/login", {
    email: "admin@localprinter.com",
    password: "Admin@123456",
  });
  assert(!res.body.data.user.passwordHash, "passwordHash not in response");
});

test("passwordHash never returned in /me response", async () => {
  const res = await request("GET", "/api/auth/me", null, global.adminToken);
  assert(!res.body.data.user.passwordHash, "passwordHash not in response");
});

// --- Run ---
const run = async () => {
  console.log("\n--- E2E Auth Tests ---\n");
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
