// https://github.com/sneakyuser5-netizen/whisperbot-pairing/blob/fix/pairing-auth-detection/index.js
require("dotenv").config();

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const fs = require("fs");
const path = require("path");

const {
    startWhisperBot
} = require("./bot-runtime");
const {
    syncWhisperBotSource
} = require("./source-sync");
const {
    getTelegramLanguage,
    setTelegramLanguage,
    telegramT
} = require("./language");
const TELEGRAM_BOT_TOKEN =
    process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
    console.error("❌ TELEGRAM_BOT_TOKEN is missing.");
    process.exit(1);
}

/* =========================
   DIRECTORIES
========================= */

const ROOT_DIR = __dirname;

const TEMPLATE_DIR =
    path.join(
        ROOT_DIR,
        "whisperbot-template"
    );

const INSTANCES_DIR =
    path.join(
        ROOT_DIR,
        "instances"
    );

if (!fs.existsSync(INSTANCES_DIR)) {
    fs.mkdirSync(
        INSTANCES_DIR,
        {
            recursive: true
        }
    );
}

/*
 * phone -> session object
 */

const sessions = new Map();

/*
 * phone -> child WhisperBot process
 */

const botProcesses = new Map();

/* =========================
   TELEGRAM API
========================= */

async function telegram(
    method,
    data = {}
) {

    const response =
        await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(data)
            }
        );

    const result =
        await response.json();

    if (!result.ok) {

        throw new Error(
            result.description ||
            "Telegram API request failed"
        );
    }

    return result.result;
}

/* =========================
   TELEGRAM MESSAGE
========================= */

async function sendTelegramMessage(
    chatId,
    text
) {

    return telegram(
        "sendMessage",
        {
            chat_id: chatId,
            text
        }
    );
}

/* =========================
   PHONE
========================= */

function normalizePhone(input) {

    if (!input) {
        return null;
    }

    const phone =
        String(input)
            .replace(/[^\d]/g, "");

    if (
        phone.length < 7 ||
        phone.length > 15
    ) {
        return null;
    }

    return phone;
}

/* =========================
   INSTANCE PATHS
========================= */

function getInstanceDir(phone) {

    return path.join(
        INSTANCES_DIR,
        phone
    );
}

function getSessionDir(phone) {

    return path.join(
        getInstanceDir(phone),
        "session"
    );
}

/* =========================
   PREPARE INSTANCE
========================= */

function prepareInstance(phone) {

    const instanceDir =
        getInstanceDir(phone);

    /*
     * The template must exist.
     */

    if (!fs.existsSync(TEMPLATE_DIR)) {

        throw new Error(
            `WhisperBot template not found: ${TEMPLATE_DIR}`
        );
    }

    /*
     * Create the isolated instance
     * if it doesn't exist.
     */

    if (!fs.existsSync(instanceDir)) {

        console.log(
            `📦 Creating WhisperBot instance for +${phone}`
        );

        fs.cpSync(
            TEMPLATE_DIR,
            instanceDir,
            {
                recursive: true
            }
        );

        /*
         * The template must never bring
         * authentication or database data
         * into a new user's instance.
         */

        fs.rmSync(
            path.join(
                instanceDir,
                "session"
            ),
            {
                recursive: true,
                force: true
            }
        );

        fs.rmSync(
            path.join(
                instanceDir,
                "database"
            ),
            {
                recursive: true,
                force: true
            }
        );
    }

    /*
     * Make sure every instance has its
     * own database.
     */

    fs.mkdirSync(
        path.join(
            instanceDir,
            "database"
        ),
        {
            recursive: true
        }
    );

    /*
     * Make sure every instance has its
     * own WhatsApp session directory.
     */

    fs.mkdirSync(
        path.join(
            instanceDir,
            "session"
        ),
        {
            recursive: true
        }
    );

    return {
        instanceDir,
        sessionDir:
            getSessionDir(phone)
    };
}

