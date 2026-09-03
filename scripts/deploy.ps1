<#
.SYNOPSIS
    Deploy Monster Clash: GitHub -> Supabase -> Vercel.

.DESCRIPTION
    Three independent stages; any one can run on its own. The default order
    is deliberate: migrations before the deploy, otherwise code ships that
    reads tables which do not exist yet.

    The script holds NO secrets. Every key is read from an environment
    variable or prompted for as hidden input. Nothing is written to a file
    and nothing is echoed to the console.

    Anything that changes state outside your machine is shown first and
    waits for confirmation, unless -Yes is passed. Start with -DryRun: it
    prints every step without doing any of them.

.PARAMETER Stage
    all (default) | github | supabase | vercel

.PARAMETER Prod
    Production deploy on Vercel. Without it, a preview is deployed.

.PARAMETER Remote
    Target git remote. Defaults to mphpmaster (the reference remote in AGENTS.md).

.PARAMETER Message
    Commit message. Prompted for if omitted and there are changes to commit.

.PARAMETER SkipChecks
    Skip the project checks before deploying. Only use this if you know why.

.PARAMETER DryRun
    Print every step without executing anything.

.PARAMETER Yes
    Do not prompt. For CI only; requires -Message.

.EXAMPLE
    .\scripts\deploy.ps1 -DryRun
    Shows the whole plan without touching anything.

.EXAMPLE
    .\scripts\deploy.ps1 -Stage github -Message "Add user accounts"

.EXAMPLE
    .\scripts\deploy.ps1 -Stage supabase
    Applies migrations to the linked Supabase project.

.EXAMPLE
    .\scripts\deploy.ps1 -Prod
    All three stages, deploying to production.
#>

[CmdletBinding()]
param(
    [ValidateSet('all', 'github', 'supabase', 'vercel')]
    [string]$Stage = 'all',
    [switch]$Prod,
    [string]$Remote = 'mphpmaster',
    [string]$Message,
    [switch]$SkipChecks,
    [switch]$DryRun,
    [switch]$Yes
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# جذر المستودع لا مجلّد السكربت: كل الأوامر تفترض الجذر
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

# ═════════════════════════ output helpers ═════════════════════════

function Write-Step { param([string]$Text) Write-Host "`n> $Text" -ForegroundColor Cyan }
function Write-Ok { param([string]$Text) Write-Host "  [ok]  $Text" -ForegroundColor Green }
function Write-Warn { param([string]$Text) Write-Host "  [!]   $Text" -ForegroundColor Yellow }
function Write-Info { param([string]$Text) Write-Host "  .     $Text" -ForegroundColor DarkGray }

function Write-Fail {
    param([string]$Text)
    Write-Host "  [x]   $Text" -ForegroundColor Red
    exit 1
}

function Confirm-Step {
    param([string]$Question)
    if ($Yes -or $DryRun) { return $true }
    $answer = Read-Host "  ?     $Question [y/N]"
    # العربية مقبولة أيضاً وإن كانت الرسائل بالإنجليزية
    return $answer -match '^(y|yes|ن|نعم)$'
}

# ينفّذ أمراً خارجياً ويفشل عند رمز خروج غير صفري.
function Invoke-Step {
    param(
        [string]$Exe,
        # ليس $Args: هو متغيّر تلقائي في PowerShell يحجب المعامل فيصل فارغاً،
        # فتُنفَّذ الأوامر بلا وسائط أصلاً.
        [string[]]$Arguments,
        [switch]$AllowFail
    )
    $shown = "$Exe $($Arguments -join ' ')"
    if ($DryRun) {
        Write-Host "  [dry-run] $shown" -ForegroundColor DarkYellow
        return @{ Ok = $true; Output = '' }
    }
    Write-Info $shown
    $out = & $Exe @Arguments 2>&1 | Out-String
    if ($out.Trim()) { Write-Host $out.TrimEnd() }
    $ok = ($LASTEXITCODE -eq 0)
    if (-not $ok -and -not $AllowFail) {
        Write-Fail "Failed: $shown (exit code $LASTEXITCODE)"
    }
    return @{ Ok = $ok; Output = $out }
}

function Test-Tool {
    param([string]$Name, [string]$Hint)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Write-Fail "$Name is not installed. $Hint"
    }
    Write-Ok "$Name available"
}

# ═════════════════════════ preflight ═════════════════════════

