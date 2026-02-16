# Remove all console logs from TypeScript and TSX files

Write-Host "Removing all console logs..." -ForegroundColor Yellow

$folders = @("services", "components", "pages", "hooks", "utils")
$extensions = @("*.ts", "*.tsx")

foreach ($folder in $folders) {
    $folderPath = Join-Path $PSScriptRoot $folder
    if (Test-Path $folderPath) {
        foreach ($ext in $extensions) {
            $files = Get-ChildItem -Path $folderPath -Filter $ext -Recurse -File
            foreach ($file in $files) {
                $content = Get-Content $file.FullName -Raw
                if ($content) {
                    # Remove lines with console.log, console.error, console.warn, console.info, console.debug
                    $newContent = $content -replace '(?m)^\s*console\.(log|error|warn|info|debug)\([^)]*\);?\s*$\r?\n', ''
                    
                    if ($content -ne $newContent) {
                        Set-Content -Path $file.FullName -Value $newContent -NoNewline
                        Write-Host "Processed: $($file.Name)" -ForegroundColor Green
                    }
                }
            }
        }
    }
}

Write-Host "`nAll console logs removed successfully!" -ForegroundColor Green