/* =========================
   START BOT INSTANCE
========================= */

function launchWhisperBot(
    phone,
    chatId
) {

    /*
     * Don't launch the same bot twice.
     */

    const existing =
        botProcesses.get(phone);

    if (
        existing &&
        !existing.killed
    ) {

        console.log(
            `ℹ️ WhisperBot instance already running for +${phone}`
        );

        return existing;
    }

    console.log(
        `🚀 Launching WhisperBot for +${phone}`
    );

    const child =
        startWhisperBot(phone);

    botProcesses.set(
        phone,
        child
    );

    child.on(
        "exit",
        async (
            code,
            signal
        ) => {

            /*
             * Check whether the WhisperBot child
             * reported a real WhatsApp logout.
             *
             * The child writes this marker when
             * Baileys receives DisconnectReason.loggedOut.
             */

            const instanceDir =
                getInstanceDir(phone);

            const logoutMarker =
                path.join(
                    instanceDir,
                    ".whisperbot-logged-out"
                );

            const wasLoggedOut =
                fs.existsSync(
                    logoutMarker
                );

            /*
             * Only remove this exact child
             * from the process map.
             */

            if (
                botProcesses.get(phone) ===
                child
            ) {
                botProcesses.delete(
                    phone
                );
            }

            console.log(
                `WhisperBot +${phone} stopped. code=${code} signal=${signal}`
            );

            /*
             * =========================
             * REAL WHATSAPP LOGOUT
             * =========================
             */

            if (
                wasLoggedOut
            ) {

                console.log(
                    `🧹 WhisperBot reported WhatsApp logout for +${phone}`
                );

                /*
                 * Remove the marker so a future
                 * normal process exit is not treated
                 * as a logout.
                 */

                try {

                    fs.rmSync(
                        logoutMarker,
                        {
                            force: true
                        }
                    );

                } catch {}

                /*
                 * Remove the WhatsApp authentication
                 * directory one more time as a safety net.
                 */

                try {

                    fs.rmSync(
                        getSessionDir(phone),
                        {
                            recursive: true,
                            force: true
                        }
                    );

                    console.log(
                        `🧹 Removed WhatsApp session for +${phone}`
                    );

                } catch (err) {

                    console.error(
                        `Failed to remove WhatsApp session for +${phone}:`,
                        err
                    );
                }

                /*
                 * THIS IS THE IMPORTANT FIX.
                 *
                 * The Telegram/pairing session must
                 * also be removed.
                 *
                 * Otherwise /pair sees the old
                 * session and says:
                 *
                 * "pairing session is already active"
                 */

                sessions.delete(
                    phone
                );

                console.log(
                    `🧹 Cleared pairing session for +${phone}`
                );

try {

    await sendTelegramMessage(
        chatId,

        telegramT(
    session.userId,
    "telegram_logged_out_cleared",
    { phone }
)
    );

} catch {}
                return;
            }

            /*
             * =========================
             * NORMAL / UNEXPECTED EXIT
             * =========================
             */

            if (
                code !== 0 &&
                sessions.has(phone)
            ) {

                try {

                    await sendTelegramMessage(
                        chatId,

                        `⚠️ WhisperBot instance for +${phone} stopped unexpectedly.`
                    );

                } catch {}
            }
        }
    );
    return child;
}

/* =========================
   WHATSAPP SOCKET
========================= */

