param(
  [string]$TasksFile,
  [string]$ArchiveFile
)

$ErrorActionPreference = "Stop"

# ── 1. Find tasks.md ──────────────────────────────────────────────
$searchDirs = @($PWD.Path)
$root = $PWD.Path
while ((Split-Path -Parent $root) -and $root -ne (Split-Path -Parent $root)) {
  $root = Split-Path -Parent $root
  $searchDirs += $root
}

if (-not $TasksFile) {
  foreach ($dir in $searchDirs) {
    foreach ($name in @("tasks.md", "TASKS.md")) {
      $candidate = Join-Path -Path $dir -ChildPath $name
      if (Test-Path -LiteralPath $candidate) {
        $TasksFile = $candidate
        break
      }
    }
    if ($TasksFile) { break }
  }
}

if (-not $TasksFile -or -not (Test-Path -LiteralPath $TasksFile)) {
  Write-Output "No tasks.md found, nothing to sync"
  exit 0
}

if (-not $ArchiveFile) {
  $ArchiveFile = Join-Path -Path (Split-Path -Parent $TasksFile) -ChildPath "tasks_archived.md"
}

$tasksDir = Split-Path -Parent $TasksFile

# ── 2. Read file ─────────────────────────────────────────────────
$content = Get-Content -LiteralPath $TasksFile -Raw

# ── 3. Split into sections (delimited by /^---$/ on its own line) ──
# Preserve leading/trailing whitespace within each section.
$separator = [regex]"(?m)^---\s*$"
$blocks = [regex]::Split($content, $separator)

# The first block is the header before the first --- (e.g. "# Master Task List")
$header = $blocks[0].TrimEnd()
$sections = $blocks[1..($blocks.Length - 1)]

$keepSections = @()
$archiveSections = @()

# ── 4. Helpers ────────────────────────────────────────────────────
function HasTableRows([string]$text) {
  # Lines that start with | and have at least one more |
  return [regex]::IsMatch($text, "(?m)^\|[^\n]*\|")
}

function GetTableRows([string]$text) {
  $result = [regex]::Matches($text, "(?m)^\|[^\n]*\|")
  return $result | ForEach-Object { $_.Value }
}

function IsTableRowComplete([string]$row) {
  $cells = $row -split '\|' | ForEach-Object { $_.Trim() }
  $lastCell = ($cells | Where-Object { $_ -ne '' })[-1]
  if (-not $lastCell) { return $false }
  $firstChar = $lastCell.Substring(0, [Math]::Min(1, $lastCell.Length))
  # Accept: ✅ ✔ ☑ (check for Unicode check marks via char code), [x], [X], Done, Complete
  if ($firstChar -eq '[' -and $lastCell.Length -ge 3) {
    return $lastCell.Substring(0, 3) -match '^\[[xX]\]$'
  }
  if ($lastCell -match '^(Done|Complete)$') { return $true }
  # Check for Unicode checkmark characters (U+2705, U+2714, U+2611)
  $code = [int][char]$firstChar
  return ($code -eq 0x2705 -or $code -eq 0x2714 -or $code -eq 0x2611)
}

function GetCheckboxLines([string]$text) {
  $result = [regex]::Matches($text, "(?m)^\s*-\s*\[([ xX])\]\s")
  return $result | ForEach-Object { $_.Value }
}

function IsCheckboxComplete([string]$line) {
  return $line -match '^\s*-\s*\[[xX]\]'
}

# ── 5. Process each section ───────────────────────────────────────
$NEVER_ARCHIVE = @("Status Legend", "Implementation Order")

foreach ($section in $sections) {
  $trimmed = $section.Trim()
  if (-not $trimmed) { continue }

  # Find the ## heading(s) in this block
  $headings = [regex]::Matches($trimmed, "(?m)^## (.+)$")
  $headingTexts = $headings | ForEach-Object { $_.Groups[1].Value.Trim() }

  # Check if ANY heading in this block is in the never-archive list
  $neverArchive = $false
  foreach ($h in $headingTexts) {
    if ($NEVER_ARCHIVE -contains $h) { $neverArchive = $true; break }
  }
  if ($neverArchive) { $keepSections += $section; continue }

  # Check for tables
  $hasTables = HasTableRows($trimmed)
  $tablesComplete = $true
  if ($hasTables) {
    # Skip header/separator rows: keep only data rows (rows with more than 2 | cells or that have content)
    $rows = GetTableRows($trimmed)
    $dataRows = @()
    $skipHeader = $true
    foreach ($row in $rows) {
      # First row might be header, second might be separator (---|---|---)
      if ($skipHeader) { $skipHeader = $false; continue }
      if ($row -match '^\|[\s:-]+\|') { continue } # separator row
      $dataRows += $row
    }
    if ($dataRows.Count -eq 0) { $hasTables = $false }
    else {
      foreach ($row in $dataRows) {
        if (-not (IsTableRowComplete($row))) { $tablesComplete = $false; break }
      }
    }
  }

  # Check for checkboxes
  $checkboxes = GetCheckboxLines($trimmed)
  $hasCheckboxes = $checkboxes.Count -gt 0
  $checkboxesComplete = $true
  if ($hasCheckboxes) {
    foreach ($cb in $checkboxes) {
      if (-not (IsCheckboxComplete($cb))) { $checkboxesComplete = $false; break }
    }
  }

  # Decide: archive only if ALL present mechanisms are fully complete
  $eligibleForArchive = $true

  if ($hasTables -and -not $tablesComplete)   { $eligibleForArchive = $false }
  if ($hasCheckboxes -and -not $checkboxesComplete) { $eligibleForArchive = $false }

  # If neither tables nor checkboxes found, skip archiving
  if (-not $hasTables -and -not $hasCheckboxes) { $eligibleForArchive = $false }

  if ($eligibleForArchive) {
    $archiveSections += $section
  } else {
    $keepSections += $section
  }
}

# ── 6. Output ─────────────────────────────────────────────────────
if ($archiveSections.Count -eq 0) {
  Write-Output "No fully-completed sections to archive"
  exit 0
}

# Rebuild tasks.md
$newContent = $header.TrimEnd() + "`r`n`r`n---`r`n"
foreach ($s in $keepSections) {
  $s = $s.TrimEnd()
  $newContent += $s + "`r`n`r`n---`r`n"
}
# Remove trailing --- if any
$newContent = $newContent.TrimEnd() + "`r`n"

Set-Content -LiteralPath $TasksFile -Value $newContent -NoNewline
Write-Output "Rebuilt tasks.md ($($keepSections.Count) section(s) kept)"

# Append to tasks_archived.md
$today = Get-Date -Format "yyyy-MM-dd"
$archiveHeading = "## Archived $today"

if (-not (Test-Path -LiteralPath $ArchiveFile)) {
  $archiveContent = "# Archived Tasks`r`n`r`n"
} else {
  $archiveContent = Get-Content -LiteralPath $ArchiveFile -Raw
  if (-not $archiveContent.EndsWith("`r`n") -and -not $archiveContent.EndsWith("`n")) {
    $archiveContent += "`r`n"
  }
}

if (-not [regex]::IsMatch($archiveContent, "## Archived $today")) {
  $archiveContent += "`r`n$archiveHeading`r`n`r`n"
}

foreach ($s in $archiveSections) {
  $s = $s.Trim()
  $archiveContent += $s + "`r`n`r`n"
}

Set-Content -LiteralPath $ArchiveFile -Value $archiveContent -NoNewline
Write-Output "Archived $($archiveSections.Count) section(s) to $ArchiveFile"
