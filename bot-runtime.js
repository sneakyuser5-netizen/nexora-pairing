const fs = require("fs");
const path = require("path");
const { spawn, execFileSync } = require("child_process");

const {
    syncWhisperBotSource
} = require("./source-sync");

const TEMPLATE_DIR =
    path.join(__dirname, "whisperbot-template");

const INSTANCES_DIR =
    path.join(__dirname, "instances");

if (!fs.existsSync(INSTANCES_DIR)) {
    fs.mkdirSync(INSTANCES_DIR, {
        recursive: true
    });
}

/*
 * Start an isolated WhisperBot instance.
 *
 * Every NEW WhatsApp account receives a fresh,
 * complete copy of the latest main bot repository.
 *
 * Existing instances are NEVER overwritten here.
 */
function startWhisperBot(phone) {

    const instanceDir =
        path.join(
            INSTANCES_DIR,
            phone
        );

    /*
     * =========================
     * NEW INSTANCE
     * =========================
     */

    if (!fs.existsSync(instanceDir)) {

        console.log(
            `🔄 Getting latest WhisperBot source for +${phone}`
        );

        /*
         * The GitHub repository is the single
         * source of truth.
         */
        syncWhisperBotSource();

        console.log(
            `📦 Creating complete WhisperBot instance for +${phone}`
        );

        fs.cpSync(
            TEMPLATE_DIR,
            instanceDir,
            {
                recursive: true
            }
        );

        /*
         * Never copy authentication from template.
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

        /*
         * Never copy database from template.
         */
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

        /*
         * Create fresh instance database.
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
         * Create fresh instance session.
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

        /*
         * Install EVERYTHING required by the
         * freshly downloaded main bot.
         *
         * package.json comes directly from GitHub.
         */
        console.log(
            `📦 Installing dependencies for +${phone}...`
        );

        execFileSync(
            "npm",
            [
                "install",
                "--omit=dev"
            ],
            {
                cwd: instanceDir,
                stdio: "inherit"
            }
        );

        console.log(
            `✅ Dependencies installed for +${phone}`
        );
    }

    /*
     * =========================
     * EXISTING INSTANCE
     * =========================
     *
     * Do NOT replace its source.
     * Do NOT reinstall dependencies.
     * Do NOT touch its database.
     * Do NOT touch its authentication.
     */

    const sessionDir =
        path.join(
            instanceDir,
            "session"
        );

    /*
     * Marker used by the child bot when
     * WhatsApp reports loggedOut / 401.
     *
     * Keep outside session/.
     */
    const logoutMarker =
        path.join(
            instanceDir,
            ".whisperbot-logged-out"
        );

    try {
        fs.rmSync(
            logoutMarker,
            {
                force: true
            }
        );
    } catch {}

    fs.mkdirSync(
        sessionDir,
        {
            recursive: true
        }
    );

    /*
     * Pass instance-specific information
     * to the real WhisperBot.
     */
    const env = {
        ...process.env,

        WHISPERBOT_PHONE:
            phone,

        WHISPERBOT_SESSION_DIR:
            sessionDir,

        WHISPERBOT_LOGOUT_MARKER:
            logoutMarker
    };

    console.log(
        `🚀 Starting WhisperBot instance for +${phone}`
    );

    const child =
        spawn(
            process.execPath,
            ["index.js"],
            {
                cwd: instanceDir,
                env,
                stdio: [
                    "ignore",
                    "inherit",
                    "inherit"
                ]
            }
        );

    child.on(
        "spawn",
        () => {

            console.log(
                `✅ WhisperBot process started for +${phone} (PID ${child.pid})`
            );

        }
    );

    child.on(
        "exit",
        (code, signal) => {

            console.log(
                `WhisperBot instance +${phone} stopped. code=${code} signal=${signal}`
            );

        }
    );

    child.on(
        "error",
        err => {

            console.error(
                `WhisperBot process error for +${phone}:`,
                err
            );

        }
    );

    return child;
}

module.exports = {
    startWhisperBot
};