async function createWhatsAppSocket(
    phone,
    session
) {

    /*
     * IMPORTANT:
     *
     * Authentication is stored directly
     * inside the final WhisperBot instance.
     *
     * There is no intermediate copy.
     */

    const {
        sessionDir
    } =
        prepareInstance(phone);

    console.log(
        `Using WhatsApp authentication directory: ${sessionDir}`
    );

    const {
        state,
        saveCreds
    } =
        await useMultiFileAuthState(
            sessionDir
        );

    /*
     * Create the socket using the SAME
     * basic configuration as the working
     * WhisperBot.
     */

    const sock =
        makeWASocket({
            auth: state,

            printQRInTerminal: false,

            logger:
                pino({
                    level: "silent"
                })
        });

    session.sock =
        sock;

    session.state =
        state;

    /*
     * Save every credential update.
     */

    sock.ev.on(
        "creds.update",
        saveCreds
    );

    /*
     * =========================
     * CONNECTION UPDATE
     * =========================
     */

    sock.ev.on(
        "connection.update",
        async update => {
            const {
                connection,
                lastDisconnect
            } = update;

            /*
             * =========================
             * OPEN
             * =========================
             */

            if (connection === "open") {
                session.reconnectAttempts = 0;
                session.reconnecting = false;
                session.connected = true;

                console.log(
                    `✅ WhatsApp connected: +${phone}`
                );

                await new Promise(
                    resolve =>
                        setTimeout(resolve, 1500)
                );

                /*
                 * If this pairing session was rejected,
                 * do not continue into the registered
                 * credentials path.
                 */
                if (session.pairingInvalidated) {
                    return;
                }

                /*
                 * If another process was already launched,
                 * don't launch another.
                 */
                if (
                    session.state?.creds?.registered
                ) {
                    if (!botProcesses.has(phone)) {
                        try {
                            launchWhisperBot(
                                phone,
                                session.chatId
                            );
                        } catch (err) {
                            console.error(
                                `WhisperBot launch error for +${phone}:`,
                                err
                            );

                            try {
                                await sendTelegramMessage(
                                    session.chatId,
                                    telegramT(
    session.userId,
    "telegram_linked_start_failed",
    { phone }
)
                                );
                            } catch {}

                            return;
                        }
                    }

                    try {
                        await sendTelegramMessage(
                            session.chatId,
                            telegramT(
    session.userId,
    "telegram_linked_success",
    { phone }
)
                        );
                    } catch {}

                    /*
                     * The temporary pairing socket is no
                     * longer needed after the real bot starts.
                     */
                    setTimeout(
                        () => {
                            try {
                                session.sock?.ws?.close();
                            } catch {}
                        },
                        2000
                    );

                    return;
                }

                return;
            }

            /*
             * =========================
             * CLOSE
             * =========================
             */

            if (connection !== "close") {
                return;
            }

            session.connected = false;

            const error =
                lastDisconnect?.error;

            const statusCode =
                error?.output?.statusCode;

            console.log(
                `WhatsApp session closed: +${phone} (${statusCode})`
            );

            if (error) {
                console.log(
                    "WhatsApp error details:",
                    JSON.stringify(
                        {
                            statusCode,
                            data: error?.data,
                            message: error?.message
                        },
                        null,
                        2
                    )
                );
            }

            /*
             * =========================
             * LOGGED OUT / REJECTED
             * =========================
             *
             * 401 / loggedOut means the
             * WhatsApp authentication is dead.
             *
             * IMPORTANT:
             * This check MUST happen BEFORE
             * botProcesses.has(phone).
             */

            if (
                statusCode ===
                DisconnectReason.loggedOut
            ) {

                console.log(
                    `❌ WhatsApp logged out/rejected +${phone}`
                );

                session.pairingInvalidated =
                    true;

                /*
                 * Stop the real WhisperBot process
                 * if it is still running.
                 */

                const child =
                    botProcesses.get(
                        phone
                    );

                if (
                    child
                ) {

                    try {

                        if (
                            !child.killed
                        ) {
                            child.kill(
                                "SIGTERM"
                            );
                        }

                    } catch {}

                    if (
                        botProcesses.get(
                            phone
                        ) === child
                    ) {

                        botProcesses.delete(
                            phone
                        );
                    }

                    console.log(
                        `🛑 Stopped WhisperBot process for +${phone}`
                    );
                }

                /*
                 * Remove the WhatsApp authentication.
                 */

                try {

                    fs.rmSync(
                        getSessionDir(phone),
                        {
                            recursive: true,
                            force: true
                        }
                    );

                    console.log(
                        `🧹 Removed stale WhatsApp session for +${phone}`
                    );

                } catch (err) {

                    console.error(
                        `Failed to remove stale WhatsApp session for +${phone}:`,
                        err
                    );
                }

                /*
                 * MOST IMPORTANT:
                 * Clear the pairing-service state.
                 */

                sessions.delete(
                    phone
                );

                console.log(
                    `🧹 Cleared pairing session for +${phone}`
                );

                try {

                    await sendTelegramMessage(
                        session.chatId,

                        telegramT(
    session.userId,
    "telegram_session_logged_out",
    { phone }
)
                    );

                } catch {}

                return;
            }

            /*
             * If the real WhisperBot is already running,
             * the temporary pairing socket closing is expected.
             *
             * This MUST come AFTER the 401 check above.
             */

            if (
                botProcesses.has(phone)
            ) {

                console.log(
                    `Pairing socket closed after WhisperBot launch for +${phone}`
                );

                return;
            }

            /*
             * =========================
             * RESTART REQUIRED
             * =========================
             */
            /*
             * =========================
             * LOGGED OUT / REJECTED
             * =========================
             *
             * 401 / loggedOut means the authentication
             * state must NOT be reconnected.
             *
             * Remove the stale session so the next
             * /pair request starts completely fresh.
             */

            

            /*
             * =========================
             * RESTART REQUIRED
             * =========================
             */

              /*
               * =========================
               * PAIRING TIMEOUT
               * =========================
               *
               * 408 / timedOut means the temporary
               * WhatsApp pairing attempt expired.
               *
               * Do not reconnect an expired pairing
               * socket indefinitely.
               */

              if (
                  statusCode ===
                  DisconnectReason.timedOut
              ) {

                  console.log(
                      `⏱️ WhatsApp pairing timed out for +${phone}`
                  );

                  session.pairingInvalidated =
                      true;

                  try {
                      session.sock?.ws?.close();
                  } catch {}

                  sessions.delete(
                      phone
                  );

                  try {
                      await sendTelegramMessage(
                          session.chatId,

                          telegramT(
                              session.userId ||
                              session.chatId,

                              "telegram_pair_failed",

                              { phone }
                          )
                      );
                  } catch {}

                  return;
              }



            if (
                statusCode ===
                DisconnectReason.restartRequired
            ) {
                console.log(
                    `🔄 WhatsApp requested socket restart for +${phone}`
                );

                await reconnectWhatsApp(
                    phone,
                    session
                );

                return;
            }

            /*
             * =========================
             * OTHER TEMPORARY FAILURE
             * =========================
             */

            console.log(
                `⚠️ Temporary WhatsApp connection failure for +${phone}: ${statusCode}`
            );

            await reconnectWhatsApp(
                phone,
                session
            );
        }
    );

    return sock;
}

