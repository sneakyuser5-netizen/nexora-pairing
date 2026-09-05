const { t } = require("../../lib/lang");
const OpenAI = require("openai");
const api = require("../../lib/api");
const memory = require("../../lib/memory");

const conversations = new Map();

const MAX_HISTORY = 12;
const MAX_PROMPT_LENGTH = 12000;
const MAX_REPLY_LENGTH = 12000;

const SYSTEM_PROMPT = `
You are WhisperBot, a powerful and friendly WhatsApp AI assistant.

Rules:
- Give accurate, useful and direct answers.
- Understand natural conversation and follow previous context.
- Be concise for simple questions and detailed when appropriate.
- Help with programming, debugging, mathematics, writing, translation, explanations and general knowledge.
- Support English and French naturally.
- If the user speaks French, answer in French.
- If the user speaks English, answer in English.
- Use clear formatting suitable for WhatsApp.
- Never claim to have performed an action you did not perform.
- Do not invent facts when uncertain.
- Treat remembered information as context, not absolute truth.
`.trim();

function getConversation(jid) {
    if (!conversations.has(jid)) {
        conversations.set(jid, []);
    }

    return conversations.get(jid);
}

function trimConversation(history) {
    if (history.length > MAX_HISTORY) {
        history.splice(0, history.length - MAX_HISTORY);
    }
}

function getQuotedText(msg) {
    const context =
        msg.message?.extendedTextMessage?.contextInfo;

    const quoted = context?.quotedMessage;

    if (!quoted) return null;

    return (
        quoted.conversation ||
        quoted.extendedTextMessage?.text ||
        quoted.imageMessage?.caption ||
        quoted.videoMessage?.caption ||
        quoted.documentMessage?.caption ||
        null
    );
}

function cleanReply(text) {
    if (!text) return "";

    return text
        .trim()
        .slice(0, MAX_REPLY_LENGTH);
}

async function extractMemories(client, jid, userMessage, assistantReply) {
    try {
        const existing = memory.get(jid);

        const extraction = await client.chat.completions.create({
            model: "openai/gpt-oss-120b",

            messages: [
                {
                    role: "system",
                    content: `
You are WhisperBot's memory extraction system.

Identify only information that is genuinely useful for remembering this user
in future conversations.

Good memories:
- Name or preferred name
- Long-term preferences
- Important projects
- Stable goals
- Important recurring context
- Explicit instructions about how the assistant should interact

Do NOT remember:
- Temporary questions
- Random facts
- Passwords
- API keys
- Tokens
- Private credentials
- One-time events
- Sensitive personal information unless absolutely necessary

Return ONLY a JSON array of short strings.

If nothing is worth remembering, return [].

Existing memories:
${JSON.stringify(existing.slice(-30))}
`
                },
                {
                    role: "user",
                    content:
                        `User message:\n${userMessage}\n\n` +
                        `Assistant response:\n${assistantReply}`
                }
            ],

            temperature: 0,
            max_tokens: 500
        });

        const content =
            extraction.choices?.[0]?.message?.content?.trim();

        if (!content) return;

        let memories;

        try {
            memories = JSON.parse(content);
        } catch {
            const match = content.match(/\[[\s\S]*\]/);

            if (!match) return;

            memories = JSON.parse(match[0]);
        }

        if (!Array.isArray(memories)) return;

        for (const item of memories.slice(0, 3)) {
            if (
                typeof item === "string" &&
                item.trim()
            ) {
                memory.add(jid, item);
            }
        }

    } catch (err) {
        console.error("Memory extraction error:", err.message);
    }
}

