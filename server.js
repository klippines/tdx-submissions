// server.js
// ================================
// TDX Submissions Server + Discord Bot
// ================================

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Client, GatewayIntentBits, Partials } = require("discord.js");

const app = express();
app.use(bodyParser.json());
app.use(cors());

// ------------------------
// Environment variables
// ------------------------
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

// --- Diagnostic check ---
console.log("🔑 ENV CHECK:", { hasToken: !!DISCORD_TOKEN, channelId: CHANNEL_ID });
if (!DISCORD_TOKEN) console.error("❌ DISCORD_TOKEN is missing!");
if (!CHANNEL_ID) console.error("❌ CHANNEL_ID is missing!");

// ------------------------
// Submissions storage
// ------------------------
let submissions = [];

// ------------------------
// Discord bot
// ------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

console.log("🔌 Attempting Discord login...");
client.login(DISCORD_TOKEN)
  .then(bot => console.log(`✅ Logged in as ${bot.user.tag}`))
  .catch(err => console.error("❌ Failed to login:", err));

client.on("ready", () => {
  console.log(`🚀 Discord bot ready. Logged in as ${client.user.tag}`);
});

// ------------------------
// Handle new messages
// ------------------------
client.on("messageCreate", msg => {
  if (!client.isReady()) return; // safety
  if (msg.channel.id !== CHANNEL_ID) return;
  if (!msg.attachments.size) return;

  const lines = msg.content.split("\n");
  const conversion = lines.find(l => l.toLowerCase().startsWith("conversion:"))?.split(":")[1]?.trim();
  const price = lines.find(l => l.toLowerCase().startsWith("price:"))?.split(":")[1]?.trim();
  const stock = lines.find(l => l.toLowerCase().startsWith("stock:"))?.split(":")[1]?.trim();

  if (!conversion || !price || !stock) return;

  submissions.push({
    id: submissions.length + 1,
    messageId: msg.id,
    conversion,
    price,
    stock,
    image: msg.attachments.first().url,
    verified: false,
    timestamp: Date.now(),
  });

  if (submissions.length > 20) submissions.shift(); // keep last 20

  console.log(`🆕 New submission #${submissions.length}: ${conversion}`);
});

// ------------------------
// Reaction handling
// ------------------------
client.on("messageReactionAdd", (reaction, user) => {
  if (!client.isReady()) return;
  if (reaction.message.channel.id !== CHANNEL_ID) return;
  if (user.bot) return;

  if (reaction.emoji.name === '✅') {
    const sub = submissions.find(s => s.messageId === reaction.message.id);
    if (!sub) return;
    sub.verified = true;
    console.log(`✅ Submission ${sub.id} verified by ${user.username}`);
  }
});

client.on("messageReactionRemove", (reaction, user) => {
  if (!client.isReady()) return;
  if (reaction.message.channel.id !== CHANNEL_ID) return;
  if (user.bot) return;

  if (reaction.emoji.name === '✅') {
    const sub = submissions.find(s => s.messageId === reaction.message.id);
    if (!sub) return;
    sub.verified = false;
    console.log(`❌ Submission ${sub.id} unverified by ${user.username}`);
  }
});

// ------------------------
// Express routes
// ------------------------
app.get("/submissions", (req, res) => {
  const lastThree = submissions.slice(-3);
  res.json(lastThree);
});

app.patch("/submissions/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const { verified } = req.body;
  const sub = submissions.find(s => s.id === id);
  if (!sub) return res.status(404).json({ error: "Submission not found" });
  sub.verified = !!verified;
  res.json(sub);
});

// ------------------------
// Start server
// ------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));