/* =========================
   RECONNECT
========================= */

async function reconnectWhatsApp(
    phone,
    session
) {

    /*
     * Don't run two reconnect operations
     * simultaneously.
     */

    if (
        session.reconnecting
    ) {

        console.log(
            `Reconnect already running for +${phone}`
        );

        return;
    }

    /*
     * Never reconnect after the real
     * WhisperBot has already started.
     */

    if (
        botProcesses.has(phone)
    ) {

        return;
    }

    session.reconnecting =
        true;

    session.reconnectAttempts =
        (session.reconnectAttempts || 0) + 1;

    const attempt =
        session.reconnectAttempts;

    /*
     * Five attempts is enough for temporary
     * 515/network failures.
     */

    if (
        attempt > 5
    ) {

        console.log(
            `❌ Maximum reconnect attempts reached for +${phone}`
        );

        session.reconnecting =
            false;

        sessions.delete(
            phone
        );

        try {

            await sendTelegramMessage(
                session.chatId,

                telegramT(
    session.userId,
    "telegram_connection_failed",
    { phone }
)
            );

        } catch {}

        return;
    }

    const delay =
        attempt === 1
            ? 1500
            : 3000;

    console.log(
        `🔄 Restarting WhatsApp socket for +${phone} in ${delay}ms (attempt ${attempt}/5)...`
    );

    await new Promise(
        resolve =>
            setTimeout(
                resolve,
                delay
            )
    );

    /*
     * The Telegram session may have been
     * removed while we were waiting.
     */

    if (
        !sessions.has(phone)
    ) {

        session.reconnecting =
            false;

        return;
    }

    try {

        await createWhatsAppSocket(
            phone,
            session
        );

        console.log(
            `✅ New WhatsApp socket created for +${phone}`
        );

        session.reconnecting =
            false;

    } catch (err) {

        console.error(
            `Reconnect error for +${phone}:`,
            err
        );

        session.reconnecting =
            false;

        /*
         * Retry through the same controlled
         * mechanism.
         */

        if (
            sessions.has(phone) &&
            !botProcesses.has(phone)
        ) {

            await reconnectWhatsApp(
                phone,
                session
            );
        }
    }
}

