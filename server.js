// server.js (Render)
// ============================
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());
app.use(cors());

// ------------------------
// Submissions storage (keep last 20, only return last 3 on GET)
let submissions = [];

// ------------------------
// Routes

// GET last 3 submissions
app.get("/submissions", (req, res) => {
  const lastThree = submissions.slice(-3);
  res.json(lastThree);
});

// PATCH verified status
app.patch("/submissions/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const { verified } = req.body;
  const sub = submissions.find(s => s.id === id);
  if (!sub) return res.status(404).json({ error: "Submission not found" });
  sub.verified = !!verified;
  res.json(sub);
});

// POST new submission from local bot
app.post("/submissions", (req, res) => {
  const { conversion, price, stock, image } = req.body;
  if (!conversion || !price || !stock || !image) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const newSub = {
    id: submissions.length + 1, // simple incremental ID
    conversion,
    price,
    stock,
    image,
    verified: false,
    timestamp: Date.now(),
  };

  submissions.push(newSub);
  if (submissions.length > 20) submissions.shift(); // keep last 20

  console.log(`🆕 New submission #${newSub.id}: ${conversion}`);
  res.json(newSub);
});

// ------------------------
// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));
