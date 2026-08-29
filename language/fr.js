module.exports = {
telegram_pair_next:
    "🇫🇷 Français sélectionné.\n\nFais /pair suivi de ton numéro WhatsApp pour obtenir un code d’appairage.",

telegram_access_restricted:
    "🔒 Accès restreint.\n\nTon compte Telegram n’a pas encore été approuvé.\n\n1️⃣ Obtiens ton identifiant Telegram avec @ScanIDBot.\n2️⃣ Envoie ton 🆔 identifiant Telegram à @The_whisper237.\n3️⃣ Attends l’approbation avant d’utiliser /pair.",
    "telegram_logged_out_cleared": "❌ WhatsApp a été déconnecté pour +{phone}.\n\n🧹 L’ancienne session a été supprimée. Avant de refaire l’appairage, utilisez /deletesession {phone}, puis /pair {phone} pour le reconnecter.",
    "telegram_linked_start_failed": "❌ Le compte WhatsApp a été lié avec succès, mais WhisperBot n'a pas pu démarrer pour +{phone}.",
    "telegram_linked_success": '✅ Le compte WhatsApp +{phone} est lié avec succès.\n\n🚀 WhisperBot démarre maintenant sur ce compte WhatsApp.',
    "telegram_session_logged_out": "❌ La session WhatsApp pour +{phone} a été déconnectée ou rejetée.\n\n🧹 L’ancienne session a été supprimée. Avant de refaire l’appairage, utilisez /deletesession {phone}, puis /pair {phone}.",
    "telegram_connection_failed": "❌ WhatsApp n'a pas pu terminer la connexion pour +{phone}. Veuillez demander un nouveau code d'appairage.",

    telegram_start: `🤖 *Appairage WhisperBot*\n\nChoisissez d'abord votre langue préférée.`,
    telegram_bot_already_running: `ℹ️ WhisperBot est déjà en cours d'exécution pour +{phone}.`,
    telegram_pair_start_failed: `❌ Impossible de démarrer la session d'appairage WhatsApp pour +{phone}.`,
    telegram_language_selected: `🇫🇷 Français sélectionné.`,
    telegram_join_required: `🔒 *Adhésion à WhisperBotOfficial requise*\n\nVous devez rejoindre notre groupe Telegram avant d'utiliser WhisperBot.`,
    telegram_join_button: `🥷 Rejoindre WhisperBotOfficial`,
    telegram_pair_usage: `📌 Utilisation :\n\n/pair 237XXXXXXXXX\n\nExemple :\n/pair 237682349827`,
telegram_pair_preparing: `⏳ Préparation de WhisperBot pour +{phone}...

Un code d'appairage WhatsApp sera généré sous peu.`,
    telegram_pair_active: `⚠️ Une session d'appairage WhatsApp pour +{phone} est déjà active.`,
    telegram_pair_failed: `❌ Impossible de générer un code d’appairage WhatsApp pour +{phone}.\n\n🧹 Avant de réessayer, utilisez /deletesession {phone}, puis /pair {phone}.`,
    telegram_delete_usage: `📌 Utilisation :\n\n/deletesession 237XXXXXXXXX\nExemple :\n/deletesession 237682349827`,
    telegram_session_deleted: `🧹 La session d'appairage pour +{phone} a été supprimée.\n\nVous pouvez maintenant utiliser /pair {phone} à nouveau.`,
    telegram_bot_running: `⚠️ WhisperBot est actuellement en cours d'exécution pour +{phone}.\n\nLe bot actif n'a PAS été touché.`,
    telegram_language_command: `🌐 Choisissez votre langue préférée :`,
    telegram_instance_prepare_failed: `❌ Impossible de préparer l'instance WhisperBot pour +{phone}.`,
    telegram_existing_session: `✅ Le compte WhatsApp +{phone} est déjà lié et validé.\n\n🚀 WhisperBot démarre avec la session WhatsApp existante.`,
    telegram_stale_session: `⚠️ La session WhatsApp enregistrée pour +{phone} n’a pas pu être validée (elle a peut-être été déconnectée à distance).\n\n🧹 Les anciens fichiers de session ont été supprimés. Avant de refaire l’appairage, utilisez /deletesession {phone}, puis /pair {phone} et suivez les étapes d’appairage.`,
    telegram_pair_code: `🔐 Code d'appairage WhatsApp\n\nNuméro : +{phone}\n\nCode : {code}\n\nOuvrez WhatsApp → Appareils liés → Lier un appareil → Lier avec un numéro de téléphone, puis saisissez ce code.\n\n⚠️ Ce code est privé. Ne le partagez pas.\n\nRemarque : si votre compte WhatsApp a été déconnecté manuellement sur votre téléphone, reconnectez-vous d'abord sur le téléphone, puis utilisez ce code pour l'appairage. Si l'appairage échoue, essayez à nouveau /pair {phone}.`,
};
