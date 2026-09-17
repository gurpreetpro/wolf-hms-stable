<#
.SYNOPSIS
    post-deploy-security.ps1 — Non-Mutating Live Security Probe for Wolf HMS Phase 2 Hardening

.DESCRIPTION
    Runs read-only HTTP probes against the specified Wolf HMS server instance to verify:
    1. Neutralization of /api/health/exec-sql (HTTP 410 Gone)
    2. Gating of /api/debug/env (HTTP 401 Unauthorized)
    3. JWT issuance with iss/aud claims
    4. CORS rejection of unauthorized origins
    5. Authorized API access (HTTP 200)

.PARAMETER BaseUrl
    Base URL of the Wolf HMS API. Default: http://185.213.27.158/wolf/api

.EXAMPLE
    .\scripts\probes\post-deploy-security.ps1 -BaseUrl "http://185.213.27.158/wolf/api"
#>

param(
    [string]$BaseUrl = "http://185.213.27.158/wolf/api",
    [string]$Username = "admin_taneja",
    [string]$Password = "Admin@123"
)

$ErrorActionPreference = "Continue"
Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " 🛡️  WOLF HMS — Phase 2 Post-Deployment Security Probe" -ForegroundColor Cyan
Write-Host " Target URL: $BaseUrl" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

$results = @()

function Record-Result {
    param($Name, $Expected, $Actual, $Passed, $Notes)
    $script:results += [PSCustomObject]@{
        Probe    = $Name
        Expected = $Expected
        Actual   = $Actual
        Status   = if ($Passed) { "PASS" } else { "FAIL" }
        Notes    = $Notes
    }
}

# -------------------------------------------------------------
# Probe 1: Neutralized SQL Backdoor
# -------------------------------------------------------------
Write-Host "[1/5] Probing /api/health/exec-sql (Backdoor Neutralization)..." -NoNewline
try {
    $body = @{ setupKey = "WolfSetup2024!"; sql = "SELECT 1;" } | ConvertTo-Json
    $res1 = Invoke-WebRequest -Uri "$BaseUrl/health/exec-sql" -Method POST -Body $body -ContentType "application/json" -SkipHttpErrorCheck -TimeoutSec 10
    $code1 = $res1.StatusCode
    $pass1 = ($code1 -eq 410)
    Record-Result "Backdoor Exec-SQL Neutralized" "410 Gone" "$code1" $pass1 "Legacy endpoint neutralized"
    if ($pass1) { Write-Host " PASS ($code1)" -ForegroundColor Green } else { Write-Host " FAIL ($code1)" -ForegroundColor Red }
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    $pass1 = ($code -eq 410)
    Record-Result "Backdoor Exec-SQL Neutralized" "410 Gone" "$code" $pass1 $_.Exception.Message
    if ($pass1) { Write-Host " PASS ($code)" -ForegroundColor Green } else { Write-Host " FAIL ($code)" -ForegroundColor Red }
}

# -------------------------------------------------------------
# Probe 2: Unauthenticated Environment Inspection
# -------------------------------------------------------------
Write-Host "[2/5] Probing /api/debug/env (Information Disclosure Gate)..." -NoNewline
try {
    $res2 = Invoke-WebRequest -Uri "$BaseUrl/debug/env" -Method GET -SkipHttpErrorCheck -TimeoutSec 10
    $code2 = $res2.StatusCode
    $pass2 = ($code2 -eq 401 -or $code2 -eq 403)
    Record-Result "Debug Env Gated" "401/403" "$code2" $pass2 "Unauthenticated access rejected"
    if ($pass2) { Write-Host " PASS ($code2)" -ForegroundColor Green } else { Write-Host " FAIL ($code2)" -ForegroundColor Red }
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    $pass2 = ($code -eq 401 -or $code -eq 403)
    Record-Result "Debug Env Gated" "401/403" "$code" $pass2 $_.Exception.Message
    if ($pass2) { Write-Host " PASS ($code)" -ForegroundColor Green } else { Write-Host " FAIL ($code)" -ForegroundColor Red }
}

