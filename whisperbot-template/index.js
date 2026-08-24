const { t } = require("./lib/lang");
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const { loadCommands, handleMessage } = require("./handler");
const { loadEvents, runEvents } = require("./eventHandler");
const settings = require("./lib/settings");


const setup = require("./lib/setup");
const BOT_VERSION = "1.0.0";

const botName =
    settings.get("global").bot_name ||
    "Whisperer_Bot";

const originalLog = console.log;

console.log = (...args) => {

    // Hide all object dumps (WhatsApp messages, updates, etc.)
    if (args.some(arg => typeof arg === "object")) {
        return;
    }

    const text = args.join(" ");

    // Hide old debug logs
    if (
        text.startsWith("COMMAND:") ||
        text.startsWith("ARGS:") ||
        text.startsWith("GOODBYE EVENT:") ||
        text.startsWith("LEAVING USER:") ||
        text.startsWith("[STATUS]")
    ) {
        return;
    }

    originalLog(...args);

};
async function startBot() {
    try {
    
    const { state, saveCreds } = await useMultiFileAuthState("./session");

        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: "silent" })
        });
        global.sock = sock;

const originalSendMessage = sock.sendMessage.bind(sock);

sock.sendMessage = async (jid, content, options) => {

    try {

        const config = settings.get("global");

        if (config.autotyping) {

            await sock.sendPresenceUpdate("composing", jid);
            await new Promise(resolve => setTimeout(resolve, 5000));
            await sock.sendPresenceUpdate("available", jid);

        } else if (config.autorecording) {

            await sock.sendPresenceUpdate("recording", jid);
            await new Promise(resolve => setTimeout(resolve, 5000));
            await sock.sendPresenceUpdate("available", jid);

        }

    } catch (err) {
        console.log("PRESENCE ERROR:", err);
    }

    return originalSendMessage(jid, content, options);
}; // <- THIS } WAS MISSING

sock.ev.on("creds.update", saveCreds);

// ===== STATUS SAVER LISTENER START =====
const identity = require("./lib/identity"); // removed duplicate settings

sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type!== "notify") return;
    const msg = messages[0];
    if (!msg ||!msg.key) return;

    // WhatsApp statuses come from status@broadcast
    if (msg.key.remoteJid === "status@broadcast") {
        const isOn = settings.get("global").status_saver;
        if (!isOn) return;

        const owner = identity.getBotOwner() + "@s.whatsapp.net"; // add @s.whatsapp.net
        const who = msg.key.participant; // who posted the status

        try {
            // Forward the status to you
            await sock.sendMessage(owner, { forward: msg });
            console.log(`[STATUS] Forwarded status from ${who}`);
        } catch (e) {
            console.log("Status forward error:", e);
        }
    }
});
// ===== STATUS SAVER LISTENER END =====

        // load commands ONCE
        loadCommands();
        loadEvents();


        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === "open") {
                
                const owner =
    sock.user.id.split(":")[0];

const ownerDB =
    require("./lib/owner");

const data = ownerDB.get();

if (!data || data.botOwner !== owner) {

    ownerDB.set(owner);
    setup.clearPhone();

}
                const info = ownerDB.get();

if (!info.welcomed) {

    try {

        await sock.sendMessage(
            owner + "@s.whatsapp.net",
            {
                image: fs.readFileSync("./assets/welcome.png"),

                caption:
`━━━━━━━━━━━━━━━
🤖 *WhisperBot*

Welcome *${sock.user.name || "Owner"}*! 🎉

Your WhatsApp has been linked successfully.

👑 You are now the owner of this WhisperBot instance.

🚀 Start by typing:

*.menu*

Useful commands:

• .private
• .public
• .setsudo
• .ping

Enjoy your new assistant!

━━━━━━━━━━━━━━━

Made with ❤️ by
*THE-WHISPERER-237*`
            }
        );

        ownerDB.welcomed();

        

    } catch (err) {

        

    }

}


    const number =
        sock.user.id.split(":")[0];


    const uptime = () => {

        const seconds =
            Math.floor((Date.now() - START_TIME) / 1000);

        const hours =
            Math.floor(seconds / 3600);

        const minutes =
            Math.floor((seconds % 3600) / 60);

        const secs =
            seconds % 60;

        return `${hours}h ${minutes}m ${secs}s`;

    };


    console.log(`
╔════════════════════════════════╗
║        🤖 BOT ONLINE           ║
╠════════════════════════════════╣
║ BOT NAME:
║ ${botName}
║
║ 📱NUMBER:
║ +${number}
║
║ 📦 VERSION:
║ ${BOT_VERSION}
║
║ ⚡ STATUS:
║ Connected ✅
║
║ ⏱️ UPTIME:
║ ${uptime()}
╚════════════════════════════════╝
    `);

            }

            if (connection === "close") {
                const statusCode = lastDisconnect?.error?.output?.statusCode;

                console.log("❌ Connection closed. Code:", statusCode);

                if (statusCode !== DisconnectReason.loggedOut) {
                    setTimeout(() => startBot(), 3000);
                }
            }
        });
        sock.ev.on("messages.upsert", async ({ messages }) => {

    const msg = messages[0];
    if (!msg.message) return; // add this first

    // ===== GLOBAL AUTO READ START =====
    try {
        const fs = require("fs");
        const readPath = "./database/read.json";

        if (fs.existsSync(readPath)) {
            const readDB = JSON.parse(fs.readFileSync(readPath));
            if (readDB.global) {
                await sock.readMessages([msg.key]); // marks blue ticks
            }
        }
    } catch (err) {
        console.log("AUTO READ ERROR:", err);
    }
    // ===== GLOBAL AUTO READ END =====

    const messageCache = require("./lib/messageCache");
    // Save every incoming message
    if (msg.message &&!msg.key.fromMe) {
        messageCache.save(msg);
    }
        //sock.ev.on("messages.upsert", async ({ messages }) => {

    //const msg = messages[0];
           // const messageCache = require("./lib/messageCache");

// Save every incoming message
//if (msg.message && !msg.key.fromMe) {
    //messageCache.save(msg);
            // AUTO RECORDING ON RECEIVE
try {
    const config = settings.get("global");
    if (config.autorecording &&!msg.key.fromMe) {
        await sock.sendPresenceUpdate("recording", msg.key.remoteJid);
    }
} catch (err) {
    console.log("AUTO RECORD ERROR:", err);
}
//}
            const identity = require("./lib/identity");
            const afk = require("./lib/afk");
            const botId = sock.user.id.split(":")[0];

const senderId = identity.getSender(msg);

if (senderId === botId) {
    return;
}
  
    if (!msg.message) return;
            


const sender = identity.getSender(msg);

const activity = require("./lib/activity");

// Only record activity from real users in groups
if (
    !msg.key.fromMe &&
    msg.key.remoteJid.endsWith("@g.us")
) {
    activity.update(
        msg.key.remoteJid,
        sender
    );
}


    const read = require("./lib/read");

    const user =
        msg.key.participant ||
        msg.key.remoteJid;


    if (read.get(user)) {

        await sock.readMessages([
            msg.key
        ]);

    }
            const context =
    msg.message?.extendedTextMessage?.contextInfo;

const mentions =
    context?.mentionedJid || [];

if (mentions.length) {

    for (const user of mentions) {

    if (!afk.has(user)) continue;

    const data = afk.get(user);

    const duration = afk.format(
        Date.now() - data.time
    );
    

    await sock.sendMessage(
        msg.key.remoteJid,
        {
            text:
`${t(msg.key.remoteJid, "owner.afk_user")}
${t(msg.key.remoteJid, "owner.afk_return_reason")}
${data.reason}

${t(msg.key.remoteJid, "owner.afk_user_away")}
${duration}

${t(msg.key.remoteJid, "owner.afk_user_footer")}`
            
        }
    );
    break;
    }
}      
await runEvents(
        "messages.upsert",
        sock,
        msg
    );
await handleMessage(
        sock,
        msg
    );

}); 
    
     sock.ev.on("group-participants.update", async (update) => {

    await runEvents(
        "group-participants.update",
        sock,
        update
    );

});
        sock.ev.on("presence.update", ({ id, presences }) => {

    const presence = require("./lib/presence");

    for (const user in presences) {

        const state = presences[user]?.lastKnownPresence;

        if (
            state === "available" ||
            state === "composing" ||
            state === "recording" ||
            state === "paused"
        ) {
            presence.set(user);
        }

    }

});

      sock.ev.on("call", async calls => {

    const config = settings.get("global");

    if (!config.anticall) return;

    for (const call of calls) {

        try {

            await sock.rejectCall(call.id, call.from);

        

        } catch (err) {
            console.log("ANTICALL ERROR:", err);
        }

    }

});
        setTimeout(async () => {
            try {

                if (!sock.authState.creds.registered) {
                    const phone = setup.getPhone();

if (
    !phone?.trim() ||
    phone.trim() === "237612345678"
) {

    console.log(`
╔══════════════════════════════════════╗
║          🤖 WHISPERBOT SETUP         ║
╚══════════════════════════════════════╝

Welcome to WhisperBot!

Follow these steps:

1️⃣ Open:
   database/setup.json

2️⃣ Replace:

   {
     "phone": ""
   }

3️⃣ With your WhatsApp number:

   {
     "phone": "237612345678"
   }

4️⃣ Save the file.

5️⃣ Restart the bot.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After restarting,
your Pairing Code will appear here.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

    return;

}
                    const code = await sock.requestPairingCode(phone);

                    console.log("\n======================");
                    console.log("PAIR CODE 👉", code);
                    console.log("======================\n");
                }

            } catch (err) {
                console.log("Pairing error:", err);
            }
        }, 4000);

    } catch (err) {
        console.log("FATAL ERROR:", err);
        setTimeout(startBot, 5000);
    }
}
const START_TIME = Date.now();

global.START_TIME = START_TIME;


startBot();
