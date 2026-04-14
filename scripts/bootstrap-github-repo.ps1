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
  Optional: -Branch "master"         (defaults to current branch from git)
#>
param(
  [string]$Token = $env:GITHUB_TOKEN,
  [string]$RepoName = 'my-weed-marketplace',
  [string]$Owner = '',
  [string]$Branch = '',
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
# Fine-grained PATs require your GitHub username as the HTTPS user (token as password).
# x-access-token as user works for many classic PATs but often fails for fine-grained with "denied to <user>".
$encUser = [System.Uri]::EscapeDataString($login)
$encTok = [System.Uri]::EscapeDataString($t)
$pushUrl = 'https://{0}:{1}@github.com/{2}/{3}.git' -f $encUser, $encTok, $slug, $RepoName
$remotes = @(& $git remote 2>$null)
if ($remotes -contains 'origin') {
  & $git remote set-url origin $cleanUrl
}
else {
  & $git remote add origin $cleanUrl
}
if ($LASTEXITCODE -ne 0) { Write-Error 'Could not add or update git remote origin.' }
& $git remote set-url origin $pushUrl

$pushBranch = $Branch.Trim()
if (-not $pushBranch) {
  $pushBranch = (& $git rev-parse --abbrev-ref HEAD).Trim()
  if (-not $pushBranch) { Write-Error 'Could not determine current git branch.' }
}

try {
  Write-Host ('Pushing branch "{0}" to origin ...' -f $pushBranch)
  $pushLines = @(& $git push -u origin $pushBranch 2>&1 | ForEach-Object { "$_" })
  $pushExit = $LASTEXITCODE
  foreach ($line in $pushLines) { Write-Host $line }

  if ($pushExit -ne 0) {
    Write-Host ''
    Write-Host '--- git push troubleshooting (read the lines above) ---' -ForegroundColor Yellow
    $joined = ($pushLines -join "`n")
    if ($joined -match 'Permission .* denied') {
      Write-Host '  * Permission denied (same user in message): usually the PAT cannot write this repo.'
      Write-Host '    For fine-grained tokens: edit the token, set Repository access to this repo,'
      Write-Host '    Contents = Read and write, and authorize SSO if the org requires it.'
      Write-Host '    This script now uses HTTPS user = your API login (required for fine-grained).'
    }
    Write-Host '  * Authentication: token revoked, wrong scopes, or org SSO not authorized for this token.'
    Write-Host '  * rejected (non-fast-forward): GitHub repo is not empty (README).'
    Write-Host '    Fix: delete the repo and create a new EMPTY one, or on GitHub remove the extra commit, then push again.'
    Write-Host '  * Wrong branch: pass -Branch master (or your branch name).'
    Write-Host ''
    Write-Error ('git push failed with exit code {0}.' -f $pushExit)
  }

  Write-Host ('Remote reset to {0} (token removed from saved URL).' -f $cleanUrl)
  Write-Host ''
  Write-Host 'Next: Vercel, Project, Settings, Git: confirm this repo and branch.'
  Write-Host 'If builds fail, set Root Directory to greenzone-bolt or rely on repo root vercel.json.'
}
finally {
  & $git remote set-url origin $cleanUrl 2>$null
}
