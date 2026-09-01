#!/bin/bash

set -u

BOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BIN_DIR="$BOT_DIR/bin"

echo "========================================"
echo " Whisperer_Bot Startup"
echo "========================================"
echo ""

mkdir -p "$BIN_DIR"

# ==================================================
# LOCAL BIN DIRECTORY
# ==================================================

export PATH="$BIN_DIR:$PATH"

echo "📁 Bot directory: $BOT_DIR"
echo "📁 Local bin: $BIN_DIR"
echo ""

# ==================================================
# FFMPEG
# ==================================================

echo "🎬 Checking FFmpeg..."

if command -v ffmpeg >/dev/null 2>&1; then

    echo "✅ FFmpeg already available:"
    ffmpeg -version 2>/dev/null | head -n 1

else

    echo "⚠️ System FFmpeg not found."

    FFMPEG_PATH=""

    if [ -f "$BOT_DIR/node_modules/ffmpeg-static/index.js" ]; then
        FFMPEG_PATH="$(node -e "process.stdout.write(require('./node_modules/ffmpeg-static'))" 2>/dev/null || true)"
    fi

    if [ -n "$FFMPEG_PATH" ] && [ -f "$FFMPEG_PATH" ]; then

        echo "✅ Found ffmpeg-static."
        echo "📍 $FFMPEG_PATH"

        ln -sf "$FFMPEG_PATH" "$BIN_DIR/ffmpeg"

        chmod +x "$BIN_DIR/ffmpeg" 2>/dev/null || true

        echo "✅ Local FFmpeg is ready."

    else

        echo "❌ ffmpeg-static is not available."
        echo "❌ Install it with: npm install ffmpeg-static --save"
    fi
fi

echo ""

# ==================================================
# YT-DLP
# ==================================================

echo "🎵 Checking yt-dlp..."

if command -v yt-dlp >/dev/null 2>&1; then

    echo "✅ yt-dlp already available:"
    yt-dlp --version

else

    echo "⚠️ yt-dlp not found in PATH."

    PYTHON=""

    if command -v python3 >/dev/null 2>&1; then
        PYTHON="python3"
    elif command -v python >/dev/null 2>&1; then
        PYTHON="python"
    fi

    if [ -n "$PYTHON" ]; then

        echo "🐍 Python found: $PYTHON"
        "$PYTHON" --version

        echo "📦 Installing yt-dlp locally..."

        "$PYTHON" -m pip install --user -U yt-dlp 2>&1 || true

        # Common Python user-bin locations
        PY_USER_BIN="$("$PYTHON" -m site --user-base 2>/dev/null)/bin"

        if [ -x "$PY_USER_BIN/yt-dlp" ]; then

            ln -sf "$PY_USER_BIN/yt-dlp" "$BIN_DIR/yt-dlp"

            chmod +x "$BIN_DIR/yt-dlp" 2>/dev/null || true

            echo "✅ Local yt-dlp is ready."

        elif command -v yt-dlp >/dev/null 2>&1; then

            echo "✅ yt-dlp installed successfully."

        else

            echo "❌ yt-dlp installation failed."
        fi

    else

        echo "❌ Python is not available."
        echo "❌ Cannot install yt-dlp."

    fi
fi

echo ""

# ==================================================
# FINAL DEPENDENCY CHECK
# ==================================================

echo "========================================"
echo " Dependency Check"
echo "========================================"

if command -v ffmpeg >/dev/null 2>&1; then
    echo "✅ FFmpeg: $(ffmpeg -version 2>/dev/null | head -n 1)"
else
    echo "❌ FFmpeg: NOT AVAILABLE"
fi

if command -v yt-dlp >/dev/null 2>&1; then
    echo "✅ yt-dlp: $(yt-dlp --version 2>/dev/null)"
else
    echo "❌ yt-dlp: NOT AVAILABLE"
fi

echo ""

# ==================================================
# START BOT
# ==================================================

echo "========================================"
echo " Starting WhisperBot"
echo "========================================"
echo ""

exec node "$BOT_DIR/index.js"
