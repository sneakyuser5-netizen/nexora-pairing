const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "../database/settings.json");

// Default settings
const DEFAULTS = {
    "global": {
        "autoreact": false,
        "autotyping": false,
        "autorecording": false,
        "autoread": false,
    "anticall": false

    }
};


function load() {
    try {
        // create database folder if missing
        if (!fs.existsSync(path.dirname(file))) {
            fs.mkdirSync(path.dirname(file), { recursive: true });
        }

        if (!fs.existsSync(file)) {
            fs.writeFileSync(file, JSON.stringify(DEFAULTS, null, 2));
            return DEFAULTS;
        }

        const data = JSON.parse(fs.readFileSync(file));
        // merge with defaults in case we add new keys later
        return {...DEFAULTS,...data, global: {...DEFAULTS.global,...data.global } };
    } catch (err) {
        console.log("SETTINGS LOAD ERROR:", err);
        return DEFAULTS;
    }
}

function save(data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function get(group) {
    const data = load();
    return data[group] || DEFAULTS[group] || {};
}

function set(group, key, value) {
    const data = load();
    if (!data[group]) data[group] = {};
    data[group][key] = value;
    save(data);
    console.log(`SETTINGS UPDATED: ${group}.${key} = ${value}`); // for debugging
}

module.exports = { get, set };
