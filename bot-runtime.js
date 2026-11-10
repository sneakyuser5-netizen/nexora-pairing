const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const {
    syncWhisperBotSource
} = require("./source-sync");

const TEMPLATE_DIR = path.join(__dirname, "whisperbot-template");
const INSTANCES_DIR = path.join(__dirname, "instances");
const SOURCE_MANIFEST = ".nexora-source-manifest.json";

const PERSISTENT_ROOTS = new Set([
    "session",
    "database",
    "node_modules"
]);

fs.mkdirSync(INSTANCES_DIR, {
    recursive: true
});

function listTemplateFiles(directory, base = "") {
    const result = [];

    for (const entry of fs.readdirSync(directory, {
        withFileTypes: true
    })) {
        const relative = path.join(base, entry.name);
        const rootName = relative.split(path.sep)[0];

        if (
            PERSISTENT_ROOTS.has(rootName) ||
            entry.name === ".git" ||
            entry.name === SOURCE_MANIFEST
        ) {
            continue;
        }

        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            result.push(...listTemplateFiles(fullPath, relative));
        } else if (entry.isFile()) {
            result.push(relative);
        }
    }

    return result;
}

function readPreviousManifest(instanceDir) {
    const manifestPath = path.join(instanceDir, SOURCE_MANIFEST);

    try {
        const parsed = JSON.parse(
            fs.readFileSync(manifestPath, "utf8")
        );

        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/*
 * Update the source files for one account.
 *
 * session/, database/, and node_modules/ are account/runtime data:
 * they are deliberately excluded from source replacement.
 *
 * A manifest lets us remove old source files that were deleted
 * from the main repository, without deleting user-created files.
 */
function updateInstanceSource(instanceDir) {
    if (!fs.existsSync(TEMPLATE_DIR)) {
        throw new Error(
            `Nexora template not found: ${TEMPLATE_DIR}`
        );
    }

    fs.mkdirSync(instanceDir, {
        recursive: true
    });

    const previousFiles = readPreviousManifest(instanceDir);
    const currentFiles = listTemplateFiles(TEMPLATE_DIR);
    const currentSet = new Set(currentFiles);

    // Remove only files that this updater previously copied and that
    // no longer exist in the latest source repository.
    for (const relative of previousFiles) {
        if (
            typeof relative !== "string" ||
            path.isAbsolute(relative) ||
            relative.split(/[\\/]/).includes("..") ||
            currentSet.has(relative)
        ) {
            continue;
        }

        const oldFile = path.join(instanceDir, relative);
        fs.rmSync(oldFile, {
            recursive: true,
            force: true
        });
    }

    // Overlay the new source while excluding account data and packages.
    fs.cpSync(TEMPLATE_DIR, instanceDir, {
        recursive: true,
        force: true,
        filter(sourcePath) {
            const relative = path.relative(TEMPLATE_DIR, sourcePath);

            if (!relative) {
                return true;
            }

            const rootName = relative.split(path.sep)[0];

            return (
                !PERSISTENT_ROOTS.has(rootName) &&
                rootName !== ".git" &&
                relative !== SOURCE_MANIFEST
            );
        }
    });

    fs.writeFileSync(
        path.join(instanceDir, SOURCE_MANIFEST),
        JSON.stringify(currentFiles, null, 2)
    );

    // Ensure the account's persistent directories always exist.
    fs.mkdirSync(path.join(instanceDir, "session"), {
        recursive: true
    });

    fs.mkdirSync(path.join(instanceDir, "database"), {
        recursive: true
    });
}

/*
 * Start an isolated Nexora instance.
 *
 * IMPORTANT: The main repository is synchronized every time this
 * function is called, including for accounts that already exist.
 */
function startWhisperBot(phone) {
    const instanceDir = path.join(INSTANCES_DIR, phone);

    console.log(`🔄 Fetching latest Nexora source before starting +${phone}`);

    // This fetches the latest commit from nexora/main.
    syncWhisperBotSource();

    // Refresh existing account source without deleting its session/database.
    updateInstanceSource(instanceDir);

    try {
        require.resolve("btch-downloader", {
            paths: [instanceDir]
        });
    } catch (error) {
        throw new Error(
            `Required dependency btch-downloader is missing for +${phone}. ` +
            `Check the pairing service dependency installation.`
        );
    }

    const sessionDir = path.join(instanceDir, "session");
    const logoutMarker = path.join(
        instanceDir,
        ".whisperbot-logged-out"
    );

    fs.rmSync(logoutMarker, {
        force: true
    });

    fs.mkdirSync(sessionDir, {
        recursive: true
    });

    const env = {
        ...process.env,
        WHISPERBOT_PHONE: phone,
        WHISPERBOT_SESSION_DIR: sessionDir,
        WHISPERBOT_LOGOUT_MARKER: logoutMarker
    };

    console.log(`🚀 Starting updated Nexora instance for +${phone}`);

    const child = spawn(
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

    child.on("spawn", () => {
        console.log(
            `✅ Nexora process started for +${phone} (PID ${child.pid})`
        );
    });

    child.on("exit", (code, signal) => {
        console.log(
            `Nexora instance +${phone} stopped. code=${code} signal=${signal}`
        );
    });

    child.on("error", error => {
        console.error(
            `Nexora process error for +${phone}:`,
            error
        );
    });

    return child;
}

module.exports = {
    startWhisperBot
};
