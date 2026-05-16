const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const DATA_FILE = "./data.json";

// Load DB
function loadData() {
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

// Save DB
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Calculate Trust Score
function calculateScore(user, transactions) {
  let identity = user.verified ? 20 : 10;

  let userTx = transactions.filter(t => t.sellerId === user.id);
  let total = userTx.length;
  let success = userTx.filter(t => t.status === "confirmed").length;
  let failed = userTx.filter(t => t.status === "problem").length;

  let reliability = total === 0 ? 20 : Math.max(0, Math.round((success / total) * 40 - failed * 2));

  let consistency = total > 5 ? 20 : 10;

  let confirmation = success * 2;
  if (confirmation > 15) confirmation = 15;

  let score = identity + reliability + consistency + confirmation;
  if (!user.verified && score > 60) score = 60;

  return Math.min(score, 100);
}

// WhatsApp Webhook
app.post("/webhook", (req, res) => {
  const msg = req.body.Body.toLowerCase();
  const from = req.body.From;

  let data = loadData();

  let user = data.users.find(u => u.phone === from);

  let reply = "";

  // NEW USER
  if (!user) {
    if (msg.includes("hi")) {
      reply = `Welcome to TRUSTLAYER 🤝

Are you:
1. Seller
2. Customer`;
    } else if (msg === "1") {
      let newUser = {
        id: uuidv4(),
        phone: from,
        role: "seller",
        name: "",
        location: "",
        verified: false
      };
      data.users.push(newUser);
      saveData(data);

      reply = "What is your business name?";
    } else {
      reply = "Please type Hi to start.";
    }

  } else {
    // EXISTING USER FLOW

    // NAME SET
    if (user.role === "seller" && !user.name) {
      user.name = req.body.Body;
      saveData(data);
      reply = "Where are you located?";
    }

    // LOCATION SET
    else if (!user.location) {
      user.location = req.body.Body;
      saveData(data);
      reply = "Upload ID or type VERIFY to simulate verification.";
    }

    // VERIFY
    else if (!user.verified && msg.includes("verify")) {
      user.verified = true;
      saveData(data);

      reply = `✅ Verified!

Your Trust Profile:
https://trustlayer.app/u/${user.id}`;
    }

    // RECORD SALE
    else if (msg.includes("record")) {
      reply = "Enter customer phone number:";
      user.awaitingCustomer = true;
      saveData(data);
    }

    // SAVE CUSTOMER NUMBER
    else if (user.awaitingCustomer) {
      let tx = {
        id: uuidv4(),
        sellerId: user.id,
        customerPhone: req.body.Body,
        status: "pending"
      };
      data.transactions.push(tx);
      user.awaitingCustomer = false;
      saveData(data);

      reply = "Transaction recorded ✅";
    }

    // DEFAULT
    else {
      let score = calculateScore(user, data.transactions);
      reply = `Trust Score: ${score}/100

Type 'record' to log a sale.`;
    }
  }

  res.set("Content-Type", "text/xml");
  res.send(`<Response><Message>${reply}</Message></Response>`);
});

// START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
app.get("/", (req, res) => {
  res.send("✅ TrustLayer Backend is running");
});
app.get("/webhook", (req, res) => {
  res.send("Webhook endpoint is live. Use POST for WhatsApp.");
});