module.exports = {

    name: "chat",

    description: "Chat with WhisperBot",

    category: "tools",

    permission: "public",

    usage: ".chat <message>\n.chat reset\n.chat status\n.chat remember <fact>\n.chat memories\n.chat forget <fact>\n.chat memory clear",

    execute: async (sock, msg, args) => {

        const jid = msg.key.remoteJid;
        const input = args.join(" ").trim();

        if (!input) {
            return sock.sendMessage(jid, {
                text: t(jid, "tools.chat_usage")
            });
        }

        const lower = input.toLowerCase();

        if (lower === "reset") {
            conversations.delete(jid);

            return sock.sendMessage(jid, {
                text: t(jid, "tools.chat_reset")
            });
        }

        if (lower === "status") {
            const history = conversations.get(jid);
            const memories = memory.get(jid);

            return sock.sendMessage(jid, {
                text:
                    `${history?.length ? "🧠" : "💤"} ` +
                    `${history?.length || 0} recent messages\n` +
                    `🗃️ ${memories.length} long-term memories`
            });
        }

        if (lower === "memories" || lower === "memory") {
            const memories = memory.get(jid);

            if (!memories.length) {
                return sock.sendMessage(jid, {
                    text: t(jid, "tools.chat_memory_empty")
                });
            }

            const text = memories
                .map(
                    (item, index) =>
                        `${index + 1}. ${item.text}`
                )
                .join("\n");

            return sock.sendMessage(jid, {
                text:
                    `${t(jid, "tools.chat_memory_title")}\n\n` +
                    text
            });
        }

        if (lower === "memory clear") {
            memory.clear(jid);

            return sock.sendMessage(jid, {
                text: t(jid, "tools.chat_memory_cleared")
            });
        }

        if (lower.startsWith("remember ")) {
            const fact = input.slice(9).trim();

            if (!fact) {
                return sock.sendMessage(jid, {
                    text: t(jid, "tools.chat_remember_usage")
                });
            }

            const added = memory.add(jid, fact);

            return sock.sendMessage(jid, {
                text: added
                    ? t(jid, "tools.chat_memory_saved")
                    : t(jid, "tools.chat_memory_exists")
            });
        }

        if (lower.startsWith("forget ")) {
            const query = input.slice(7).trim();

            if (!query) {
                return sock.sendMessage(jid, {
                    text: t(jid, "tools.chat_forget_usage")
                });
            }

            const removed = memory.remove(jid, query);

            return sock.sendMessage(jid, {
                text: removed
                    ? t(jid, "tools.chat_memory_removed")
                    : t(jid, "tools.chat_memory_not_found")
            });
        }

        if (!api.keys.groq) {
            return sock.sendMessage(jid, {
                text: t(jid, "tools.chat_failed")
            });
        }

        if (input.length > MAX_PROMPT_LENGTH) {
            return sock.sendMessage(jid, {
                text: t(jid, "tools.chat_too_long")
            });
        }

        try {

            const client = new OpenAI({
                apiKey: api.keys.groq,
                baseURL: api.urls.groq
            });

            const history = getConversation(jid);

            const relevantMemories =
                memory.search(jid, input, 10);

            const memoryContext =
                relevantMemories.length
                    ? `
Long-term memories relevant to this conversation:
${relevantMemories
    .map(item => `- ${item.text}`)
    .join("\n")}
`
                    : "";

            const quotedText = getQuotedText(msg);

            let userContent = input;

            if (quotedText) {
                userContent =
                    `The user is replying to this WhatsApp message:\n` +
                    `---\n${quotedText.slice(0, 6000)}\n---\n\n` +
                    `User's new message:\n${input}`;
            }

            history.push({
                role: "user",
                content: userContent
            });

            trimConversation(history);

            const completion =
                await client.chat.completions.create({

                    model: "openai/gpt-oss-120b",

                    messages: [
                        {
                            role: "system",
                            content:
                                SYSTEM_PROMPT +
                                "\n\n" +
                                memoryContext
                        },
                        ...history
                    ],

                    temperature: 0.7,
                    max_tokens: 2048
                });

            const reply = cleanReply(
                completion.choices?.[0]?.message?.content
            );

            if (!reply) {
                history.pop();

                return sock.sendMessage(jid, {
                    text: t(jid, "tools.chat_failed")
                });
            }

            history.push({
                role: "assistant",
                content: reply
            });

            trimConversation(history);

            await sock.sendMessage(jid, {
                text: reply
            });

            // Extract long-term memories after replying.
            // This does not delay the user's response.
            extractMemories(
                client,
                jid,
                input,
                reply
            ).catch(err => {
                console.error(
                    "Background memory error:",
                    err.message
                );
            });

        } catch (err) {

            console.error("Chat error:", err);

            const history = conversations.get(jid);

            if (history?.at(-1)?.role === "user") {
                history.pop();
            }

            const message =
                (
                    err?.message ||
                    err?.error?.message ||
                    ""
                ).toLowerCase();

            if (
                message.includes("rate limit") ||
                message.includes("too many requests") ||
                message.includes("quota") ||
                message.includes("rate_limit") ||
                err?.status === 429
            ) {
                return await sock.sendMessage(jid, {
                    text: t(jid, "tools.chat_rate_limit")
                });
            }

            console.error(
                "Chat API status:",
                err?.status || "unknown"
            );

            return await sock.sendMessage(jid, {
                text: t(jid, "tools.chat_failed")
            });
        }
    }
};
