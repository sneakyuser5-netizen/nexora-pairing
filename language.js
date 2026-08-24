const fs = require("fs");
const path = require("path");

const en = require("./language/en");
const fr = require("./language/fr");

const LANGUAGE_FILE = path.join(
    __dirname,
    "database",
    "telegram-language.json"
);

function loadLanguages() {
    try {
        if (!fs.existsSync(LANGUAGE_FILE)) {
            return {};
        }

        return JSON.parse(
            fs.readFileSync(
                LANGUAGE_FILE,
                "utf8"
            )
        );
    } catch {
        return {};
    }
}

function saveLanguages(data) {
    fs.mkdirSync(
        path.dirname(LANGUAGE_FILE),
        {
            recursive: true
        }
    );

    fs.writeFileSync(
        LANGUAGE_FILE,
        JSON.stringify(
            data,
            null,
            2
        )
    );
}

function getTelegramLanguage(userId) {
    const languages =
        loadLanguages();

    return languages[String(userId)] ||
        "en";
}

function setTelegramLanguage(
    userId,
    language
) {
    if (
        language !== "en" &&
        language !== "fr"
    ) {
        return;
    }

    const languages =
        loadLanguages();

    languages[String(userId)] =
        language;

    saveLanguages(
        languages
    );
}

function telegramT(
    userId,
    key,
    replacements = {}
) {
    const language =
        getTelegramLanguage(userId);

    const dictionary =
        language === "fr"
            ? fr
            : en;

    let text =
        dictionary[key] ||
        en[key] ||
        key;

    for (
        const [
            name,
            value
        ] of Object.entries(
            replacements
        )
    ) {
        text = text.replace(
            new RegExp(
                `\\{${name}\\}`,
                "g"
            ),
            String(value)
        );
    }

    return text;
}

module.exports = {
    getTelegramLanguage,
    setTelegramLanguage,
    telegramT
};
