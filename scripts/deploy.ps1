<#
.SYNOPSIS
    نشر «مواجهة الوحوش»: GitHub ← Supabase ← Vercel.

.DESCRIPTION
    ثلاث مراحل مستقلّة يمكن تشغيل أيٍّ منها وحدها. الترتيب الافتراضي مقصود:
    الهجرة قبل النشر، وإلا وصل كودٌ يقرأ جداول لم تُنشأ بعد.

    السكربت **لا يحمل أي سرّ**: كل المفاتيح تُقرأ من متغيّرات البيئة أو
    تُطلب تفاعلياً كنصّ مخفيّ، ولا تُكتب في ملف ولا تُطبع في المخرجات.

    كل عملية تغيّر شيئاً خارج جهازك تُعرض أوّلاً وتنتظر تأكيدك، إلا مع
    ‎-Yes. جرّب ‎-DryRun أوّلاً: يطبع ما سيحدث دون أن يفعل شيئاً.

.PARAMETER Stage
    all (الافتراضي) · github · supabase · vercel

.PARAMETER Prod
    نشر إنتاجي على Vercel. بدونه تُنشَر معاينة (preview).

.PARAMETER Remote
    ريموت git المستهدف. الافتراضي mphpmaster (المرجعي في AGENTS.md).

.PARAMETER Message
    رسالة الالتزام. تُطلب تفاعلياً إن غابت وكانت هناك تغييرات.

.PARAMETER SkipChecks
    تخطّي فحوص المشروع قبل النشر. لا تستعمله إلا وأنت تعرف لماذا.

.PARAMETER DryRun
    اطبع كل خطوة دون تنفيذ أي شيء.

.PARAMETER Yes
    لا تسأل. للاستعمال في CI فقط.

.EXAMPLE
    .\scripts\deploy.ps1 -DryRun
    يعرض الخطة كاملة دون لمس شيء.

.EXAMPLE
    .\scripts\deploy.ps1 -Stage github -Message "إضافة الحسابات"

.EXAMPLE
    .\scripts\deploy.ps1 -Stage supabase
    يطبّق الهجرات على مشروع Supabase المربوط.

.EXAMPLE
    .\scripts\deploy.ps1 -Prod
    الثلاث مراحل، والنشر إنتاجي.
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

# ═══════════════════════════ أدوات العرض ═══════════════════════════

function Write-Step { param([string]$Text) Write-Host "`n▸ $Text" -ForegroundColor Cyan }
function Write-Ok { param([string]$Text) Write-Host "  ✓ $Text" -ForegroundColor Green }
function Write-Warn { param([string]$Text) Write-Host "  ! $Text" -ForegroundColor Yellow }
function Write-Info { param([string]$Text) Write-Host "  · $Text" -ForegroundColor DarkGray }

function Write-Fail {
    param([string]$Text)
    Write-Host "  ✗ $Text" -ForegroundColor Red
    exit 1
}

function Confirm-Step {
    param([string]$Question)
    if ($Yes -or $DryRun) { return $true }
    $answer = Read-Host "  ? $Question [y/N]"
    return $answer -match '^(y|yes|ن|نعم)$'
}

# ينفّذ أمراً خارجياً ويفشل عند رمز خروج غير صفري.
# ‎-Quiet يمنع طباعة المخرجات لكنه لا يُخفي الفشل.
function Invoke-Step {
    param(
        [string]$Exe,
        # ليس $Args: هو متغيّر تلقائي في PowerShell يحجب المعامل فيصل فارغاً،
        # فتُنفَّذ الأوامر بلا وسائط أصلاً.
        [string[]]$Arguments,
        [switch]$Quiet,
        [switch]$AllowFail
    )
    $shown = "$Exe $($Arguments -join ' ')"
    if ($DryRun) {
        Write-Host "  [dry-run] $shown" -ForegroundColor DarkYellow
        return ''
    }
    Write-Info $shown
    if ($Quiet) {
        $out = & $Exe @Arguments 2>&1 | Out-String
    }
    else {
        & $Exe @Arguments
        $out = ''
    }
    if ($LASTEXITCODE -ne 0 -and -not $AllowFail) {
        if ($out) { Write-Host $out }
        Write-Fail "فشل: $shown (رمز الخروج $LASTEXITCODE)"
    }
    return $out
}

