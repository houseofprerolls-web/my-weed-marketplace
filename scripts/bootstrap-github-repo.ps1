<#
.SYNOPSIS
  Creates an empty GitHub repo, sets origin, pushes main, then strips the token from the remote URL.

.DESCRIPTION
  Requires a GitHub Personal Access Token:
  - Classic: https://github.com/settings/tokens — enable scope "repo".
  - Fine-grained: repository contents read/write for the new repo.

  Usage:
    $env:GITHUB_TOKEN = 'ghp_....'   # or github_pat_... for fine-grained
    powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap-github-repo.ps1

  Optional: -RepoName "other-name" if my-weed-marketplace is taken.
#>
param(
  [string]$Token = $env:GITHUB_TOKEN,
  [string]$RepoName = 'my-weed-marketplace'
)

$ErrorActionPreference = 'Stop'

$t = $Token
if ([string]::IsNullOrWhiteSpace($t)) { $t = $env:GITHUB_TOKEN }
if ($null -eq $t) { $t = '' }
$t = $t.Trim()
if ([string]::IsNullOrWhiteSpace($t)) {
  Write-Error @"
Missing token. Create one at https://github.com/settings/tokens then run:

  `$env:GITHUB_TOKEN = 'YOUR_TOKEN_HERE'
  powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap-github-repo.ps1
"@
}

$headers = @{
  Authorization        = "Bearer $t"
  Accept               = 'application/vnd.github+json'
  'X-GitHub-Api-Version' = '2022-11-28'
}

$user = Invoke-RestMethod -Uri 'https://api.github.com/user' -Headers $headers
$login = $user.login
Write-Host "GitHub API: authenticated as $login"

$body = @{
  name         = $RepoName
  description  = 'Monorepo: GreenZone Bolt (Next.js) + Supabase + optional apps.'
  private      = $false
  auto_init    = $false
  has_issues   = $true
  has_projects = $false
  has_wiki     = $false
} | ConvertTo-Json

$repoApi = "https://api.github.com/repos/$login/$RepoName"
$already = $false
try {
  Invoke-RestMethod -Uri $repoApi -Headers $headers | Out-Null
  $already = $true
}
catch {
  $already = $false
}
if ($already) {
  Write-Host "Repo https://github.com/$login/$RepoName already exists; pushing to it."
}
else {
  Invoke-RestMethod -Method Post -Uri 'https://api.github.com/user/repos' -Headers $headers -Body $body -ContentType 'application/json' | Out-Null
  Write-Host "Created https://github.com/$login/$RepoName"
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repoRoot

$git = $null
foreach ($c in @('C:\Program Files\Git\bin\git.exe', 'git')) {
  if ($c -eq 'git') { $git = 'git'; break }
  if (Test-Path $c) { $git = $c; break }
}
if (-not $git) { Write-Error 'git not found. Install Git for Windows.' }

& $git rev-parse --is-inside-work-tree 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Error "Not a git repository: $repoRoot" }

& $git remote remove origin 2>$null
$cleanUrl = "https://github.com/$login/$RepoName.git"
$pushUrl = "https://x-access-token:$t@github.com/$login/$RepoName.git"
& $git remote add origin $cleanUrl
& $git remote set-url origin $pushUrl

Write-Host "Pushing main -> origin ..."
& $git push -u origin main
if ($LASTEXITCODE -ne 0) { Write-Error 'git push failed.' }

& $git remote set-url origin $cleanUrl
Write-Host "Remote reset to $cleanUrl (token removed from saved URL)."
Write-Host ""
Write-Host "Next: Vercel -> Project -> Settings -> Git -> confirm this repo/branch."
Write-Host "If builds fail, set Root Directory to greenzone-bolt OR rely on repo root vercel.json."
