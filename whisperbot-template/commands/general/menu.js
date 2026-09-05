const path = require("path");
const fs = require("fs");

module.exports = {
name: "menu",
category: "general",
description: "✦ The-whisperer_bot • Command Center ✦",
permission: "public",

execute: async (sock, msg, args = []) => {
    const { t } = require("../../lib/lang");
    const { commands } = require("../../handler");
    const settings = require("../../lib/settings");

    const dictionary = require("../../language/source/dictionary");
    const commandFr = require("../../language/source/command-fr");

    const jid = msg.key.remoteJid;
    const page = (args[0] || "").toLowerCase().trim();

    const config = settings.get("global");
    const { version } = require("../../package.json");

    // ═════════════════════════════════════════════
    // BASIC INFORMATION
    // ═════════════════════════════════════════════

    const botName = config.bot_name || "The-whisperer_bot";
    const prefix = ".";
    const userName = msg.pushName || "User";

    const language =
        config.language === "fr"
            ? "Français 🇫🇷"
            : "English 🇬🇧";

    // ═════════════════════════════════════════════
    // MENU IMAGE
    // ═════════════════════════════════════════════

    const menuImage = path.join(
        __dirname,
        "../../assets/menu.png"
    );

    const hasMenuImage = fs.existsSync(menuImage);

    // ═════════════════════════════════════════════
    // UPTIME
    // ═════════════════════════════════════════════

    const totalSeconds = Math.floor(
        (Date.now() - (global.START_TIME || Date.now())) / 1000
    );

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let uptime;

    if (days > 0) {
        uptime = `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        uptime = `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
        uptime = `${minutes}m ${seconds}s`;
    } else {
        uptime = `${seconds}s`;
    }

    // ═════════════════════════════════════════════
    // MEMORY
    // ═════════════════════════════════════════════

    const ram = (
        process.memoryUsage().rss /
        1024 /
        1024
    ).toFixed(1);

    // ═════════════════════════════════════════════
    // CATEGORY ICONS
    // ═════════════════════════════════════════════

    const icons = {
        admin: "🛡️",
        group: "👥",
        owner: "👑",
        fun: "🎮",
        general: "📖",
        info: "💡",
        tools: "🛠️",
        media: "🎬",
        download: "📥",
        utility: "⚙️",
        other: "📦"
    };

    // ═════════════════════════════════════════════
    // COMMAND ICONS
    // ═════════════════════════════════════════════

    const commandIcons = {
        admin: "🔐",
        group: "👥",
        owner: "👑",
        fun: "🎲",
        general: "📖",
        info: "💡",
        tools: "🔧",
        media: "🎞️",
        download: "⬇️",
        utility: "⚙️",
        other: "›"
    };

    // ═════════════════════════════════════════════
    // CATEGORY BANNERS
    // ═════════════════════════════════════════════

    const categoryBanners = {
        admin: t("menu_banner_admin"),
        group: t("menu_banner_group"),
        owner: t("menu_banner_owner"),
        fun: t("menu_banner_fun"),
        general: t("menu_banner_general"),
        info: t("menu_banner_info"),
        tools: t("menu_banner_tools"),
        other: t("menu_banner_other")
    };

    // ═════════════════════════════════════════════
    // ORGANIZE COMMANDS
    // ═════════════════════════════════════════════

    const categories = {};

    for (const [name, command] of commands.entries()) {
        // Ignore aliases / duplicate registrations
        if (name !== command.name) continue;

        const category =
            typeof command.category === "string"
                ? command.category.toLowerCase()
                : "other";

        if (!categories[category]) {
            categories[category] = [];
        }

        categories[category].push(command);
    }

    // ═════════════════════════════════════════════
    // PREMIUM CATEGORY ORDER
    // ═════════════════════════════════════════════

    const preferredOrder = [
        "owner",
        "admin",
        "group",
        "general",
        "tools",
        "media",
        "download",
        "fun",
        "info",
        "utility",
        "other"
    ];

    const sortedCategories = Object.keys(categories).sort((a, b) => {
        const ai = preferredOrder.indexOf(a);
        const bi = preferredOrder.indexOf(b);

        if (ai === -1 && bi === -1) {
            return a.localeCompare(b);
        }

        if (ai === -1) return 1;
        if (bi === -1) return -1;

        return ai - bi;
    });

    const totalCategories = sortedCategories.length;

    const totalCommands = Object.values(categories)
        .reduce((total, list) => total + list.length, 0);

    // ═════════════════════════════════════════════
    // PREMIUM DESCRIPTION FORMATTER
    // ═════════════════════════════════════════════

    const formatDescription = (description) => {
        if (!description) {
            return "✦ _No description available_";
        }

        const cleanDescription = String(description)
            .replace(/\r?\n/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        return `✦ _${cleanDescription}_`;
    };

    // ═════════════════════════════════════════════
    // SEND PREMIUM IMAGE + CAPTION
    // ═════════════════════════════════════════════

    const sendMenu = async (caption) => {
        if (hasMenuImage) {
            return await sock.sendMessage(jid, {
                image: {
                    url: menuImage
                },
                caption
            });
        }

        return await sock.sendMessage(jid, {
            text: caption
        });
    };

    // ═════════════════════════════════════════════
    // UNKNOWN CATEGORY
    // ═════════════════════════════════════════════

    if (page && !categories[page]) {
        const available = sortedCategories
            .map(category => {
                const icon = icons[category] || "📦";

                const name =
                    category.charAt(0).toUpperCase() +
                    category.slice(1);

                return `│ ${icon} *${name}*  •  ${categories[category].length}`;
            })
            .join("\n");

        return await sendMenu(

`╭──────────────────────────╮
│   ❌ PAGE NOT FOUND
╰──────────────────────────╯

${t("menu_unknown")}

╭━━〔 📂 ${t("menu_available_pages")} 〕━━╮
${available}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

💡 ${t("menu_example")}
╰─ ${prefix}menu admin

━━━━━━━━━━━━━━━━━━━━━━━━━━
✦ ${botName} • v${version}`
);
}

    // ═════════════════════════════════════════════
    // PREMIUM MAIN HEADER
    // ═════════════════════════════════════════════

    let menu =

`╭──────────────────────────╮
│   ✦ ${botName} ✦
│   Your Ultimate WhatsApp Assistant
╰──────────────────────────╯

╭━━〔 👤 PROFILE 〕━━━━━━━━╮
│
│ 👤 User      : ${userName}
│ 🌐 Language  : ${language}
│ ⚡ Prefix    : ${prefix}
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 📊 SYSTEM STATUS 〕━━╮
│
│ 🟢 Status    : ONLINE
│ 📦 Version   : ${version}
│ ⏱️ Uptime    : ${uptime}
│ 💾 Memory    : ${ram} MB
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 📚 COMMAND CENTER 〕╮
│
│ ⚡ Commands  : ${totalCommands}
│ 📂 Categories: ${totalCategories}
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

    // ═════════════════════════════════════════════
    // MAIN MENU
    // ═════════════════════════════════════════════

    if (!page) {
        menu += `

╭━━〔 ✦ CATEGORIES ✦ 〕━━━╮
│`;

        for (const category of sortedCategories) {
            const icon = icons[category] || "📦";

            const name =
                category.charAt(0).toUpperCase() +
                category.slice(1);

            const count = categories[category].length;

            menu += `\n│ ${icon} *${name}*  ›  ${count} commands`;
        }

        menu += `

│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 🚀 QUICK ACCESS 〕━━━━╮
│
│ ${prefix}menu owner
│ ${prefix}menu admin
│ ${prefix}menu general
│ ${prefix}menu tools
│ ${prefix}menu fun
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 💡 HOW TO USE 〕━━━━━━╮
│
│ ${prefix}menu <category>
│
│ Example:
│ ${prefix}menu media
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 ⚡ THE-WHISPERER_BOT 〕╮
│
│ 🚀 Fast
│ 🛡️ Secure
│ ⚙️ Smart
│ 💎 Premium
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭──────────────────────────╮
│ ✦ ${botName} v${version}
│ Your ultimate command hub.
╰──────────────────────────╯`;

        return await sendMenu(menu);
    }

    // ═════════════════════════════════════════════
    // CATEGORY PAGE
    // ═════════════════════════════════════════════

    const icon = icons[page] || "📦";
    const commandIcon = commandIcons[page] || "›";

    const categoryName =
        page.charAt(0).toUpperCase() +
        page.slice(1);

    const banner =
        categoryBanners[page] ||
        categoryName;

    const categoryCommands = categories[page];

    menu += `

╭━━〔 ${icon} ${banner} 〕━━╮
│
│ 📚 Commands : ${categoryCommands.length}
│ 🔎 Prefix   : ${prefix}
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

    // ═════════════════════════════════════════════
    // COMMAND LIST
    // ═════════════════════════════════════════════

    for (const [index, command] of categoryCommands.entries()) {
        let description;

        if (config.language === "fr") {
            description =
                commandFr[command.name] ||
                dictionary[command.name] ||
                command.description;
        } else {
            description =
                dictionary[command.name] ||
                command.description;
        }

        const number =
            String(index + 1).padStart(2, "0");

        const premiumDescription =
            formatDescription(description);

        menu += `

╭─〔 ${number} 〕
│ ${commandIcon} ${prefix}${command.name}
│
│ ${premiumDescription}
╰──────────────────────────`;
}

    // ═════════════════════════════════════════════
    // CATEGORY FOOTER
    // ═════════════════════════════════════════════

    menu += `

╭━━〔 ↩️ NAVIGATION 〕━━━━━━╮
│
│ ${prefix}menu
│ Return to command center
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭──────────────────────────╮
│ ✦ ${botName} • v${version}
│ Premium WhatsApp Assistant
╰──────────────────────────╯`;

    return await sendMenu(menu);
}

};