function Invoke-Preflight {
    Write-Step 'Preflight'

    Test-Tool -Name 'git' -Hint 'https://git-scm.com/downloads'
    Test-Tool -Name 'node' -Hint 'https://nodejs.org'
    Test-Tool -Name 'npx' -Hint 'ships with Node.js'

    if (-not (Test-Path (Join-Path $RepoRoot 'package.json'))) {
        Write-Fail "No package.json in $RepoRoot - run this from inside the repository"
    }

    $branch = (& git rev-parse --abbrev-ref HEAD).Trim()
    Write-Ok "Branch: $branch"

    if ($branch -eq 'HEAD') {
        Write-Fail 'Detached HEAD - check out a branch before deploying'
    }
    # AGENTS.md: main هو الفرع الافتراضي دائماً
    if ($branch -ne 'main') {
        Write-Warn "Not on main. AGENTS.md says main is the default branch for this project."
    }
    return $branch
}

function Invoke-ProjectChecks {
    if ($SkipChecks) {
        Write-Warn 'Project checks skipped (-SkipChecks)'
        return
    }
    Write-Step 'Project checks'

    # الترتيب مقصود: الأسرع أوّلاً فيُكشف العطب قبل انتظار البناء
    $checks = @(
        @{ Name = 'types'; Args = @('run', 'typecheck') },
        @{ Name = 'auth'; Args = @('run', 'check:auth') },
        @{ Name = 'level'; Args = @('run', 'check:level') },
        @{ Name = 'social'; Args = @('run', 'check:social') },
        @{ Name = 'turn clock'; Args = @('run', 'check:clock') },
        @{ Name = 'card effects'; Args = @('run', 'check:effects') },
        @{ Name = 'messages'; Args = @('run', 'check:messages') },
        @{ Name = 'redaction'; Args = @('run', 'check:redact') },
        @{ Name = 'simulation'; Args = @('run', 'simulate', '--', '120') }
    )

    foreach ($c in $checks) {
        if ($DryRun) {
            Write-Host "  [dry-run] npm $($c.Args -join ' ')" -ForegroundColor DarkYellow
            continue
        }
        $out = & npm @($c.Args) 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0) {
            Write-Host $out
            Write-Fail "Check '$($c.Name)' failed - not deploying until it is fixed"
        }
        Write-Ok $c.Name
    }
}

# ═════════════════════════ 1) GitHub ═════════════════════════

function Invoke-GitHubStage {
    param([string]$Branch)

    Write-Step "GitHub - push to $Remote/$Branch"

    $remotes = (& git remote) -split "`n" | ForEach-Object { $_.Trim() }
    if ($remotes -notcontains $Remote) {
        Write-Fail "Remote '$Remote' is not defined. Available: $($remotes -join ', ')"
    }

    $status = (& git status --porcelain) | Out-String
    if ([string]::IsNullOrWhiteSpace($status)) {
        Write-Info 'No local changes - pushing only'
    }
    else {
        Write-Host ''
        Write-Host '  Changes to be committed:' -ForegroundColor White
        & git status --short | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
        Write-Host ''

        if (-not $Message) {
            if ($Yes) { Write-Fail '-Yes requires -Message' }
            # وضع التجربة لا يطلب مدخلات إطلاقاً، وإلا لتعذّر تشغيله في CI
            if ($DryRun) {
                $Message = '<prompted for on a real run>'
            }
            else {
                $Message = Read-Host '  Commit message'
                if ([string]::IsNullOrWhiteSpace($Message)) { Write-Fail 'Commit message is empty' }
            }
        }

        if (-not (Confirm-Step "Commit these changes and push to $Remote/$Branch?")) {
            Write-Warn 'Commit cancelled'
            return
        }

        Invoke-Step -Exe 'git' -Arguments @('add', '-A') | Out-Null
        Invoke-Step -Exe 'git' -Arguments @('commit', '-m', $Message) | Out-Null
        Write-Ok 'Changes committed'
    }

    if (-not (Confirm-Step "Push $Branch to $Remote?")) {
        Write-Warn 'Push cancelled'
        return
    }
    Invoke-Step -Exe 'git' -Arguments @('push', '-u', $Remote, $Branch) | Out-Null
    Write-Ok "Pushed to $Remote/$Branch"

    if (Get-Command 'gh' -ErrorAction SilentlyContinue) {
        Write-Info "To open a pull request: gh pr create --base main --head $Branch --fill"
    }
}

# ═════════════════════════ 2) Supabase ═════════════════════════

