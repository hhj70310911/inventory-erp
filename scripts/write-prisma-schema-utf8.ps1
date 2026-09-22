Set-Location (Split-Path $PSScriptRoot -Parent)
node .\scripts\fix-prisma-schema.js
npx prisma validate
