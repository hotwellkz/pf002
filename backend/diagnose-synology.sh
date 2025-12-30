#!/bin/bash
# Диагностика playflon backend на Synology

set -e

CONTAINER_NAME="playflon-backend"

echo "=========================================="
echo "🔍 Диагностика Playflon Backend"
echo "=========================================="

# 1. Проверка контейнера
echo ""
echo "1️⃣ Проверка контейнера..."
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "✅ Контейнер $CONTAINER_NAME запущен"
    CONTAINER_ID=$(docker ps --format '{{.ID}}' --filter "name=${CONTAINER_NAME}")
    echo "   Container ID: $CONTAINER_ID"
else
    echo "❌ Контейнер $CONTAINER_NAME не найден"
    echo "   Запущенные контейнеры:"
    docker ps --format '{{.Names}}'
    exit 1
fi

# 2. Проверка логов
echo ""
echo "2️⃣ Последние 50 строк логов:"
docker logs --tail=50 $CONTAINER_NAME

# 3. Проверка переменных окружения
echo ""
echo "3️⃣ Переменные окружения в контейнере:"
docker exec $CONTAINER_NAME sh -c 'echo "AUDIO_BASE_PATH=$AUDIO_BASE_PATH"'
docker exec $CONTAINER_NAME sh -c 'cat /app/.env 2>/dev/null | grep AUDIO_BASE_PATH || echo "⚠️ .env не найден или AUDIO_BASE_PATH не установлен"'

# 4. Проверка volume mount
echo ""
echo "4️⃣ Проверка volume mount /app/audio:"
if docker exec $CONTAINER_NAME sh -c 'test -d /app/audio && echo "✅ /app/audio существует" || echo "❌ /app/audio не существует"'; then
    echo ""
    echo "   Содержимое /app/audio:"
    docker exec $CONTAINER_NAME sh -c 'ls -lah /app/audio/ 2>/dev/null || echo "⚠️ Не удалось прочитать /app/audio"'
    
    echo ""
    echo "   Проверка focus/test.mp3:"
    if docker exec $CONTAINER_NAME sh -c 'test -f /app/audio/focus/test.mp3 && echo "✅ Файл существует" || echo "❌ Файл не найден"'; then
        docker exec $CONTAINER_NAME sh -c 'ls -lah /app/audio/focus/test.mp3 2>/dev/null'
        docker exec $CONTAINER_NAME sh -c 'file /app/audio/focus/test.mp3 2>/dev/null || echo "⚠️ Не удалось определить тип файла"'
    fi
fi

# 5. Проверка пути из кода
echo ""
echo "5️⃣ Проверка пути, который использует код:"
AUDIO_PATH=$(docker exec $CONTAINER_NAME sh -c 'node -e "const path = require(\"path\"); const base = process.env.AUDIO_BASE_PATH || \"/app/audio\"; console.log(path.resolve(base));"')
echo "   AUDIO_BASE_PATH (из env): $AUDIO_PATH"
FULL_PATH=$(docker exec $CONTAINER_NAME sh -c "node -e \"const path = require('path'); const base = process.env.AUDIO_BASE_PATH || '/app/audio'; console.log(path.join(base, 'focus', 'test.mp3'));\"")
echo "   Полный путь к focus/test.mp3: $FULL_PATH"
docker exec $CONTAINER_NAME sh -c "test -f \"$FULL_PATH\" && echo '   ✅ Файл найден по этому пути' || echo '   ❌ Файл не найден по этому пути'"

# 6. Проверка API endpoint
echo ""
echo "6️⃣ Тест API endpoint:"
echo "   Создание тестовой сессии..."
SESSION_RESPONSE=$(docker exec $CONTAINER_NAME sh -c 'curl -s -X POST http://127.0.0.1:3001/api/session/start -H "Content-Type: application/json" -d "{\"mood\":\"focus\"}"')
echo "   Ответ: $SESSION_RESPONSE"
SESSION_ID=$(echo $SESSION_RESPONSE | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -n "$SESSION_ID" ]; then
    echo "   Session ID: $SESSION_ID"
    echo ""
    echo "   Тест /api/wave/next:"
    docker exec $CONTAINER_NAME sh -c "curl -i -s 'http://127.0.0.1:3001/api/wave/next?sessionId=$SESSION_ID&mood=focus'"
else
    echo "   ⚠️ Не удалось создать сессию"
fi

echo ""
echo "=========================================="
echo "✅ Диагностика завершена"
echo "=========================================="

