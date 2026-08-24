const settings = require("../lib/settings");

module.exports = {
    name: "welcome",
    trigger: "group-participants.update",

execute: async (sock, update) => {

    console.log("WELCOME EVENT FIRED:", update);
        if (update.action !== "add") return;

        const group = update.id;

        if (!settings.get(group).welcome) return;

        const metadata = await sock.groupMetadata(group);

        const groupSettings = settings.get(group);

        for (const participant of update.participants) {

            const user =
                typeof participant === "string"
                    ? participant
                    : participant.id || participant.jid;

            let message =
                groupSettings.welcome_message ||
                "👋 Welcome {user} to *{group}*!";

            message = message
                .replace(/{user}/g, `@${user.split("@")[0]}`)
                .replace(/{group}/g, metadata.subject);

            await sock.sendMessage(group, {
                text: message,
                mentions: [user]
            });

        }
    }
};