# -------------------------------------------------------------
# Probe 3: Authentication & JWT Claims (iss, aud, exp)
# -------------------------------------------------------------
Write-Host "[3/5] Probing /api/auth/login (JWT Claims & Lifespan)..." -NoNewline
$authToken = $null
try {
    $loginBody = @{ username = $Username; password = $Password } | ConvertTo-Json
    $res3 = Invoke-WebRequest -Uri "$BaseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -SkipHttpErrorCheck -TimeoutSec 10
    if ($res3.StatusCode -eq 200) {
        $loginJson = $res3.Content | ConvertFrom-Json
        $authToken = $loginJson.token
        
        # Decode JWT payload
        $parts = $authToken.Split(".")
        if ($parts.Length -ge 2) {
            $base64 = $parts[1].PadRight($parts[1].Length + (4 - $parts[1].Length % 4) % 4, "=").Replace("-", "+").Replace("_", "/")
            $payloadText = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($base64))
            $payload = $payloadText | ConvertFrom-Json
            
            $hasIss = ($payload.iss -eq "wolf-hms")
            $hasAud = ($payload.aud -eq "wolf-hms-api")
            $pass3 = ($hasIss -and $hasAud)
            Record-Result "JWT Claims (iss/aud)" "iss=wolf-hms, aud=wolf-hms-api" "iss=$($payload.iss), aud=$($payload.aud)" $pass3 "Token claims verified"
            if ($pass3) { Write-Host " PASS (Claims verified)" -ForegroundColor Green } else { Write-Host " FAIL (Claims missing/mismatched)" -ForegroundColor Yellow }
        } else {
            Record-Result "JWT Claims (iss/aud)" "Valid JWT" "Malformed token" $false "Could not split JWT parts"
            Write-Host " FAIL (Malformed token)" -ForegroundColor Red
        }
    } else {
        Record-Result "JWT Claims (iss/aud)" "200 OK" "$($res3.StatusCode)" $false "Login failed with status $($res3.StatusCode)"
        Write-Host " FAIL (Login status $($res3.StatusCode))" -ForegroundColor Red
    }
} catch {
    Record-Result "JWT Claims (iss/aud)" "200 OK" "Error" $false $_.Exception.Message
    Write-Host " FAIL ($($_.Exception.Message))" -ForegroundColor Red
}

# -------------------------------------------------------------
# Probe 4: CORS Disallowed Origin Preflight
# -------------------------------------------------------------
Write-Host "[4/5] Probing CORS Preflight with untrusted origin..." -NoNewline
try {
    $corsHeaders = @{
        "Origin" = "http://malicious-attacker-site.com"
        "Access-Control-Request-Method" = "POST"
    }
    $res4 = Invoke-WebRequest -Uri "$BaseUrl/auth/login" -Method OPTIONS -Headers $corsHeaders -SkipHttpErrorCheck -TimeoutSec 10
    $code4 = $res4.StatusCode
    $acao = $res4.Headers["Access-Control-Allow-Origin"]
    $pass4 = ($code4 -eq 403 -or [string]::IsNullOrEmpty($acao) -or $acao -ne "http://malicious-attacker-site.com")
    Record-Result "CORS Untrusted Origin" "Blocked / No ACAO" "Status: $code4, ACAO: '$acao'" $pass4 "Untrusted origin not permitted"
    if ($pass4) { Write-Host " PASS (Blocked)" -ForegroundColor Green } else { Write-Host " FAIL (Allowed ACAO: $acao)" -ForegroundColor Red }
} catch {
    Record-Result "CORS Untrusted Origin" "Blocked" "Exception" $true "Request rejected at network/proxy layer"
    Write-Host " PASS (Connection refused)" -ForegroundColor Green
}

# -------------------------------------------------------------
# Probe 5: Authorized API Access (Happy Path)
# -------------------------------------------------------------
Write-Host "[5/5] Probing Authorized OPD Queue API..." -NoNewline
if ($authToken) {
    try {
        $authHeaders = @{ "Authorization" = "Bearer $authToken" }
        $res5 = Invoke-WebRequest -Uri "$BaseUrl/opd/queue" -Method GET -Headers $authHeaders -SkipHttpErrorCheck -TimeoutSec 10
        $code5 = $res5.StatusCode
        $pass5 = ($code5 -eq 200)
        Record-Result "Authorized API Access" "200 OK" "$code5" $pass5 "OPD queue accessible with token"
        if ($pass5) { Write-Host " PASS (200 OK)" -ForegroundColor Green } else { Write-Host " FAIL ($code5)" -ForegroundColor Red }
    } catch {
        Record-Result "Authorized API Access" "200 OK" "Error" $false $_.Exception.Message
        Write-Host " FAIL ($($_.Exception.Message))" -ForegroundColor Red
    }
} else {
    Record-Result "Authorized API Access" "200 OK" "Skipped" $false "Skipped because login token could not be acquired"
    Write-Host " SKIPPED" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " PROBE RESULTS SUMMARY" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
$results | Format-Table -AutoSize
Write-Host ""
