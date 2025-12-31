#!/bin/bash
# Скрипт диагностики PlayFlon на Synology

echo "=========================================="
echo "PlayFlon Диагностика на Synology"
echo "=========================================="
echo ""

echo "1. Проверка запущенных контейнеров:"
echo "-----------------------------------"
docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}" | grep -E "playflon|shortsai|NAME"
echo ""

echo "2. Проверка портов:"
echo "-----------------------------------"
echo "Проверка 3000 (ShortsAI):"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000/health || echo "Недоступен"
echo ""

echo "Проверка 3001 (PlayFlon):"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3001/health || echo "Недоступен"
echo ""

echo "3. Проверка папок с аудио:"
echo "-----------------------------------"
for mode in focus chill sleep ambient; do
    path="/volume1/docker/playflon/audio/$mode"
    if [ -d "$path" ]; then
        file_count=$(find "$path" -type f | wc -l)
        echo "✓ $mode: $file_count файлов"
    else
        echo "✗ $mode: папка не найдена"
    fi
done
echo ""

echo "4. Проверка прав доступа к папке audio:"
echo "-----------------------------------"
ls -ld /volume1/docker/playflon/audio
echo ""

echo "5. Проверка монтирования volume в контейнере:"
echo "-----------------------------------"
docker exec playflon-backend ls -la /app/audio 2>/dev/null || echo "Контейнер не запущен или volume не смонтирован"
echo ""

echo "6. Проверка переменных окружения контейнера:"
echo "-----------------------------------"
docker exec playflon-backend env | grep -E "PORT|AUDIO_BASE_PATH" || echo "Контейнер не запущен"
echo ""

echo "7. Последние логи backend:"
echo "-----------------------------------"
docker logs --tail 20 playflon-backend 2>&1 | tail -10
echo ""

echo "=========================================="
echo "Диагностика завершена"
echo "=========================================="


