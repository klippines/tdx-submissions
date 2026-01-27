// server.js
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Client, GatewayIntentBits, Partials } = require("discord.js");

console.log("🟢 Booting server...");

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
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
  ]
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

console.log("🔑 ENV CHECK:", {
  hasToken: !!DISCORD_TOKEN,
  channelId: CHANNEL_ID
});

// --- Bot ready ---
client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log("📡 Listening for messages in channel:", CHANNEL_ID);
});

// --- Message create handler ---
client.on("messageCreate", msg => {
  console.log("📩 messageCreate fired");

  if (msg.author.bot) {
    console.log("↪ Ignored bot message");
    return;
  }

  console.log("📍 Channel:", msg.channel.id);
  console.log("📝 Content:", msg.content);
  console.log("🖼 Attachments:", msg.attachments.size);

  if (msg.channel.id !== CHANNEL_ID) {
    console.log("↪ Wrong channel");
    return;
  }

  if (!msg.attachments.size) {
    console.log("↪ No attachments");
    return;
  }

  const lines = msg.content.split("\n");

  const conversion = lines.find(l => l.toLowerCase().startsWith("conversion:"))?.split(":")[1]?.trim();
  const price = lines.find(l => l.toLowerCase().startsWith("price:"))?.split(":")[1]?.trim();
  const stock = lines.find(l => l.toLowerCase().startsWith("stock:"))?.split(":")[1]?.trim();

  console.log("🔎 Parsed:", { conversion, price, stock });

  if (!conversion || !price || !stock) {
    console.log("❌ Missing required fields, submission ignored");
    return;
  }

  const submission = {
    id: submissions.length + 1,
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

  console.log("✅ Submission added:", submission);
});

// --- Reaction add handler ---
client.on("messageReactionAdd", (reaction, user) => {
  console.log("⭐ Reaction added");

  if (user.bot) return;
  if (reaction.message.channel.id !== CHANNEL_ID) return;

  if (reaction.emoji.name === '✅') {
    const sub = submissions.find(s => s.messageId === reaction.message.id);
    if (!sub) {
      console.log("❌ No submission found for reaction");
      return;
    }

    sub.verified = true;
    console.log(`✅ Submission ${sub.id} verified`);
  }
});

// --- Login Discord bot ---
client.login(DISCORD_TOKEN).catch(err => {
  console.error("❌ Discord login failed:", err);
});

// --- GET last 3 submissions ---
app.get("/submissions", (req, res) => {
  console.log("🌐 /submissions requested");
  res.json(submissions.slice(-3));
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
