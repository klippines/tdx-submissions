// server.js
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Client, GatewayIntentBits } = require("discord.js");

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Store submissions in memory
let submissions = [];

// --- Discord bot ---
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ] 
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN; // set in Render
const CHANNEL_ID = process.env.CHANNEL_ID;       // set in Render

client.on("messageCreate", msg => {
  if (msg.channel.id !== CHANNEL_ID) return; // only this channel
  if (!msg.attachments.size) return; // require at least one image

  const lines = msg.content.split("\n");
  const conversion = lines.find(l => l.toLowerCase().startsWith("conversion:"))?.split(":")[1]?.trim();
  const price = lines.find(l => l.toLowerCase().startsWith("price:"))?.split(":")[1]?.trim();
  const stock = lines.find(l => l.toLowerCase().startsWith("stock:"))?.split(":")[1]?.trim();

  if (!conversion || !price || !stock) return; // ignore incomplete submissions

  submissions.push({
    id: submissions.length + 1,
    conversion,
    price,
    stock,
    image: msg.attachments.first().url,
    verified: false,
    timestamp: Date.now()
  });

  // keep last 20 submissions to avoid memory issues
  if (submissions.length > 20) submissions.shift();
});

client.login(DISCORD_TOKEN);

// --- GET last 3 submissions ---
app.get("/submissions", (req, res) => {
  const lastThree = submissions.slice(-3);
  res.json(lastThree);
});

// --- PATCH verified status ---
app.patch("/submissions/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const { verified } = req.body;

  const submission = submissions.find(s => s.id === id);
  if (!submission) return res.status(404).json({ error: "Submission not found" });

  submission.verified = !!verified;
  res.json(submission);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
