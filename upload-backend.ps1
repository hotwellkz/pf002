# Скрипт для загрузки backend на сервер
$backendPath = "C:\Users\studo\Downloads\PlayFlon\backend"
$remotePath = "/volume1/docker/playflon/backend"
$excludePatterns = @('node_modules', '.env', 'dist', '*.log', '.git')

# Функция для загрузки файла
function Upload-File {
    param(
        [string]$LocalPath,
        [string]$RemotePath
    )
    $relativePath = $LocalPath.Replace($backendPath + '\', '').Replace('\', '/')
    $remoteFilePath = "$RemotePath/$relativePath"
    $remoteDir = Split-Path -Path $remoteFilePath -Parent
    
    # Создаем директорию на сервере
    ssh shortsai "mkdir -p `"$remoteDir`""
    
    # Загружаем файл
    Get-Content $LocalPath -Raw -Encoding UTF8 | ssh shortsai "cat > `"$remoteFilePath`""
}

# Получаем все файлы
$files = Get-ChildItem -Path $backendPath -Recurse -File | Where-Object {
    $shouldExclude = $false
    foreach ($pattern in $excludePatterns) {
        if ($_.FullName -match $pattern) {
            $shouldExclude = $true
            break
        }
    }
    -not $shouldExclude
}

Write-Host "Найдено файлов для загрузки: $($files.Count)"

# Загружаем файлы
foreach ($file in $files) {
    $relativePath = $file.FullName.Replace($backendPath + '\', '').Replace('\', '/')
    Write-Host "Загрузка: $relativePath"
    Upload-File -LocalPath $file.FullName -RemotePath $remotePath
}

Write-Host "Загрузка завершена!"




