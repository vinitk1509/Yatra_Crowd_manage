# ============================================================
#  auto_push.ps1  —  Yatra Crowd Management Auto Git Pusher
#  • Every 10 minutes : commit + push any changed files
#  • Every 60 minutes : full commit + push of ALL code
# ============================================================

$RepoPath = "c:\Users\VAIBHAV KUMAR PAL\Documents\Yatra Crowd Management\Yatra_Crowd_manage"
$Branch = "main"           # change if your branch is different
$IntervalMin = 5                # incremental push interval (minutes)
$FullPushMin = 60               # full push interval (minutes)

Set-Location $RepoPath

$lastFullPush = [datetime]::MinValue
$cycleCount = 0

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Auto-push started  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host " Repo   : $RepoPath" -ForegroundColor Cyan
Write-Host " Branch : $Branch" -ForegroundColor Cyan
Write-Host " Incremental push every $IntervalMin min" -ForegroundColor Cyan
Write-Host " Full push every $FullPushMin min" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

function Do-GitPush {
    param(
        [string]$CommitMessage,
        [bool]$AddAll = $false
    )

    if ($AddAll) {
        git add -A
    }
    else {
        # Stage only modified / new tracked files
        git add -u
        git add .
    }

    # Check if there is anything to commit
    $status = git status --porcelain
    if (-not $status) {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] No changes to commit." -ForegroundColor DarkGray
        return
    }

    git commit -m $CommitMessage
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Commit failed." -ForegroundColor Red
        return
    }

    git push origin $Branch
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Push successful: $CommitMessage" -ForegroundColor Green
    }
    else {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Push FAILED. Check credentials / network." -ForegroundColor Red
    }
}

while ($true) {
    $now = Get-Date
    $cycleCount++

    $minutesSinceFullPush = ($now - $lastFullPush).TotalMinutes

    if ($minutesSinceFullPush -ge $FullPushMin) {
        # ---- FULL PUSH (every 60 min) ----
        $msg = "auto: full push $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
        Write-Host "`n[$(Get-Date -Format 'HH:mm:ss')] === FULL PUSH ===" -ForegroundColor Yellow
        Do-GitPush -CommitMessage $msg -AddAll $true
        $lastFullPush = $now
    }
    else {
        # ---- INCREMENTAL PUSH (every 10 min) ----
        $msg = "auto: incremental push $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
        Write-Host "`n[$(Get-Date -Format 'HH:mm:ss')] --- Incremental push ---" -ForegroundColor Cyan
        Do-GitPush -CommitMessage $msg -AddAll $false
    }

    # Wait for next interval (10 minutes = 600 seconds)
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Next check in $IntervalMin minutes..." -ForegroundColor DarkGray
    Start-Sleep -Seconds ($IntervalMin * 60)
}
