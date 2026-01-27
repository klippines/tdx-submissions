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
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: ['MESSAGE', 'CHANNEL', 'REACTION']
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

console.log("BOOTING BOT...");
console.log("CHANNEL_ID:", CHANNEL_ID ? "SET" : "MISSING");
console.log("DISCORD_TOKEN:", DISCORD_TOKEN ? "SET" : "MISSING");

// --- Discord ready ---
client.once("ready", () => {
  console.log(`BOT ONLINE as ${client.user.tag}`);
});

// --- Message create handler (WITH DIAGNOSTICS) ---
client.on("messageCreate", msg => {
  console.log("---- MESSAGE RECEIVED ----");
  console.log("Channel ID:", msg.channel.id);
  console.log("Expected Channel:", CHANNEL_ID);
  console.log("Author:", msg.author.tag);
  console.log("Is Bot:", msg.author.bot);
  console.log("Content:", msg.content || "[EMPTY]");
  console.log("Attachments:", msg.attachments.size);

  // Ignore bots
  if (msg.author.bot) {
    console.log("IGNORED: bot message");
    return;
  }

  // Channel check
  if (msg.channel.id !== CHANNEL_ID) {
    console.log("IGNORED: wrong channel");
    return;
  }

  // Attachment check
  if (!msg.attachments.size) {
    console.log("IGNORED: no attachments");
    return;
  }

  const lines = msg.content.split("\n");

  const conversion = lines.find(l => l.toLowerCase().startsWith("conversion:"))?.split(":")[1]?.trim();
  const price = lines.find(l => l.toLowerCase().startsWith("price:"))?.split(":")[1]?.trim();
  const stock = lines.find(l => l.toLowerCase().startsWith("stock:"))?.split(":")[1]?.trim();

  console.log("Parsed Fields:", { conversion, price, stock });

  if (!conversion || !price || !stock) {
    console.log("IGNORED: missing required fields");
    return;
  }

  const submission = {
    id: Date.now(), // safer unique ID
    messageId: msg.id,
    conversion,
    price,
    stock,
    image: msg.attachments.first().url,
    verified: false,
    timestamp: Date.now()
  };

  submissions.push(submission);
  if (submissions.length > 20) submissions.shift();

  console.log("✅ SUBMISSION ADDED:", submission);
});

// --- Reaction add ---
client.on('messageReactionAdd', (reaction, user) => {
  if (user.bot) return;
  if (reaction.message.channel.id !== CHANNEL_ID) return;

  if (reaction.emoji.name === '✅') {
    const sub = submissions.find(s => s.messageId === reaction.message.id);
    if (!sub) return;

    sub.verified = true;
    console.log(`✅ VERIFIED by ${user.username}`);
  }
});

// --- Reaction remove ---
client.on('messageReactionRemove', (reaction, user) => {
  if (user.bot) return;
  if (reaction.message.channel.id !== CHANNEL_ID) return;

  if (reaction.emoji.name === '✅') {
    const sub = submissions.find(s => s.messageId === reaction.message.id);
    if (!sub) return;

    sub.verified = false;
    console.log(`❌ UNVERIFIED by ${user.username}`);
  }
});

// --- Login ---
client.login(DISCORD_TOKEN).catch(err => {
  console.error("DISCORD LOGIN FAILED:", err);
});

// --- API ---
app.get("/submissions", (req, res) => {
  res.json(submissions.slice(-3));
});

app.patch("/submissions/:id", (req, res) => {
  const id = Number(req.params.id);
  const submission = submissions.find(s => s.id === id);
  if (!submission) return res.status(404).json({ error: "Not found" });

  submission.verified = !!req.body.verified;
  res.json(submission);
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