function Test-Tool {
    param([string]$Name, [string]$Hint)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Write-Fail "$Name غير مثبَّت. $Hint"
    }
    Write-Ok "$Name متاح"
}

# ═══════════════════════════ الفحص المسبق ═══════════════════════════

function Invoke-Preflight {
    Write-Step 'الفحص المسبق'

    Test-Tool -Name 'git' -Hint 'https://git-scm.com/downloads'
    Test-Tool -Name 'node' -Hint 'https://nodejs.org'
    Test-Tool -Name 'npx' -Hint 'يأتي مع Node.js'

    if (-not (Test-Path (Join-Path $RepoRoot 'package.json'))) {
        Write-Fail "لا package.json في $RepoRoot — شغّل السكربت من داخل المستودع"
    }

    $branch = (& git rev-parse --abbrev-ref HEAD).Trim()
    Write-Ok "الفرع: $branch"

    if ($branch -eq 'HEAD') {
        Write-Fail 'أنت على HEAD منفصل — انتقل إلى فرع قبل النشر'
    }
    return $branch
}

function Invoke-ProjectChecks {
    if ($SkipChecks) {
        Write-Warn 'تُخطّيت فحوص المشروع (-SkipChecks)'
        return
    }
    Write-Step 'فحوص المشروع'

    # الترتيب مقصود: الأسرع أوّلاً فيُكشف العطب قبل انتظار البناء
    $checks = @(
        @{ Name = 'الأنواع'; Args = @('run', 'typecheck') },
        @{ Name = 'المصادقة'; Args = @('run', 'check:auth') },
        @{ Name = 'المستوى'; Args = @('run', 'check:level') },
        @{ Name = 'الاجتماعيات'; Args = @('run', 'check:social') },
        @{ Name = 'العدّاد'; Args = @('run', 'check:clock') },
        @{ Name = 'التأثيرات'; Args = @('run', 'check:effects') },
        @{ Name = 'الرسائل'; Args = @('run', 'check:messages') },
        @{ Name = 'التنقيص'; Args = @('run', 'check:redact') },
        @{ Name = 'المحاكاة'; Args = @('run', 'simulate', '--', '120') }
    )

    foreach ($c in $checks) {
        if ($DryRun) {
            Write-Host "  [dry-run] npm $($c.Args -join ' ')" -ForegroundColor DarkYellow
            continue
        }
        $out = & npm @($c.Args) 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0) {
            Write-Host $out
            Write-Fail "فشل فحص «$($c.Name)» — لا نشر قبل إصلاحه"
        }
        Write-Ok $c.Name
    }
}

# ═══════════════════════════ 1) GitHub ═══════════════════════════

