const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// ✅ HOME ROUTE (TEST THIS)
app.get("/", (req, res) => {
  res.send("🚀 TrustLayer Backend LIVE");
});

// ✅ TEST ROUTE
app.get("/test", (req, res) => {
  res.send("Test route working");
});

// ✅ WEBHOOK (POST)
app.post("/webhook", (req, res) => {
  const msg = req.body.Body || "";

  let reply = "Hello from TrustLayer";

  res.set("Content-Type", "text/xml");
  res.send(`<Response><Message>${reply}</Message></Response>`);
});

// START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});