/* =========================
   CREATE PAIRING SESSION
========================= */

async function createPairingSession(
    phone,
    chatId,
     userId
) {

    /*
     * Don't allow two pairing sessions
     * for the same WhatsApp number.
     */

    if (
        sessions.has(phone)
    ) {

        await sendTelegramMessage(
            chatId,

            telegramT(
                userId,
                "telegram_pair_active",
                { phone }
            )
        );

        return;
    }

    /*
     * Prepare the final isolated instance
     * BEFORE generating the pairing code.
     */

    try {

        prepareInstance(phone);

    } catch (err) {

        console.error(
            `Instance preparation failed for +${phone}:`,
            err
        );

        await sendTelegramMessage(
            chatId,

            telegramT(
                userId,
                "telegram_instance_prepare_failed",
                { phone }
            )
        );

        return;
    }

    /*
     * Session state.
     */

    const session = {

        sock: null,

        state: null,

        chatId,


        userId,

        connected: false,

        reconnecting: false,

        pairingRequested: false,

        pairingCodeSent: false,

reconnectAttempts: 0,
pairingInvalidated: false
    };

    sessions.set(
        phone,
        session
    );

    try {

        /*
         * Create the first socket.
         */

        const sock =
            await createWhatsAppSocket(
                phone,
                session
            );

        session.sock =
            sock;

        /*
         * Give WhatsApp time to establish
         * the initial WebSocket.
         */

                /*
         * Fresh pairing must request the WhatsApp
         * pairing code without waiting for
         * connection === "open".
         *
         * The connection.update handler will mark
         * the session connected after pairing succeeds.
         */

/*
         * If the account is already registered,
         * don't request a pairing code.
         *
         * IMPORTANT:
         * We must validate that the stored credentials actually
         * produce a working connection. Some cases (manual logout,
         * remote invalidation) leave the files present but unusable.
         * So we wait briefly for the socket to become connected.
         */

if (
    !session.pairingInvalidated &&
    session.state?.creds?.registered
) {
            console.log(
                `ℹ️ +${phone} has existing WhatsApp credentials; validating before reuse.`
            );

            // Wait for the socket to open (session.connected set in connection.update)
            const validated = await new Promise(resolve => {
                const checkInterval = 500;
                const timeoutMs = 8000;
                let waited = 0;

                const iv = setInterval(() => {
                    if (session.connected) {
                        clearInterval(iv);
                        resolve(true);
                        return;
                    }
                    waited += checkInterval;
                    if (waited >= timeoutMs) {
                        clearInterval(iv);
                        resolve(false);
                        return;
                    }
                }, checkInterval);
            });

            if (validated) {
                console.log(
                    `ℹ️ Stored credentials for +${phone} validated successfully. Reusing session.`
                );

                /*
                 * Start the bot directly because
                 * this instance already has valid
                 * authentication.
                 */

                if (
                    !botProcesses.has(phone)
                ) {

                    launchWhisperBot(
                        phone,
                        chatId
                    );
                }

                await sendTelegramMessage(
                    chatId,

                    telegramT(
                        userId,
                        "telegram_existing_session",
                        { phone }
                    )
                );

                return;
            }

            // If validation failed, the stored credentials are most likely stale.
            console.log(
                `⚠️ Stored credentials for +${phone} appear invalid (no successful connection). Removing stale session files and requesting a fresh pairing code.`
            );

            try {
                fs.rmSync(
                    getSessionDir(phone),
                    {
                        recursive: true,
                        force: true
                    }
                );

                console.log(
                    `🧹 Removed stale WhatsApp session files for +${phone}`
                );
            } catch (err) {
                console.error(
                    `Failed to remove stale WhatsApp session for +${phone}:`,
                    err
                );
            }

            // Inform operator and continue into pairing flow below.
            try {
                await sendTelegramMessage(
                    chatId,
                    telegramT(
                          userId,
                          "telegram_stale_session",
                          { phone }
                      )
                );
            } catch {}

            // Continue: do not return — proceed to request a new pairing code.
        }

/*
 * =========================
 * REQUEST PAIRING CODE
 * =========================
 *
 * Fresh pairing must give the WhatsApp socket
 * a short moment to establish before requesting
 * the pairing code.
 *
 * This matches the working WhisperBot template,
 * which waits 4 seconds before calling
 * requestPairingCode().
 */

if (!session.pairingRequested) {

    session.pairingRequested = true;

    await new Promise(
        resolve => setTimeout(resolve, 4000)
    );

    if (session.pairingInvalidated) {
        return;
    }

    const code =
        await sock.requestPairingCode(
            phone
        );

    session.pairingCodeSent =
        true;

    console.log(
        "=============================="
    );

    console.log(
        `PAIR CODE 👉 ${code}`
    );

    console.log(
        "=============================="
    );

    await sendTelegramMessage(
        chatId,

        telegramT(
            userId,
            "telegram_pair_code",
            {
                phone,
                code
            }
        )
    );
}

    } catch (err) {

        console.error(
            `Pairing error for +${phone}:`,
            err
        );

        sessions.delete(
            phone
        );

        try {

            await sendTelegramMessage(
                chatId,

                telegramT(
                      message.from.id,
                      "telegram_pair_failed",
                      { phone }
                  )
            );

        } catch {}
    }
}

