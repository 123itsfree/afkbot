const mineflayer = require("mineflayer");
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const fs = require("fs");

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

// Load plugins (if any are used in your existing setup)
// Example: bot.loadPlugin(cmd); 

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

// Chat and message handler with duplicate filter
bot.on("message", (jsonMsg) => {
  const message = jsonMsg.toString();
  if (message !== lastMessage) {
    console.log(`[CHAT]: ${message}`);
    lastMessage = message;
    broadcast(`[Bot]: ${message}`); // Send message to all web clients
  }
});

// Express server setup
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = [];

// Serve the web interface
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Bot Console</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          #chat { width: 100%; height: 300px; overflow-y: scroll; border: 1px solid #ccc; padding: 10px; }
          #message { width: 80%; padding: 10px; }
          button { padding: 10px; }
        </style>
      </head>
      <body>
        <h1>${username} Console</h1>
        <div id="chat"></div>
        <input id="message" type="text" placeholder="Type your message here">
        <button onclick="sendMessage()">Send</button>
        <script>
          const ws = new WebSocket("ws://" + location.host);
          const chat = document.getElementById("chat");

          ws.onmessage = (event) => {
            const msg = document.createElement("div");
            msg.textContent = event.data;
            chat.appendChild(msg);
            chat.scrollTop = chat.scrollHeight;
          };

          function sendMessage() {
            const input = document.getElementById("message");
            if (input.value) {
              ws.send(input.value);
              input.value = "";
            }
          }
        </script>
      </body>
    </html>
  `);
});

// WebSocket server logic
wss.on("connection", (ws) => {
  clients.push(ws);

  ws.on("message", (message) => {
    bot.chat(message);
    console.log(`[Web]: ${message}`);
    broadcast(`[You]: ${message}`);
  });

  ws.on("close", () => {
    const index = clients.indexOf(ws);
    if (index !== -1) clients.splice(index, 1);
  });
});

// Broadcast messages to all connected clients
function broadcast(message) {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Start the server
const port = process.env.PORT || 6666;
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log("Open your browser and visit the URL to chat with the bot.");
});
