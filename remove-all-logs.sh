#!/bin/bash

# حذف تمام console.log ها از فایل‌های TypeScript و TSX

echo "🧹 حذف تمام console.log ها..."

# پیدا کردن و حذف console.log
find ./services -name "*.ts" -type f -exec sed -i '/console\.\(log\|error\|warn\|info\|debug\)/d' {} +
find ./components -name "*.tsx" -type f -exec sed -i '/console\.\(log\|error\|warn\|info\|debug\)/d' {} +
find ./pages -name "*.tsx" -type f -exec sed -i '/console\.\(log\|error\|warn\|info\|debug\)/d' {} +
find ./hooks -name "*.ts" -type f -exec sed -i '/console\.\(log\|error\|warn\|info\|debug\)/d' {} + 2>/dev/null

echo "✅ تمام console.log ها حذف شدند!"
