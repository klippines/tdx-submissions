const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Client, GatewayIntentBits } = require("discord.js");

const app = express();
app.use(bodyParser.json());
app.use(cors());

let submissions = []; // stores submissions

// --- Discord bot ---
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ] 
});
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

client.on("messageCreate", msg => {
  if (msg.channel.id !== CHANNEL_ID) return;
  if (!msg.attachments.size) return;

  const content = msg.content.split("\n");
  let conversion = content.find(line => line.toLowerCase().startsWith("conversion:"))?.split(":")[1]?.trim();
  let price = content.find(line => line.toLowerCase().startsWith("price:"))?.split(":")[1]?.trim();
  let stock = content.find(line => line.toLowerCase().startsWith("stock:"))?.split(":")[1]?.trim();

  if (!conversion || !price || !stock) return;

  submissions.push({
    id: submissions.length + 1,
    conversion,
    price,
    stock,
    image: msg.attachments.first().url,
    verified: false,
    timestamp: Date.now()
  });

  if (submissions.length > 20) submissions.shift();
});

client.login(DISCORD_TOKEN);

// --- Endpoint for website ---
app.get("/submissions", (req, res) => {
  const lastThree = submissions.slice(-3);
  res.json(lastThree);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
