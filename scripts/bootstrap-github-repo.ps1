<#
.SYNOPSIS
  Creates an empty GitHub repo (optional), sets origin, pushes main, then strips the token from the remote URL.

.DESCRIPTION
  Requires a GitHub Personal Access Token with permission to PUSH to the repo.

  * To let the script CREATE the repo via API, use a classic PAT with the repo scope:
    https://github.com/settings/tokens

  * Fine-grained tokens often cannot create repos (GitHub returns 403). Either switch to a
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
  Write-Error @'
Missing token. Create one at https://github.com/settings/tokens then run:

  $env:GITHUB_TOKEN = 'YOUR_TOKEN_HERE'
  powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap-github-repo.ps1
'@
}

$headers = @{
  Authorization          = "Bearer $t"
  Accept                 = 'application/vnd.github+json'
  'X-GitHub-Api-Version' = '2022-11-28'
}

$user = Invoke-RestMethod -Uri 'https://api.github.com/user' -Headers $headers
$login = $user.login
Write-Host ('GitHub API: authenticated as {0}' -f $login)

$slug = if ($Owner.Trim()) { $Owner.Trim() } else { $login }
$repoApi = 'https://api.github.com/repos/{0}/{1}' -f $slug, $RepoName

if ($SkipRepoCreate) {
  Write-Host 'SkipRepoCreate: verifying repo exists...'
  try {
    Invoke-RestMethod -Uri $repoApi -Headers $headers | Out-Null
    Write-Host ('Found {0} - pushing only.' -f $repoApi)
  }
  catch {
    Write-Error (@'
Repo not found or token cannot read it.

Create an EMPTY repository on GitHub (no README, no .gitignore):
  https://github.com/new

Then run again with -SkipRepoCreate.
'@ + "`n`nAPI tried: $repoApi`nUse owner $slug and repository name $RepoName.")
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
    Write-Host ('Repo https://github.com/{0}/{1} already exists; pushing to it.' -f $slug, $RepoName)
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
      Write-Host ('Created https://github.com/{0}/{1}' -f $slug, $RepoName)
    }
    catch {
      $code = 0
      if ($null -ne $_.Exception.Response) {
        $code = [int]$_.Exception.Response.StatusCode
      }
      if ($code -eq 403 -or $code -eq 401) {
        Write-Host ''
        Write-Host ('=== GitHub returned HTTP {0} (cannot create repo with this token) ===' -f $code) -ForegroundColor Yellow
        Write-Host ''
        Write-Host 'Fine-grained tokens usually cannot create new repositories. Fix with ONE of these:'
        Write-Host ''
        Write-Host '  1) Classic PAT with repo scope:'
        Write-Host '     https://github.com/settings/tokens'
        Write-Host '     Generate new token (classic), enable repo.'
        Write-Host ''
        Write-Host '  2) Create the repo in the browser (empty: no README, no .gitignore), then push only:'
        Write-Host ('     https://github.com/new  (name: {0}, account: {1})' -f $RepoName, $slug)
        Write-Host '     powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap-github-repo.ps1 -SkipRepoCreate'
        Write-Host ''
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
if ($LASTEXITCODE -ne 0) { Write-Error ('Not a git repository: {0}' -f $repoRoot) }

$cleanUrl = 'https://github.com/{0}/{1}.git' -f $slug, $RepoName
$pushUrl = 'https://x-access-token:{0}@github.com/{1}/{2}.git' -f $t, $slug, $RepoName
$remotes = @(& $git remote 2>$null)
if ($remotes -contains 'origin') {
  & $git remote set-url origin $cleanUrl
}
else {
  & $git remote add origin $cleanUrl
}
if ($LASTEXITCODE -ne 0) { Write-Error 'Could not add or update git remote origin.' }
& $git remote set-url origin $pushUrl

Write-Host 'Pushing main to origin ...'
& $git push -u origin main
if ($LASTEXITCODE -ne 0) { Write-Error 'git push failed.' }

& $git remote set-url origin $cleanUrl
Write-Host ('Remote reset to {0} (token removed from saved URL).' -f $cleanUrl)
Write-Host ''
Write-Host 'Next: Vercel, Project, Settings, Git: confirm this repo and branch.'
Write-Host 'If builds fail, set Root Directory to greenzone-bolt or rely on repo root vercel.json.'