/* =========================
   TELEGRAM POLLING
========================= */

let telegramOffset = 0;

/*
 * Force Join configuration
 */
const FORCE_JOIN_GROUP_ID =
    -1003987270375;

const FORCE_JOIN_LINK =
    "https://t.me/whisperer_bot_pairing";

/*
 * Telegram owner/admin.
 *
 * This account is never blocked by Force Join.
 */
const TELEGRAM_OWNER_ID =
    8522227392;
async function isUserInRequiredGroup(
    userId
) {

    try {

        const member =
            await telegram(
                "getChatMember",
                {
                    chat_id:
                        FORCE_JOIN_GROUP_ID,

                    user_id:
                        userId
                }
            );

        const status =
            member?.status;

        return [
            "creator",
            "administrator",
            "member"
        ].includes(status);

    } catch (err) {

        console.error(
            "Force join check failed:",
            err
        );

        return false;
    }
}
async function pollTelegram() {

    while (true) {

        try {

            const updates =
                await telegram(
                    "getUpdates",
                    {
                        offset:
                            telegramOffset,

                        timeout: 30
                    }
                );

            for (
                const update
                of updates
            ) {

                telegramOffset =
                    update.update_id + 1;

const callbackQuery =
    update.callback_query;

if (callbackQuery) {

    const userId =
        callbackQuery.from.id;

    const chatId =
        callbackQuery.message.chat.id;

    const data =
        callbackQuery.data;

    if (
        data === "language:en" ||
        data === "language:fr"
    ) {

        const language =
            data.split(":")[1];

        setTelegramLanguage(
            userId,
            language
        );

        await telegram(
            "answerCallbackQuery",
            {
                callback_query_id:
                    callbackQuery.id
            }
        );

        await sendTelegramMessage(
            chatId,
            telegramT(
                userId,
                "telegram_language_selected"
            )
        );
    }

    continue;
}

const message =
    update.message;

if (
    !message?.text
) {
    continue;
}
                const chatId =
                    message.chat.id;

const text =
    message.text.trim();
/*
 * =========================
 * FORCE JOIN CHECK
 * =========================
 *
 * Private users must be members of
 * WhisperBotOfficial before using
 * the pairing service.
 */

if (
    message.chat.type === "private" &&
    message.from.id !== TELEGRAM_OWNER_ID
) {
    const isMember =
        await isUserInRequiredGroup(
            message.from.id
        );

    if (!isMember) {

await telegram(
    "sendMessage",
    {
        chat_id: chatId,

        text:
            telegramT(
                message.from.id,
                "telegram_join_required"
            ),

        reply_markup:
            {
                inline_keyboard: [
                    [
                        {
                            text:
                                telegramT(
                                    message.from.id,
                                    "telegram_join_button"
                                ),

                            url:
                                FORCE_JOIN_LINK
                        }
                    ]
                ]
            }
    }
);
        continue;
    }
}

                /*
                 * =========================
                 * START
                 * =========================
                 */
if (
    text === "/start"
) {

    await telegram(
        "sendMessage",
        {
            chat_id: chatId,

            text: telegramT(
                message.from.id,
                "telegram_start"
            ),

            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text:
                                "🇬🇧 English",

                            callback_data:
                                "language:en"
                        },
                        {
                            text:
                                "🇫🇷 Français",

                            callback_data:
                                "language:fr"
                        }
                    ]
                ]
            }
        }
    );

    continue;
}
/*
 * =========================
 * DELETE PAIRING SESSION
 * =========================
 *
 * Emergency reset for a stuck pairing session.
 *
 * Usage:
 * /deletesession 237XXXXXXXXX
 *
 * This removes only the pairing/authentication
 * state. It does NOT stop a running WhisperBot.
 */

