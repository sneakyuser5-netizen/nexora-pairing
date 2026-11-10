const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const {
    syncWhisperBotSource
} = require("./source-sync");

const TEMPLATE_DIR = path.join(__dirname, "whisperbot-template");
const INSTANCES_DIR = path.join(__dirname, "instances");
const SHARED_NODE_MODULES = path.join(__dirname, "node_modules");

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

function updateInstanceSource(instanceDir) {
    if (!fs.existsSync(TEMPLATE_DIR)) {
        throw new Error("Nexora template not found.");
    }

    fs.mkdirSync(instanceDir, {
        recursive: true
    });

    const previousFiles = readPreviousManifest(instanceDir);
    const currentFiles = listTemplateFiles(TEMPLATE_DIR);
    const currentSet = new Set(currentFiles);

    for (const relative of previousFiles) {
        if (
            typeof relative !== "string" ||
            path.isAbsolute(relative) ||
            relative.split(/[\\/]/).includes("..") ||
            currentSet.has(relative)
        ) {
            continue;
        }

        fs.rmSync(path.join(instanceDir, relative), {
            recursive: true,
            force: true
        });
    }

    fs.cpSync(TEMPLATE_DIR, instanceDir, {
        recursive: true,
        force: true,
        filter(sourcePath) {
            const relative = path.relative(
                TEMPLATE_DIR,
                sourcePath
            );

            if (!relative) return true;

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

    fs.mkdirSync(path.join(instanceDir, "session"), {
        recursive: true
    });

    fs.mkdirSync(path.join(instanceDir, "database"), {
        recursive: true
    });
}

function verifyDependencies() {
    const required = [
        "extract-zip",
        "btch-downloader"
    ];

    for (const dependency of required) {
        try {
            require.resolve(dependency, {
                paths: [SHARED_NODE_MODULES]
            });
        } catch {
            throw new Error(
                `Required shared npm dependency is missing: ${dependency}. Check pairing package.json.`
            );
        }
    }

    console.log("✅ Shared Nexora dependencies verified.");
}

function startWhisperBot(phone) {
    const instanceDir = path.join(
        INSTANCES_DIR,
        phone
    );

    console.log(
        `🔄 Fetching latest Nexora source before starting +${phone}`
    );

    syncWhisperBotSource();

    updateInstanceSource(instanceDir);

    verifyDependencies();

    // Remove old per-account dependencies.
    // Session and database folders are NOT touched.
    fs.rmSync(
        path.join(instanceDir, "node_modules"),
        {
            recursive: true,
            force: true
        }
    );

    const sessionDir = path.join(
        instanceDir,
        "session"
    );

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
        NODE_PATH: SHARED_NODE_MODULES,
        WHISPERBOT_PHONE: phone,
        WHISPERBOT_SESSION_DIR: sessionDir,
        WHISPERBOT_LOGOUT_MARKER: logoutMarker
    };

    console.log(
        `🚀 Starting updated Nexora instance for +${phone}`
    );

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