function Invoke-GitHubStage {
    param([string]$Branch)

    Write-Step "GitHub — الدفع إلى $Remote/$Branch"

    $remotes = (& git remote) -split "`n" | ForEach-Object { $_.Trim() }
    if ($remotes -notcontains $Remote) {
        Write-Fail "الريموت «$Remote» غير معرَّف. المتاح: $($remotes -join '، ')"
    }

    $status = (& git status --porcelain) | Out-String
    if ([string]::IsNullOrWhiteSpace($status)) {
        Write-Info 'لا تغييرات محلّية — الدفع فقط'
    }
    else {
        Write-Host ''
        Write-Host '  التغييرات التي ستُلتزَم:' -ForegroundColor White
        & git status --short | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
        Write-Host ''

        if (-not $Message) {
            if ($Yes) { Write-Fail 'مع -Yes يجب تمرير -Message' }
            # وضع التجربة لا يطلب مدخلات إطلاقاً، وإلا لتعذّر تشغيله في CI
            if ($DryRun) {
                $Message = '<الرسالة تُطلب عند التشغيل الفعلي>'
            }
            else {
                $Message = Read-Host '  رسالة الالتزام'
                if ([string]::IsNullOrWhiteSpace($Message)) { Write-Fail 'رسالة الالتزام فارغة' }
            }
        }

        if (-not (Confirm-Step "التزام هذه التغييرات ودفعها إلى $Remote/$Branch؟")) {
            Write-Warn 'أُلغي الالتزام'
            return
        }

        Invoke-Step -Exe 'git' -Arguments @('add', '-A')
        Invoke-Step -Exe 'git' -Arguments @('commit', '-m', $Message)
        Write-Ok 'التُزمت التغييرات'
    }

    if (-not (Confirm-Step "دفع $Branch إلى $Remote؟")) {
        Write-Warn 'أُلغي الدفع'
        return
    }
    Invoke-Step -Exe 'git' -Arguments @('push', '-u', $Remote, $Branch)
    Write-Ok "دُفع إلى $Remote/$Branch"

    if (Get-Command 'gh' -ErrorAction SilentlyContinue) {
        Write-Info "لفتح طلب دمج: gh pr create --base main --head $Branch --fill"
    }
}

# ═══════════════════════════ 2) Supabase ═══════════════════════════

function Invoke-SupabaseStage {
    Write-Step 'Supabase — تطبيق الهجرات'

    $migrations = Get-ChildItem (Join-Path $RepoRoot 'supabase/migrations') -Filter '*.sql' |
        Sort-Object Name
    if (-not $migrations) { Write-Fail 'لا ملفّات هجرة في supabase/migrations' }
    foreach ($m in $migrations) { Write-Info "هجرة: $($m.Name)" }

    Write-Host ''
    Write-Warn 'الهجرة تُعدّل قاعدة بيانات حيّة. جرّبها على مشروع تجريبي أوّلاً.'
    Write-Info 'المشروع المربوط يُقرأ من supabase/.temp — اربطه مرّة واحدة بـ:'
    Write-Info '  npx supabase link --project-ref <project-ref>'
    Write-Host ''

    if (-not (Confirm-Step 'تطبيق الهجرات على قاعدة البيانات المربوطة؟')) {
        Write-Warn 'أُلغيت الهجرة'
        return
    }

    # npx بدل تثبيت عام: لا يفرض على أحد تثبيت CLI ليدفع كوداً
    Invoke-Step -Exe 'npx' -Arguments @('--yes', 'supabase@latest', 'db', 'push')
    Write-Ok 'طُبِّقت الهجرات'

    Write-Host ''
    Write-Warn 'بعد أول تطبيق، أطفئ «التسجيل العام» من لوحة Supabase → Authentication.'
    Write-Info 'مسار /api/auth/register ينادي admin.createUser فيتخطّاه ويبقى يعمل،'
    Write-Info 'بينما لا يستطيع أحد إنشاء حساب بلا ملفّ شخصي بالمفتاح المجهول.'
}

# ═══════════════════════════ 3) Vercel ═══════════════════════════

# يقرأ سرّاً من البيئة أو يطلبه مخفيّاً. لا يُطبع ولا يُكتب في ملف.
function Read-Secret {
    param([string]$EnvName, [string]$Label)
    $existing = [Environment]::GetEnvironmentVariable($EnvName)
    if (-not [string]::IsNullOrWhiteSpace($existing)) {
        Write-Ok "$Label من متغيّر البيئة $EnvName"
        return $existing
    }
    if ($Yes) { Write-Fail "مع -Yes يجب ضبط $EnvName في البيئة" }
    if ($DryRun) { return '<يُطلب عند التشغيل الفعلي>' }
    $secure = Read-Host "  $Label" -AsSecureString
    return [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
}

function Set-VercelEnv {
    param([string]$Name, [string]$Value, [string]$Target)
    if ([string]::IsNullOrWhiteSpace($Value)) {
        Write-Warn "$Name فارغ — تُخطّي"
        return
    }
    if ($DryRun) {
        Write-Host "  [dry-run] vercel env add $Name $Target (القيمة مخفيّة)" -ForegroundColor DarkYellow
        return
    }
    # الإزالة أوّلاً لأن add يفشل على متغيّر موجود؛ الفشل هنا متوقَّع ويُتجاهَل
    & vercel env rm $Name $Target --yes 2>&1 | Out-Null
    $Value | & vercel env add $Name $Target 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Fail "تعذّر ضبط $Name" }
    Write-Ok "ضُبط $Name ($Target)"
}

