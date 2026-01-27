// server.js - Local bot + submissions server
const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// ----- Shared submissions array -----
let submissions = []; // This array will also be updated by your local bot

// --- GET last 3 submissions ---
app.get("/submissions", (req, res) => {
  const lastThree = submissions.slice(-3);
  res.json(lastThree);
});

// --- PATCH verified status ---
app.patch("/submissions/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const { verified } = req.body;

  const sub = submissions.find(s => s.id === id);
  if (!sub) {
    return res.status(404).json({ error: "Submission not found" });
  }

  sub.verified = !!verified;
  console.log(`Submission #${sub.id} set to ${sub.verified ? "Verified" : "Unverified"}`);
  res.json(sub);
});

// --- Start server ---
const PORT = 3000;
app.listen(PORT, () => console.log(`🌐 Submissions server running on port ${PORT}`));

module.exports = { submissions }; // export so your local bot can push into this array