<#
    الهجرات هنا مرقّمة 0001/0002 لا بطوابع زمنية، بينما CLI يتتبّع النسخ في
    جدول supabase_migrations.schema_migrations على الخادم. إن كان الخادم يحمل
    نسخاً لا توجد محلياً (لأن المشروع أُعِدّ من اللوحة أو من مستودع آخر) رفض
    `db push` العملَ كلّها.

    عندها لا نلمس تاريخ الهجرات على قاعدة حيّة تلقائياً — نشرح الخيارات ونترك
    القرار للمشغّل.
#>
function Show-MigrationMismatchHelp {
    param([string]$CliOutput)

    Write-Host ''
    Write-Warn 'The remote database has migration versions this repo does not contain.'
    Write-Info 'That happens when the project was set up from the Supabase dashboard or'
    Write-Info 'from another repository. This script will NOT rewrite migration history on'
    Write-Info 'a live database for you.'
    Write-Host ''
    Write-Host '  Pick one:' -ForegroundColor White
    Write-Host ''
    Write-Host '  A) Apply the SQL by hand (simplest, recommended)' -ForegroundColor White
    Write-Info '     Supabase dashboard -> SQL Editor -> paste and run:'
    Write-Info '       supabase/migrations/0002_accounts.sql'
    Write-Info '     It is written to be re-runnable (if not exists / or replace / drop'
    Write-Info '     policy if exists), so a partial run can be repeated safely.'
    Write-Host ''
    Write-Host '  B) Reconcile history first, then push' -ForegroundColor White
    Write-Info '       npx supabase db pull        # bring remote schema into local migrations'
    Write-Info '       npx supabase db push'
    Write-Info '     Review the generated file before pushing.'
    Write-Host ''
    Write-Host '  C) Mark the remote versions as applied (only if you know they are)' -ForegroundColor White
    Write-Info '       npx supabase migration repair --status applied <version> ...'
    Write-Warn '     Do not run the CLI suggestion blindly: it proposes "--status reverted",'
    Write-Warn '     which tells Supabase those migrations were rolled back. If they are'
    Write-Warn '     actually applied, that leaves the history lying about your database.'
    Write-Host ''
}

function Invoke-SupabaseStage {
    Write-Step 'Supabase - apply migrations'

    $migrations = Get-ChildItem (Join-Path $RepoRoot 'supabase/migrations') -Filter '*.sql' |
        Sort-Object Name
    if (-not $migrations) { Write-Fail 'No migration files in supabase/migrations' }
    foreach ($m in $migrations) { Write-Info "migration: $($m.Name)" }

    Write-Host ''
    Write-Warn 'Migrations alter a live database. Try them on a scratch project first.'
    Write-Info 'The linked project is read from supabase/.temp - link it once with:'
    Write-Info '  npx supabase link --project-ref <project-ref>'
    Write-Host ''

    if (-not (Confirm-Step 'Apply migrations to the linked database?')) {
        Write-Warn 'Migration cancelled'
        return
    }

    # npx بدل تثبيت عام: لا يفرض على أحد تثبيت CLI ليدفع كوداً.
    # AllowFail: اختلاف تاريخ الهجرات حالة متوقّعة تستحق شرحاً لا انهياراً.
    $res = Invoke-Step -Exe 'npx' -Arguments @('--yes', 'supabase@latest', 'db', 'push') -AllowFail

    if (-not $res.Ok) {
        if ($res.Output -match 'not found in local migrations|migration repair|migration versions') {
            Show-MigrationMismatchHelp -CliOutput $res.Output
            Write-Fail 'Migrations not applied - see the options above'
        }
        Write-Fail 'npx supabase db push failed - see the output above'
    }

    Write-Ok 'Migrations applied'

    Write-Host ''
    Write-Warn 'After the first apply, turn off public signups in the Supabase dashboard'
    Write-Warn 'under Authentication.'
    Write-Info '/api/auth/register calls admin.createUser, which bypasses that flag, so our'
    Write-Info 'signup keeps working while nobody can create a profile-less account using'
    Write-Info 'the anonymous key.'
}

# ═════════════════════════ 3) Vercel ═════════════════════════

