//Runtime command 
const { t } = require("../../lib/lang");

module.exports = {

    name: "runtime",

    description: "Show Node.js runtime version",

    category: "general",

    execute: async (sock, msg) => {

        await sock.sendMessage(msg.key.remoteJid, {
            text:
`${t("general.runtime_title")}

Node.js: ${process.version}`
        });

    }

};
