// ===== CRASH + PROMISE DIAGNOSTICS (LINE 1) =====
process.on("unhandledRejection", err => {
  console.error("🔥 UNHANDLED PROMISE:", err);
});
process.on("uncaughtException", err => {
  console.error("💥 UNCAUGHT EXCEPTION:", err);
});

// ===== IMPORTS =====
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { 
  Client, 
  GatewayIntentBits, 
  Partials 
} = require("discord.js");

// ===== EXPRESS =====
const app = express();
app.use(bodyParser.json());
app.use(cors());

// ===== MEMORY STORE =====
let submissions = [];

// ===== ENV =====
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

console.log("🔑 ENV CHECK:", {
  hasToken: !!DISCORD_TOKEN,
  channelId: CHANNEL_ID
});

// ===== DISCORD CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
  ]
});

// ===== DISCORD LIFECYCLE LOGS =====
client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on("error", err => {
  console.error("❌ Discord client error:", err);
});

client.on("shardError", err => {
  console.error("❌ Shard error:", err);
});

// ===== MESSAGE HANDLER =====
client.on("messageCreate", msg => {
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
    timestamp: Date.now()
  });

  if (submissions.length > 20) submissions.shift();
  console.log(`📥 New submission: ${conversion}`);
});

// ===== REACTIONS =====
client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;

  if (reaction.partial) await reaction.fetch();

  if (reaction.message.channel.id !== CHANNEL_ID) return;
  if (reaction.emoji.name !== "✅") return;

  const sub = submissions.find(s => s.messageId === reaction.message.id);
  if (!sub) return;

  sub.verified = true;
  console.log(`✅ Verified by ${user.username}`);
});

client.on("messageReactionRemove", async (reaction, user) => {
  if (user.bot) return;

  if (reaction.partial) await reaction.fetch();

  if (reaction.message.channel.id !== CHANNEL_ID) return;
  if (reaction.emoji.name !== "✅") return;

  const sub = submissions.find(s => s.messageId === reaction.message.id);
  if (!sub) return;

  sub.verified = false;
  console.log(`❌ Unverified by ${user.username}`);
});

// ===== LOGIN =====
console.log("🔌 Attempting Discord login...");
client.login(DISCORD_TOKEN).catch(err => {
  console.error("🚫 LOGIN FAILED:", err);
});

// ===== API =====
app.get("/submissions", (req, res) => {
  res.json(submissions.slice(-3));
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
