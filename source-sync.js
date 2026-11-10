const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const ROOT_DIR = __dirname;
const TEMPLATE_DIR = path.join(ROOT_DIR, "whisperbot-template");

// The pairing service downloads the bot source from this repository.
const REPO_URL =
    "https://github.com/sneakyuser5-netizen/nexora.git";
const BRANCH = "main";

function runGit(args, cwd) {
    execFileSync("git", args, {
        cwd,
        stdio: "inherit"
    });
}

function syncWhisperBotSource() {
    console.log("================================");
    console.log("🔄 SYNCING NEXORA SOURCE");
    console.log("================================");

    const tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "nexora-source-")
    );

    const sourceDir = path.join(tempDir, "source");
    const stagingDir = path.join(
        ROOT_DIR,
        `.whisperbot-template-staging-${process.pid}-${Date.now()}`
    );
    const backupDir = path.join(
        ROOT_DIR,
        `.whisperbot-template-backup-${process.pid}-${Date.now()}`
    );

    let oldTemplateMoved = false;

    try {
        console.log(`📥 Downloading latest ${BRANCH} branch from ${REPO_URL}`);

        runGit(
            [
                "clone",
                "--depth",
                "1",
                "--single-branch",
                "--branch",
                BRANCH,
                REPO_URL,
                sourceDir
            ],
            ROOT_DIR
        );

        // Build a complete fresh template before touching the active one.
        fs.cpSync(sourceDir, stagingDir, {
            recursive: true
        });

        // Never put Git metadata, installed packages, or account data
        // into the shared template.
        for (const name of [".git", "node_modules", "session", "database"]) {
            fs.rmSync(path.join(stagingDir, name), {
                recursive: true,
                force: true
            });
        }

        fs.mkdirSync(path.join(stagingDir, "database"), {
            recursive: true
        });

        // Swap the template only after the fresh clone and copy succeeded.
        if (fs.existsSync(TEMPLATE_DIR)) {
            fs.renameSync(TEMPLATE_DIR, backupDir);
            oldTemplateMoved = true;
        }

        fs.renameSync(stagingDir, TEMPLATE_DIR);

        if (oldTemplateMoved) {
            fs.rmSync(backupDir, {
                recursive: true,
                force: true
            });
            oldTemplateMoved = false;
        }

        console.log("✅ Nexora template updated from the latest main commit.");
        return TEMPLATE_DIR;
    } catch (error) {
        // Restore the previous working template if the swap failed.
        if (
            oldTemplateMoved &&
            !fs.existsSync(TEMPLATE_DIR) &&
            fs.existsSync(backupDir)
        ) {
            fs.renameSync(backupDir, TEMPLATE_DIR);
            oldTemplateMoved = false;
        }

        console.error("❌ Nexora source synchronization failed:");
        console.error(error.message);
        throw error;
    } finally {
        fs.rmSync(tempDir, {
            recursive: true,
            force: true
        });

        fs.rmSync(stagingDir, {
            recursive: true,
            force: true
        });

        // Do not delete a backup if it is the only recoverable template.
        if (fs.existsSync(TEMPLATE_DIR)) {
            fs.rmSync(backupDir, {
                recursive: true,
                force: true
            });
        }
    }
}

module.exports = {
    syncWhisperBotSource
};
