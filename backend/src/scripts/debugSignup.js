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

const run = async () => {
  console.log("\n--- Signup Debug ---\n");
  const res = await request("POST", "/api/auth/signup", {
    fullName: "Debug User",
    email: "debug@test.com",
    password: "Debug@123",
    role: "USER",
    whatsappNumber: "9876543210",
  });
  console.log("Status:", res.status);
  console.log("Body:", JSON.stringify(res.body, null, 2));
  process.exit(0);
};

run();
