module.exports = {
    "telegram_logged_out_cleared": '❌ WhatsApp logged out for +{phone}.\n\n🧹 The old session was cleared. You can now use /pair {phone} to link it again.',
    "telegram_linked_start_failed": '❌ WhatsApp was linked successfully, but WhisperBot could not be started for +{phone}.',
    "telegram_linked_success": '✅ WhatsApp account +{phone} is linked successfully.\n\n🚀 WhisperBot is now starting on this WhatsApp account.',
    "telegram_session_logged_out": '❌ WhatsApp session for +{phone} was logged out/rejected.\n\n🧹 The old session has been removed. You can now use /pair {phone} again.',
    "telegram_connection_failed": '❌ WhatsApp could not complete the connection for +{phone}. Please request a new pairing code.',

    telegram_start: `🤖 *WhisperBot Pairing*\n\nChoose your preferred language first.`,
    telegram_bot_already_running: `ℹ️ WhisperBot is already running for +{phone}.`,
    telegram_pair_start_failed: `❌ Unable to start the WhatsApp pairing session for +{phone}.`,
    telegram_language_selected: `🇬🇧 English selected.`,
    telegram_join_required: `🔒 *WhisperBotOfficial membership required*\nYou must join our Telegram group before using WhisperBot.`,
    telegram_join_button: `🥷 Join WhisperBotOfficial`,
    telegram_pair_usage: `📌 Usage:\n\n/pair 237XXXXXXXXX\n\nExample:\n/pair 237682349827`,
telegram_pair_preparing: `⏳ Preparing WhisperBot for +{phone}...

A WhatsApp pairing code will be generated shortly.`,
    telegram_pair_active: `⚠️ A WhatsApp pairing session for +{phone} is already active.`,
    telegram_pair_failed: `❌ Unable to generate a WhatsApp pairing code for +{phone}.`,
    telegram_delete_usage: `📌 Usage:\n\n/deletesession 237XXXXXXXXX\n\nExample:\n/deletesession 237682349827`,
    telegram_session_deleted: `🧹 Pairing session for +{phone} has been cleared.\n\nYou can now use /pair {phone} again.`,
    telegram_bot_running: `⚠️ WhisperBot is currently running for +{phone}.\n\nThe active bot was NOT touched.`,
    telegram_language_command: `🌐 Choose your preferred language:`,
    telegram_instance_prepare_failed: `❌ Unable to prepare the WhisperBot instance for +{phone}.`,
    telegram_existing_session: `✅ WhatsApp account +{phone} is already linked and validated.\n\n🚀 WhisperBot is starting using the existing WhatsApp session.`,
    telegram_stale_session: `⚠️ The saved WhatsApp session for +{phone} could not be validated (it may have been logged out remotely). I removed the stale session files and will now generate a fresh pairing code. Please run /pair {phone} again and follow the pairing steps.`,
    telegram_pair_code: `🔐 WhatsApp Pairing Code\n\nNumber: +{phone}\n\nCode: {code}\n\nOpen WhatsApp → Linked Devices → Link a device → Link with phone number, then enter this code.\n\n⚠️ The code is private. Do not share it.\n\nNote: If your WhatsApp account was logged out manually on your phone, re-login on the phone first and then use this code to pair. If pairing fails, try /pair {phone} again.`,
};