if (
    text === "/deletesession" ||
    text.startsWith("/deletesession ")
) {

    const parts =
        text.split(/\s+/);

    const phone =
        normalizePhone(parts[1]);

    if (!phone) {

        await sendTelegramMessage(
    chatId,
    telegramT(
        message.from.id,
        "telegram_delete_usage"
    )
);

        continue;
    }

    /*
     * NEVER delete the session of a bot
     * that is currently running.
     */
    if (
        botProcesses.has(phone)
    ) {

       await sendTelegramMessage(
    chatId,
    telegramT(
        message.from.id,
        "telegram_bot_running"
    )
);

        continue;
    }

    const existingSession =
        sessions.get(phone);

    /*
     * If a pairing session exists,
     * close its WhatsApp socket first.
     */
    if (
        existingSession?.sock
    ) {

        try {

            existingSession.sock.ws?.close();

        } catch (err) {

            console.log(
                `Pairing socket close warning for +${phone}:`,
                err.message
            );

        }
    }

    /*
     * Remove the in-memory pairing session.
     */
    sessions.delete(
        phone
    );

    /*
     * Remove the WhatsApp authentication
     * directory.
     */
    try {

        fs.rmSync(
            getSessionDir(phone),
            {
                recursive: true,
                force: true
            }
        );

    } catch (err) {

        console.error(
            `Failed to remove WhatsApp session for +${phone}:`,
            err
        );

    }

    /*
     * Remove any stale logout marker.
     */
    try {

        fs.rmSync(
            getLogoutMarkerPath(phone),
            {
                force: true
            }
        );

    } catch {}

    console.log(
        `🧹 Pairing session manually deleted for +${phone}`
    );

await sendTelegramMessage(
    chatId,
    telegramT(
        message.from.id,
        "telegram_session_deleted",
        { phone }
    )
);
    continue;
}

                /*
                 * =========================
                 * PAIR
                 * =========================
                 */

                if (
                    text === "/pair" ||
                    text.startsWith("/pair ")
                ) {

                    const parts =
                        text.split(
                            /\s+/
                        );

                    const phone =
                        normalizePhone(
                            parts[1]
                        );

                    if (!phone) {

                        await sendTelegramMessage(
    chatId,
    telegramT(
        message.from.id,
        "telegram_pair_usage"
    )
);

                        continue;
                    }

                    /*
                     * Don't allow an existing
                     * WhisperBot to be paired
                     * again accidentally.
                     */

                    if (
                        botProcesses.has(phone)
                    ) {

                                                await sendTelegramMessage(
                            chatId,
                            telegramT(
                                message.from.id,
                                "telegram_bot_already_running",
                                { phone }
                            )
                        );

                        continue;
                    }

                    await sendTelegramMessage(
                        chatId,
                        telegramT(
                            message.from.id,
                            "telegram_pair_preparing",
                            { phone }
                        )
                    );
                    /*
                     * Start the pairing process
                     * without blocking Telegram.
                     */

                    createPairingSession(
                        phone,
                        chatId,
                          message.from.id
                    ).catch(
                        async err => {

                            console.error(
                                `Pairing session error for +${phone}:`,
                                err
                            );

                            sessions.delete(
                                phone
                            );

                            try {

                                await sendTelegramMessage(
                                    chatId,
                                    telegramT(
                                        message.from.id,
                                        "telegram_pair_start_failed",
                                        { phone }
                                    )
                                );
                            } catch {}
                        }
                    );

                    continue;
                }
            }

        } catch (err) {

            console.error(
                "Telegram polling error:",
                err.message
            );

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        5000
                    )
            );
        }
    }
}

