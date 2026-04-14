# Pushes NEXT_PUBLIC_* from .env to the linked Vercel project.
# Prereqs: npx vercel login, npx vercel link (from greenzone-bolt).

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot\..

if (-not (Test-Path .env)) {
  Write-Error "Missing .env in greenzone-bolt."
}

$url = $null
$key = $null
Get-Content .env | ForEach-Object {
  $t = $_.Trim()
  if ($t -match '^\s*#' -or $t -eq '') { return }
  if ($t -match '^NEXT_PUBLIC_SUPABASE_URL=(.+)$') { $url = $matches[1].Trim().Trim('"') }
  if ($t -match '^NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)$') { $key = $matches[1].Trim().Trim('"') }
}

if (-not $url -or -not $key) {
  Write-Error "Parse .env for NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY failed."
}

Write-Host "NEXT_PUBLIC_SUPABASE_URL (production)..."
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production --value $url --yes --force
Write-Host "NEXT_PUBLIC_SUPABASE_URL (development)..."
npx vercel env add NEXT_PUBLIC_SUPABASE_URL development --value $url --yes --force

Write-Host "NEXT_PUBLIC_SUPABASE_ANON_KEY (production, sensitive)..."
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --value $key --yes --force --sensitive

# Vercel API: sensitive vars cannot target Development
Write-Host "NEXT_PUBLIC_SUPABASE_ANON_KEY (development, not sensitive — Vercel limitation)..."
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY development --value $key --yes --force

Write-Host ""
Write-Host "Preview: skipped unless this project has Git connected. Add Preview env in the Vercel dashboard, or connect the repo and run:"
Write-Host "  npx vercel env add NEXT_PUBLIC_SUPABASE_URL preview <branch> --value `"$url`" --yes --force"
Write-Host "  npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview <branch> --value `"<key>`" --yes --force --sensitive"
Write-Host ""
Write-Host "Done."
