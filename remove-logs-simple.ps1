# Simple script to remove console logs
Write-Host "Starting to remove console logs..." -ForegroundColor Cyan

$count = 0

# Process services folder
Get-ChildItem -Path "services" -Filter "*.ts" -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8
    $newContent = $content -replace '(?m)^\s*console\.(log|error|warn|info|debug)\([^)]*\);?\s*[\r\n]+', ''
    if ($content -ne $newContent) {
        Set-Content -Path $_.FullName -Value $newContent -NoNewline -Encoding UTF8
        Write-Host "  [OK] $($_.Name)" -ForegroundColor Green
        $count++
    }
}

# Process components folder
Get-ChildItem -Path "components" -Filter "*.tsx" -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8
    $newContent = $content -replace '(?m)^\s*console\.(log|error|warn|info|debug)\([^)]*\);?\s*[\r\n]+', ''
    if ($content -ne $newContent) {
        Set-Content -Path $_.FullName -Value $newContent -NoNewline -Encoding UTF8
        Write-Host "  [OK] $($_.Name)" -ForegroundColor Green
        $count++
    }
}

# Process pages folder
Get-ChildItem -Path "pages" -Filter "*.tsx" -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8
    $newContent = $content -replace '(?m)^\s*console\.(log|error|warn|info|debug)\([^)]*\);?\s*[\r\n]+', ''
    if ($content -ne $newContent) {
        Set-Content -Path $_.FullName -Value $newContent -NoNewline -Encoding UTF8
        Write-Host "  [OK] $($_.Name)" -ForegroundColor Green
        $count++
    }
}

Write-Host "`nDone! Processed $count files." -ForegroundColor Cyan