/* =========================
   MAIN
========================= */

async function main() {

    console.log(
        "================================"
    );

    console.log(
        "🤖 WhisperBot Pairing Service"
    );

    console.log(
        "================================"
    );
    console.log(
        "🔄 Synchronizing WhisperBot source..."
    );

    syncWhisperBotSource();

    console.log(
        `Template: ${TEMPLATE_DIR}`
    );

    console.log(
        `Instances: ${INSTANCES_DIR}`
    );

    console.log(
        "Telegram bot: connected"
    );

    await pollTelegram();
}

/* =========================
   SHUTDOWN
========================= */

async function shutdown(
    signal
) {

    console.log(
        `\nReceived ${signal}. Shutting down...`
    );

    /*
     * Stop pairing sockets.
     */

    for (
        const [
            phone,
            session
        ]
        of sessions
    ) {

        try {

            session.sock?.ws?.close();

        } catch {}

        console.log(
            `Closed pairing socket for +${phone}`
        );
    }

    /*
     * Don't kill the actual WhisperBot
     * processes here unless explicitly
     * requested. They are independent
     * runtime processes.
     */

    process.exit(0);
}

process.on(
    "SIGINT",
    () =>
        shutdown("SIGINT")
);

process.on(
    "SIGTERM",
    () =>
        shutdown("SIGTERM")
);

/* =========================
   START
========================= */

main().catch(
    err => {

        console.error(
            "FATAL ERROR:",
            err
        );

        process.exit(1);
    }
);
