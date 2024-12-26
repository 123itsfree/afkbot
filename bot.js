const mineflayer = require("mineflayer");
const pvp = require("mineflayer-pvp").plugin;
const armorManager = require("mineflayer-armor-manager");
const cmd = require("mineflayer-cmd").plugin;
const fs = require("fs");
const readline = require("readline");

// Load configuration
let rawdata = fs.readFileSync("config.json");
let data = JSON.parse(rawdata);

const host = data.ip;
const username = data.name;
const nightskip = data["auto-night-skip"] === "true";

const bot = mineflayer.createBot({
  host,
  port: data.port,
  username,
  logErrors: false,
});

// Track statistics
let death = 0;
let simp = 0;
let popularity = 0;
let pvpc = 0;

// Cache for duplicate message filtering
let lastMessage = "";

// Load plugins
bot.loadPlugin(cmd);
bot.loadPlugin(pvp);
bot.loadPlugin(armorManager);

// Bot login handler
bot.on("login", () => {
  console.log("Trying to login");
  if (data["login-enabled"] === "true") {
    bot.chat(data["login-cmd"]);
    setTimeout(() => bot.chat(data["register-cmd"]), 2000);
  }
  console.log("Logged In");
  bot.chat("hello");
});

// Bot time handler for night skip
bot.on("time", () => {
  if (nightskip && bot.time.timeOfDay >= 13000) {
    bot.chat("/time set day");
  }
});

// Bot spawn handler
bot.on("spawn", () => {
  console.log("Bot spawned and ready to AFK.");
});

// Bot death handler
bot.on("death", () => {
  death++;
  bot.emit("respawn");
});

// Equip items on collection or check inventory
bot.on("playerCollect", (collector, itemDrop) => {
  if (collector !== bot.entity) return;

  setTimeout(() => {
    const sword = bot.inventory
      .items()
      .find((item) => item.name.includes("sword"));
    if (sword) bot.equip(sword, "hand");
  }, 150);

  setTimeout(() => {
    const shield = bot.inventory
      .items()
      .find((item) => item.name.includes("shield"));
    if (shield) bot.equip(shield, "off-hand");
  }, 250);

  setTimeout(() => {
    const totem = bot.inventory
      .items()
      .find((item) => item.name.includes("totem"));
    if (totem) bot.equip(totem, "off-hand");
  }, 350);
});

// Chat and message handler with duplicate filter
bot.on("message", (jsonMsg) => {
  const message = jsonMsg.toString();
  if (message !== lastMessage) {
    console.log(`[CHAT]: ${message}`);
    lastMessage = message;
  }
});

// Chat command handler
bot.on("chat", (username, message) => {
  if (username === bot.username) return;

  if (/^hi|hello/i.test(message) && message.includes(bot.username)) {
    popularity++;
    bot.chat(`hi ${username}`);
  }

  if (/^fight me/i.test(message) && message.includes(bot.username)) {
    const player = bot.players[username];
    if (!player) {
      bot.chat(`I can't see you. Keep hiding, ${username}, loser!`);
    } else {
      bot.chat(`Prepare to fight, ${username}!`);
      pvpc++;
      bot.pvp.attack(player.entity);
    }
  }

  if (message.toLowerCase().includes("bangi")) {
    bot.chat("home farm");
  }
});

// Console input handler for chat and commands
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.on("line", (line) => {
  if (line.startsWith("!team")) {
    const teamMessage = line.slice(5).trim();
    if (teamMessage) {
      bot.chat(`/team chat ${teamMessage}`);
    } else {
      bot.chat("/team chat");
    }
  } else if (line.startsWith("/")) {
    bot.chat(line); // Sends the input as a command
  } else {
    bot.chat(line); // Sends the input as a chat message
  }
});

// Express server for stats
const express = require("express");
const app = express();
const port = process.env.PORT || 6666;

app.get("/", (req, res) => {
  res.send(`
        <b>${username}</b> is Online At <b>${host}</b><br><br>
        Die Counter: <b>${death}</b><br>
        Simp Counter: <b>${simp}</b><br>
        Popularity Counter: <b>${popularity}</b><br>
        PvP Counter: <b>${pvpc}</b><br><br>
        Made By <b>https://github.com/healer-op/AternosAfkBot</b>
    `);
});

app.listen(port, () => {
  console.log(`Express app listening at http://localhost:${port}`);
  console.log("MADE BY HEALER");
});