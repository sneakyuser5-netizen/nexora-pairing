const fs = require("fs");

const events = {
    "messages.upsert": [],
    "messages.update": [],
    "group-participants.update": []
};


function loadEvents() {
  //  events["messages.upsert"] = [];
events["messages.update"] = [];
//events["group-participants.update"] = [];
    
    events["messages.upsert"] = [];
    events["group-participants.update"] = [];

    const files = fs.readdirSync("./events");

    for (const file of files) {

        const event = require("./events/" + file);

        if (!event.trigger || !event.execute) {
            continue;
        }

        if (!events[event.trigger]) {
            events[event.trigger] = [];
        }

        events[event.trigger].push(event);

        console.log(
            "✅ Event loaded:",
            event.name
        );
    }

}


async function runEvents(trigger, ...args) {

    const list = events[trigger];

    if (!list) return;

    for (const event of list) {

        await event.execute(...args);

    }

}


module.exports = {
    loadEvents,
    runEvents
};
