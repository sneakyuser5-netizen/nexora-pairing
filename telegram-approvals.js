const fs = require("fs");
const path = require("path");

const APPROVAL_FILE = path.join(
    __dirname,
    "database",
    "telegram-approvals.json"
);

function loadApprovals() {
    try {
        if (!fs.existsSync(APPROVAL_FILE)) {
            return [];
        }

        const data = JSON.parse(
            fs.readFileSync(
                APPROVAL_FILE,
                "utf8"
            )
        );

        return Array.isArray(data)
            ? data.map(String)
            : [];
    } catch {
        return [];
    }
}

function saveApprovals(approvals) {
    fs.mkdirSync(
        path.dirname(APPROVAL_FILE),
        {
            recursive: true
        }
    );

    fs.writeFileSync(
        APPROVAL_FILE,
        JSON.stringify(
            approvals,
            null,
            2
        )
    );
}

function isTelegramApproved(userId) {
    return loadApprovals().includes(
        String(userId)
    );
}

function approveTelegramUser(userId) {
    const id = String(userId);
    const approvals = loadApprovals();

    if (!approvals.includes(id)) {
        approvals.push(id);
        saveApprovals(approvals);
        return true;
    }

    return false;
}

function revokeTelegramUser(userId) {
    const id = String(userId);
    const approvals = loadApprovals();

    const updated = approvals.filter(
        value => value !== id
    );

    if (updated.length !== approvals.length) {
        saveApprovals(updated);
        return true;
    }

    return false;
}

function getApprovedTelegramUsers() {
    return loadApprovals();
}

module.exports = {
    isTelegramApproved,
    approveTelegramUser,
    revokeTelegramUser,
    getApprovedTelegramUsers
};
