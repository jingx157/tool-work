# Usage:
#   powershell -ExecutionPolicy Bypass -File .\analyze_single_exe.ps1 -ExePath "C:\path\to\app.exe"

param(
  [Parameter(Mandatory=$true)][string]$ExePath,
  [string]$WorkRoot = (Join-Path (Split-Path -Parent $ExePath) ("analysis_" + (Get-Date -Format "yyyyMMdd_HHmmss")))
)

New-Item -ItemType Directory -Path $WorkRoot -Force | Out-Null
Write-Host "Working directory: $WorkRoot"

# helper
function Write-Log($s) { "$((Get-Date).ToString('s')) - $s" | Tee-Object -FilePath (Join-Path $WorkRoot "run.log") -Append }

Write-Log "Starting analysis for: $ExePath"

# 1) quick strings scan
Write-Log "Running strings (embedded) - this may reveal clues"
$stringsExe = "$env:windir\System32\find.exe"  # fallback if Sysinternals strings not installed
# If strings.exe from Sysinternals available in PATH, prefer that:
$sysStrings = (Get-Command strings.exe -ErrorAction SilentlyContinue)
if ($sysStrings) {
  & strings.exe -n 8 $ExePath > (Join-Path $WorkRoot "strings.txt")
  Write-Log "Wrote strings.txt (sysinternals strings)"
} else {
  # Use powershell basic method (slower)
  try {
    $bytes = [System.IO.File]::ReadAllBytes($ExePath)
    $chars = [System.Text.Encoding]::ASCII.GetString($bytes)
    $chars | Out-File -FilePath (Join-Path $WorkRoot "strings.txt") -Encoding ascii
    Write-Log "Wrote strings.txt (ascii dump fallback)"
  } catch {
    Write-Log "Failed to produce strings.txt fallback: $_"
  }
}

# quick keywords search on strings.txt
$keywords = "SECRET","API_KEY","PASSWORD","TOKEN","os.environ","getenv","SECRET_KEY","PRIVATE_KEY","aws_access","boto3","jwt","sign"
foreach ($k in $keywords) {
  Select-String -Path (Join-Path $WorkRoot "strings.txt") -Pattern $k -SimpleMatch -ErrorAction SilentlyContinue |
    ForEach-Object { $_.Line } | Out-File -FilePath (Join-Path $WorkRoot "strings_hits.txt") -Append
}
Write-Log "Saved strings hits (strings_hits.txt)"

# 2) Detect PyInstaller markers in the exe header
$fh = [System.IO.File]::OpenRead($ExePath)
$buf = New-Object byte[] (4096)
$read = $fh.Read($buf, 0, $buf.Length)
$fh.Close()
$headerText = [System.Text.Encoding]::ASCII.GetString($buf, 0, $read)
if ($headerText -match "MEI" -or $headerText -match "PYZ" -or $headerText -match "pyi-archive") {
  Write-Log "PyInstaller markers detected in header -> trying PyInstaller extraction"
  # download pyinstxtractor.py into work dir if not present
  $pyinst = Join-Path $WorkRoot "pyinstxtractor.py"
  if (-not (Test-Path $pyinst)) {
    Write-Log "Attempting to download pyinstxtractor.py..."
    $urls = @(
      "https://raw.githubusercontent.com/extremecoders-re/pyinstxtractor/master/pyinstxtractor.py",
      "https://raw.githubusercontent.com/pyinstaller/pyinstaller/develop/utils/pyinstxtractor.py"
    )
    $got = $false
    foreach ($u in $urls) {
      try {
        Invoke-WebRequest -Uri $u -OutFile $pyinst -UseBasicParsing -ErrorAction Stop
        $got = $true; break
      } catch { Write-Log "download fail: $u" }
    }
    if (-not $got) { Write-Log "Could not download pyinstxtractor.py automatically. Place it into $WorkRoot and re-run."; exit 1 }
  } else {
    Write-Log "Found existing pyinstxtractor.py"
  }

  # run extractor (requires local python)
  $pyExe = "python"
  try {
    & $pyExe $pyinst $ExePath | Tee-Object -FilePath (Join-Path $WorkRoot "pyinstx_output.txt")
    Write-Log "pyinstxtractor output saved"
  } catch {
    Write-Log "Failed to run pyinstxtractor: $_"
  }

  # find extracted folder
  $extracted = Get-ChildItem -Path $WorkRoot -Directory | Where-Object { $_.Name -like "*_extracted" } | Select-Object -First 1
  if (-not $extracted) {
    $extracted = Get-ChildItem -Path $WorkRoot -Directory | Select-Object -First 1
  }
  if ($extracted) {
    Write-Log "Extraction folder: $($extracted.FullName)"
    # install decompiler tools (user scope)
    Write-Log "Installing decompyle3/uncompyle6 (pip --user)"
    & $pyExe -m pip install --user decompyle3 uncompyle6 2>&1 | Out-Null

    # Decompile .pyc files
    $pycFiles = Get-ChildItem -Path $extracted.FullName -Recurse -Include *.pyc -File -ErrorAction SilentlyContinue
    if ($pycFiles.Count -gt 0) {
      foreach ($p in $pycFiles) {
        $out = Join-Path $WorkRoot (($p.FullName -replace "[:\\\/]","_") + ".decompiled.py")
        Write-Log "Decompiling $($p.FullName) -> $out"
        try {
          & $pyExe -m decompyle3 $p.FullName -o $out 2>&1 | Out-Null
          if (-not (Test-Path $out)) {
            & $pyExe -m uncompyle6 $p.FullName > $out 2>&1
          }
        } catch {
          Write-Log "Decompilation error for $($p.FullName): $_"
        }
      }
      Write-Log "Decompilation attempts completed"
    } else {
      Write-Log "No .pyc files found in extracted folder"
    }

    # Search for keywords in extracted + decompiled files
    $allFiles = Get-ChildItem -Path $extracted.FullName -Recurse -File | Select-Object -ExpandProperty FullName
    $allFiles += Get-ChildItem -Path $WorkRoot -Filter "*.decompiled.py" -File -Recurse -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
    $reportFile = Join-Path $WorkRoot "keyword_matches.txt"
    foreach ($k in $keywords) {
      Select-String -Path $allFiles -Pattern $k -SimpleMatch -AllMatches -ErrorAction SilentlyContinue |
        ForEach-Object { "$($_.Path):$($_.LineNumber): $($_.Line.Trim())" } >> $reportFile
    }
    Write-Log "Keyword search finished. Results in $reportFile"
  } else {
    Write-Log "Extraction folder not found; aborting PyInstaller extraction path"
  }
} else {
  Write-Log "No clear PyInstaller markers. This might be a native or .NET exe. Check strings.txt and use appropriate tooling (dnSpy/ILSpy for .NET, Ghidra/strings for native)."
}

Write-Log "Analysis completed. Check $WorkRoot for outputs: strings.txt, strings_hits.txt, run.log, pyinstx_output.txt, keyword_matches.txt, and any decompiled files."
Write-Host "Done. See directory: $WorkRoot"
