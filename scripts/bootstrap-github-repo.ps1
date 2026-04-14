<#
.SYNOPSIS
  Creates an empty GitHub repo (optional), sets origin, pushes main, then strips the token from the remote URL.

.DESCRIPTION
  Requires a GitHub Personal Access Token with permission to PUSH to the repo.

  * To let the script CREATE the repo via API, use a **classic** PAT with the **repo** scope:
    https://github.com/settings/tokens

  * **Fine-grained** tokens often cannot create repos (GitHub returns 403). Either switch to a
    classic PAT, or create an empty repo at https://github.com/new (no README, no .gitignore)
    and run with -SkipRepoCreate.

  Usage:
    $env:GITHUB_TOKEN = 'ghp_....'
    powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap-github-repo.ps1

  Push only (repo already exists on GitHub):
    powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap-github-repo.ps1 -SkipRepoCreate

  Optional: -RepoName "other-name"   -Owner "orgname"  (when repo lives under an org)
#>
param(
  [string]$Token = $env:GITHUB_TOKEN,
  [string]$RepoName = 'my-weed-marketplace',
  [string]$Owner = '',
  [switch]$SkipRepoCreate
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
  Authorization          = "Bearer $t"
  Accept                 = 'application/vnd.github+json'
  'X-GitHub-Api-Version' = '2022-11-28'
}

$user = Invoke-RestMethod -Uri 'https://api.github.com/user' -Headers $headers
$login = $user.login
Write-Host "GitHub API: authenticated as $login"

$slug = if ($Owner.Trim()) { $Owner.Trim() } else { $login }
$repoApi = "https://api.github.com/repos/$slug/$RepoName"

if ($SkipRepoCreate) {
  Write-Host "SkipRepoCreate: verifying repo exists..."
  try {
    Invoke-RestMethod -Uri $repoApi -Headers $headers | Out-Null
    Write-Host "Found $repoApi — pushing only."
  }
  catch {
    Write-Error @"
Repo not found or token cannot read it: $repoApi

Create an EMPTY repository on GitHub (no README, no .gitignore):
  https://github.com/new
Use owner $slug and repository name $RepoName, then run again with -SkipRepoCreate.
"@
  }
}
else {
  $already = $false
  try {
    Invoke-RestMethod -Uri $repoApi -Headers $headers | Out-Null
    $already = $true
  }
  catch {
    $already = $false
  }
  if ($already) {
    Write-Host "Repo https://github.com/$slug/$RepoName already exists; pushing to it."
  }
  else {
    $body = @{
      name         = $RepoName
      description  = 'Monorepo: GreenZone Bolt (Next.js) + Supabase + optional apps.'
      private      = $false
      auto_init    = $false
      has_issues   = $true
      has_projects = $false
      has_wiki     = $false
    } | ConvertTo-Json

    try {
      Invoke-RestMethod -Method Post -Uri 'https://api.github.com/user/repos' -Headers $headers -Body $body -ContentType 'application/json' | Out-Null
      Write-Host "Created https://github.com/$slug/$RepoName"
    }
    catch {
      $code = 0
      if ($null -ne $_.Exception.Response) {
        $code = [int]$_.Exception.Response.StatusCode
      }
      if ($code -eq 403 -or $code -eq 401) {
        Write-Host ""
        Write-Host "=== GitHub returned HTTP $code (cannot create repo with this token) ===" -ForegroundColor Yellow
        Write-Host @"

Fine-grained tokens usually cannot create new repositories. Fix with ONE of these:

  1) Classic PAT with **repo** scope
     https://github.com/settings/tokens  ->  Generate new token (classic)  ->  enable **repo**

  2) Create the repo in the browser (empty: no README, no .gitignore), then push only:
     https://github.com/new  (Repository name: $RepoName, same account ``$slug``)
     Then run:
       powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap-github-repo.ps1 -SkipRepoCreate

"@
        exit 1
      }
      throw
    }
  }
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
$cleanUrl = "https://github.com/$slug/$RepoName.git"
$pushUrl = "https://x-access-token:$t@github.com/$slug/$RepoName.git"
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