# يقرأ سرّاً من البيئة أو يطلبه مخفيّاً. لا يُطبع ولا يُكتب في ملف.
function Read-Secret {
    param([string]$EnvName, [string]$Label)
    $existing = [Environment]::GetEnvironmentVariable($EnvName)
    if (-not [string]::IsNullOrWhiteSpace($existing)) {
        Write-Ok "$Label taken from environment variable $EnvName"
        return $existing
    }
    if ($Yes) { Write-Fail "-Yes requires $EnvName to be set in the environment" }
    if ($DryRun) { return '<prompted for on a real run>' }
    $secure = Read-Host "  $Label" -AsSecureString
    return [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
}

function Set-VercelEnv {
    param([string]$Name, [string]$Value, [string]$Target)
    if ([string]::IsNullOrWhiteSpace($Value)) {
        Write-Warn "$Name is empty - skipping"
        return
    }
    if ($DryRun) {
        Write-Host "  [dry-run] vercel env add $Name $Target (value hidden)" -ForegroundColor DarkYellow
        return
    }
    # الإزالة أوّلاً لأن add يفشل على متغيّر موجود؛ الفشل هنا متوقَّع ويُتجاهَل
    & vercel env rm $Name $Target --yes 2>&1 | Out-Null
    $Value | & vercel env add $Name $Target 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Fail "Could not set $Name" }
    Write-Ok "Set $Name ($Target)"
}

function Invoke-VercelStage {
    Test-Tool -Name 'vercel' -Hint 'npm i -g vercel'

    $envTarget = if ($Prod) { 'production' } else { 'preview' }
    Write-Step "Vercel - $(if ($Prod) { 'production deploy' } else { 'preview deploy' })"

    if (-not (Test-Path (Join-Path $RepoRoot '.vercel/project.json'))) {
        Write-Warn 'This directory is not linked to a Vercel project.'
        if (-not (Confirm-Step 'Link it now (vercel link)?')) {
            Write-Fail 'Cannot deploy without linking'
        }
        Invoke-Step -Exe 'vercel' -Arguments @('link') | Out-Null
    }

    if (Confirm-Step "Set Supabase environment variables on $envTarget?") {
        $url = [Environment]::GetEnvironmentVariable('NEXT_PUBLIC_SUPABASE_URL')
        if ([string]::IsNullOrWhiteSpace($url)) {
            $url = if ($DryRun) { 'https://<project-ref>.supabase.co' }
                   else { Read-Host '  NEXT_PUBLIC_SUPABASE_URL (not a secret)' }
        }
        $anon = Read-Secret -EnvName 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY' -Label 'Publishable (anon) key'
        $svc = Read-Secret -EnvName 'SUPABASE_SERVICE_ROLE_KEY' -Label 'Service role key (account creation only)'

        Set-VercelEnv -Name 'NEXT_PUBLIC_SUPABASE_URL' -Value $url -Target $envTarget
        Set-VercelEnv -Name 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY' -Value $anon -Target $envTarget
        Set-VercelEnv -Name 'SUPABASE_SERVICE_ROLE_KEY' -Value $svc -Target $envTarget
    }
    else {
        Write-Info 'Skipping environment variables - assuming they are already set'
    }

    $what = if ($Prod) { 'production' } else { 'preview' }
    if (-not (Confirm-Step "Deploy to $what now?")) {
        Write-Warn 'Deploy cancelled'
        return
    }

    $deployArgs = @('deploy')
    if ($Prod) { $deployArgs += '--prod' }
    Invoke-Step -Exe 'vercel' -Arguments $deployArgs | Out-Null
    Write-Ok "Deployed to $what"

    if ($Prod) {
        Write-Host ''
        Write-Warn 'Post-deploy checks:'
        Write-Info '  - open /vs, register an account, then sign in with it'
        Write-Info '  - open / and /play with the network off - both must work'
        Write-Info '  - assetlinks.json is served at /.well-known/assetlinks.json'
    }
}

# ═════════════════════════ run ═════════════════════════

Write-Host ''
Write-Host '  Monster Clash - deploy' -ForegroundColor Magenta
if ($DryRun) { Write-Host '  [dry run: nothing will change]' -ForegroundColor DarkYellow }

$branch = Invoke-Preflight

if ($Stage -in @('all', 'github', 'vercel')) { Invoke-ProjectChecks }

switch ($Stage) {
    'github' { Invoke-GitHubStage -Branch $branch }
    'supabase' { Invoke-SupabaseStage }
    'vercel' { Invoke-VercelStage }
    'all' {
        Invoke-GitHubStage -Branch $branch
        Invoke-SupabaseStage
        Invoke-VercelStage
    }
}

Write-Host ''
Write-Host '  Done.' -ForegroundColor Green
Write-Host ''
