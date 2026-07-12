##
## Extract & organize TPS asset packs into public/assets/tps/
##
## Folders created:
##   public/assets/tps/guns/       — Quaternius FBX gun models + accessories
##   public/assets/tps/character/  — Action Adventure character FBX + animations
##   public/assets/tps/vfx/slashes/ — Attack slash glTF effect
##   public/assets/tps/vfx/explosion/ — Stylized explosion glTF
##

Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = "F:\grudgeDot\public\assets\tps"

# ── Create directories ──
$dirs = @(
  "$root\guns\assault-rifle",
  "$root\guns\pistol",
  "$root\guns\shotgun",
  "$root\guns\sniper",
  "$root\guns\smg",
  "$root\guns\revolver",
  "$root\guns\bullpup",
  "$root\guns\accessories",
  "$root\character\animations",
  "$root\vfx\slashes",
  "$root\vfx\slashes\textures",
  "$root\vfx\explosion"
)
foreach ($d in $dirs) {
  if (!(Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
}

# ── 1. Ultimate Gun Pack ──
Write-Output "Extracting gun models..."
$gunZip = [System.IO.Compression.ZipFile]::OpenRead("D:\Games\Models\Ultimate Gun Pack by Quaternius (1).zip")
foreach ($entry in $gunZip.Entries) {
  if ($entry.FullName -notlike "FBX/*" -or $entry.Length -eq 0) { continue }
  $name = [System.IO.Path]::GetFileName($entry.FullName)

  # Route to subfolder by name prefix
  $dest = $null
  if ($name -like "AssaultRifle*") { $dest = "$root\guns\assault-rifle\$name" }
  elseif ($name -like "Pistol*") { $dest = "$root\guns\pistol\$name" }
  elseif ($name -like "Shotgun*") { $dest = "$root\guns\shotgun\$name" }
  elseif ($name -like "SniperRifle*") { $dest = "$root\guns\sniper\$name" }
  elseif ($name -like "SubmachineGun*") { $dest = "$root\guns\smg\$name" }
  elseif ($name -like "Revolver*") { $dest = "$root\guns\revolver\$name" }
  elseif ($name -like "Bullpup*") { $dest = "$root\guns\bullpup\$name" }
  elseif ($entry.FullName -like "FBX/Accessories/*") { $dest = "$root\guns\accessories\$name" }

  if ($dest) {
    $stream = $entry.Open()
    $fs = [System.IO.File]::Create($dest)
    $stream.CopyTo($fs)
    $fs.Close()
    $stream.Close()
    Write-Output "  -> $name"
  }
}
$gunZip.Dispose()

# ── 2. Action Adventure Pack (character + animations) ──
Write-Output "Extracting character animations..."
$charZip = [System.IO.Compression.ZipFile]::OpenRead("D:\Games\Models\Action Adventure Pack.zip")
foreach ($entry in $charZip.Entries) {
  if ($entry.Length -eq 0) { continue }
  $name = [System.IO.Path]::GetFileName($entry.FullName)

  # Main character model vs animation clips
  if ($name -like "Meshy_AI_*") {
    $dest = "$root\character\$name"
  } else {
    $dest = "$root\character\animations\$name"
  }

  $stream = $entry.Open()
  $fs = [System.IO.File]::Create($dest)
  $stream.CopyTo($fs)
  $fs.Close()
  $stream.Close()
  Write-Output "  -> $name"
}
$charZip.Dispose()

# ── 3. Attack Slashes (glTF) ──
Write-Output "Extracting attack slashes..."
$slashZip = [System.IO.Compression.ZipFile]::OpenRead("D:\Games\Models\attack_slashes.zip")
foreach ($entry in $slashZip.Entries) {
  if ($entry.Length -eq 0 -and $entry.FullName -notlike "*/") { continue }
  $name = $entry.FullName
  # Flatten textures/ subfolder
  if ($name -like "textures/*" -and $entry.Length -gt 0) {
    $fname = [System.IO.Path]::GetFileName($name)
    $dest = "$root\vfx\slashes\textures\$fname"
  } elseif ($entry.Length -gt 0 -and $name -notlike "textures/") {
    $fname = [System.IO.Path]::GetFileName($name)
    $dest = "$root\vfx\slashes\$fname"
  } else { continue }

  $stream = $entry.Open()
  $fs = [System.IO.File]::Create($dest)
  $stream.CopyTo($fs)
  $fs.Close()
  $stream.Close()
  Write-Output "  -> $fname"
}
$slashZip.Dispose()

# ── 4. Stylized Explosion (glTF) ──
Write-Output "Extracting explosion effect..."
$expZip = [System.IO.Compression.ZipFile]::OpenRead("D:\Games\Models\stylized_explosion_effect_simulation.zip")
foreach ($entry in $expZip.Entries) {
  if ($entry.Length -eq 0) { continue }
  $name = [System.IO.Path]::GetFileName($entry.FullName)
  $dest = "$root\vfx\explosion\$name"

  $stream = $entry.Open()
  $fs = [System.IO.File]::Create($dest)
  $stream.CopyTo($fs)
  $fs.Close()
  $stream.Close()
  Write-Output "  -> $name"
}
$expZip.Dispose()

Write-Output ""
Write-Output "Done! Assets extracted to: $root"
Write-Output ""

# Summary
$total = (Get-ChildItem -Recurse -File $root).Count
Write-Output "Total files: $total"
Get-ChildItem $root -Directory | ForEach-Object {
  $count = (Get-ChildItem -Recurse -File $_.FullName).Count
  Write-Output ("  " + $_.Name + ": $count files")
}