function Invoke-VercelStage {
    Test-Tool -Name 'vercel' -Hint 'npm i -g vercel'

    $envTarget = if ($Prod) { 'production' } else { 'preview' }
    Write-Step "Vercel — $(if ($Prod) { 'نشر إنتاجي' } else { 'نشر معاينة' })"

    if (-not (Test-Path (Join-Path $RepoRoot '.vercel/project.json'))) {
        Write-Warn 'المشروع غير مربوط بـVercel في هذا المجلّد.'
        if (-not (Confirm-Step 'ربطه الآن (vercel link)؟')) {
            Write-Fail 'لا نشر بلا ربط'
        }
        Invoke-Step -Exe 'vercel' -Arguments @('link')
    }

    if (Confirm-Step "ضبط متغيّرات Supabase على بيئة $envTarget؟") {
        $url = [Environment]::GetEnvironmentVariable('NEXT_PUBLIC_SUPABASE_URL')
        if ([string]::IsNullOrWhiteSpace($url)) {
            $url = if ($DryRun) { 'https://<project-ref>.supabase.co' }
                   else { Read-Host '  NEXT_PUBLIC_SUPABASE_URL (ليس سرّاً)' }
        }
        $anon = Read-Secret -EnvName 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY' -Label 'المفتاح العام (publishable/anon)'
        $svc = Read-Secret -EnvName 'SUPABASE_SERVICE_ROLE_KEY' -Label 'مفتاح الخدمة (service role) — لإنشاء الحسابات'

        Set-VercelEnv -Name 'NEXT_PUBLIC_SUPABASE_URL' -Value $url -Target $envTarget
        Set-VercelEnv -Name 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY' -Value $anon -Target $envTarget
        Set-VercelEnv -Name 'SUPABASE_SERVICE_ROLE_KEY' -Value $svc -Target $envTarget
    }
    else {
        Write-Info 'تُخطّي المتغيّرات — يُفترض أنها مضبوطة سلفاً'
    }

    $what = if ($Prod) { 'الإنتاج' } else { 'معاينة' }
    if (-not (Confirm-Step "النشر إلى $what الآن؟")) {
        Write-Warn 'أُلغي النشر'
        return
    }

    $deployArgs = @('deploy')
    if ($Prod) { $deployArgs += '--prod' }
    Invoke-Step -Exe 'vercel' -Arguments $deployArgs
    Write-Ok "نُشر إلى $what"

    if ($Prod) {
        Write-Host ''
        Write-Warn 'تحقّق بعد النشر:'
        Write-Info '  · افتح /vs وسجّل حساباً ثم ادخل به'
        Write-Info '  · افتح / و/play والشبكة مقطوعة — يجب أن تعملا'
        Write-Info '  · assetlinks.json متاح على /.well-known/assetlinks.json'
    }
}

# ═══════════════════════════ التشغيل ═══════════════════════════

Write-Host ''
Write-Host '  مواجهة الوحوش — النشر' -ForegroundColor Magenta
if ($DryRun) { Write-Host '  [وضع التجربة: لا شيء سيتغيّر]' -ForegroundColor DarkYellow }

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
Write-Host '  انتهى.' -ForegroundColor Green
Write-Host ''
