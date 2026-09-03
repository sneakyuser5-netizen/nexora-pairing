const fs = require("fs");
const path = require("path");
const events = { "messages.upsert": [], "messages.update": [], "group-participants.update": [] };
function loadEvents() {
    events["messages.upsert"] = [];
    events["messages.update"] = [];
    events["group-participants.update"] = [];
    let files = [];
    try { files = fs.readdirSync("./events"); } catch(e){ console.log("❌ Cannot read events dir", e.message); return; }
    for (const file of files) {
        if (!file.endsWith(".js")) continue;
        const full = path.join("./events", file);
        try {
            try { delete require.cache[require.resolve(path.resolve(full))]; } catch{}
            const event = require(path.resolve(full));
            if (!event.trigger ||!event.execute) continue;
            if (!events[event.trigger]) events[event.trigger] = [];
            events[event.trigger].push(event);
            console.log("✅ Event loaded:", event.name || file);
        } catch(err) {
            console.log(`❌ Failed event ${file}: ${err.message}`);
        }
    }
}
async function runEvents(trigger,...args) {
    const list = events[trigger];
    if (!list) return;
    for (const event of list) {
        try { await event.execute(...args); } catch(e){ console.log(`Event ${trigger} error:`, e.message); }
    }
}
module.exports = { loadEvents, runEvents };
