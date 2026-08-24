const afk = require("../../lib/afk");
const identity = require("../../lib/identity");
const { t } = require("../../lib/lang");

module.exports = {

    name: "afk",

    description: "Set yourself AFK",

    category: "owner",

    permission: "owner",

    execute: async (sock, msg, args) => {

        const jid = msg.key.remoteJid;

        const sender = identity.getSender(msg);

        const reason =
            args.join(" ") ||
            t(jid, "owner.afk_no_reason");

        afk.set(sender, reason, msg.key.id);

        await sock.sendMessage(jid, {

            text:
`${t(jid, "owner.afk_set")}

📝 ${t(jid, "owner.afk_reason")}
${reason}

😂 ${t(jid, "owner.afk_footer")}`

        });

    }

};
