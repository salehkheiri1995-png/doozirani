# Generates the Android launcher icons, adaptive-icon foregrounds and the
# Cafe Bazaar / PWA store icons from one master drawing.
#
#   pwsh -File scripts\generate-icons.ps1
#
# The drawing mirrors public/icon.svg (wood background + golden Dooz board)
# without the text ribbon: the launcher icon must stay readable at 48 dp.
#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$res  = Join-Path $root 'android\app\src\main\res'
$pub  = Join-Path $root 'public'

function Get-RoundedPath([double]$x, [double]$y, [double]$w, [double]$h, [double]$r) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = [Math]::Min($r * 2, [Math]::Min($w, $h))
    if ($d -le 0) {
        $path.AddRectangle([System.Drawing.RectangleF]::new([float]$x, [float]$y, [float]$w, [float]$h))
        return $path
    }
    $path.AddArc([float]$x, [float]$y, [float]$d, [float]$d, 180, 90)
    $path.AddArc([float]($x + $w - $d), [float]$y, [float]$d, [float]$d, 270, 90)
    $path.AddArc([float]($x + $w - $d), [float]($y + $h - $d), [float]$d, [float]$d, 0, 90)
    $path.AddArc([float]$x, [float]($y + $h - $d), [float]$d, [float]$d, 90, 90)
    $path.CloseFigure()
    return $path
}

# Radial brush with as many colour stops as needed (center -> edge).
function New-RadialBrush($path, [double]$cx, [double]$cy, $colors, $positions) {
    $brush = New-Object System.Drawing.Drawing2D.PathGradientBrush($path)
    $brush.CenterPoint = New-Object System.Drawing.PointF([float]$cx, [float]$cy)
    $blend = New-Object System.Drawing.Drawing2D.ColorBlend($colors.Count)
    $blend.Colors = [System.Drawing.Color[]]$colors
    $blend.Positions = [float[]]$positions
    $brush.InterpolationColors = $blend
    return $brush
}

function C([string]$hex) { return [System.Drawing.ColorTranslator]::FromHtml($hex) }
function A([int]$alpha, [string]$hex) { $c = C $hex; return [System.Drawing.Color]::FromArgb($alpha, $c.R, $c.G, $c.B) }

function Draw-Background([System.Drawing.Graphics]$g, [bool]$rounded) {
    $radius = if ($rounded) { 110 } else { 0 }
    $bg = Get-RoundedPath 0 0 512 512 $radius
    $brush = New-RadialBrush $bg 256 205 @((C '#3a2517'), (C '#21150c'), (C '#120a05')) @(0.0, 0.6, 1.0)
    $g.FillPath($brush, $bg)
    if ($rounded) {
        $border = New-Object System.Drawing.Pen((A 153 '#854d0e'), 8)
        $frame = Get-RoundedPath 20 20 472 472 90
        $g.DrawPath($border, $frame)
    }
}

function Draw-Diamond([System.Drawing.Graphics]$g) {
    # Golden diamond plate, rotated 45 degrees around the centre.
    $plate = Get-RoundedPath 116 116 280 280 45
    $rotate = New-Object System.Drawing.Drawing2D.Matrix
    $rotate.RotateAt(45, (New-Object System.Drawing.PointF(256, 256)))
    $plate.Transform($rotate)

    $shadow = $plate.Clone()
    $shift = New-Object System.Drawing.Drawing2D.Matrix
    $shift.Translate(0, 12)
    $shadow.Transform($shift)
    $g.FillPath((New-Object System.Drawing.SolidBrush((A 110 '#000000'))), $shadow)

    $gold = New-RadialBrush $plate 200 200 @((C '#fef08a'), (C '#eab308'), (C '#854d0e')) @(0.0, 0.4, 1.0)
    $g.FillPath((New-Object System.Drawing.SolidBrush((C '#1c120a'))), $plate)
    $rim = New-Object System.Drawing.Pen($gold, 10)
    $g.DrawPath($rim, $plate)

    # Inner board (axis aligned, like public/icon.svg).
    $boardPen = New-Object System.Drawing.Pen((A 191 '#a16207'), 6)
    $board = Get-RoundedPath 166 166 180 180 15
    $g.DrawPath($boardPen, $board)
    $g.DrawLine($boardPen, 166, 256, 346, 256)
    $g.DrawLine($boardPen, 256, 166, 256, 346)
    $diagPen = New-Object System.Drawing.Pen((A 153 '#854d0e'), 4)
    $g.DrawLine($diagPen, 166, 166, 346, 346)
    $g.DrawLine($diagPen, 346, 166, 166, 346)

    $turq = @((C '#5eead4'), (C '#0d9488'), (C '#115e59'))
    $ruby = @((C '#fda4af'), (C '#e11d48'), (C '#881337'))
    Draw-Stone $g 166 166 28 $turq '#ccfbf1'
    Draw-Stone $g 256 256 32 $turq '#ccfbf1'
    Draw-Stone $g 346 346 28 $turq '#ccfbf1'
    Draw-Stone $g 346 166 28 $ruby '#ffe4e6'
    Draw-Stone $g 166 346 28 $ruby '#ffe4e6'
}

function Draw-Stone([System.Drawing.Graphics]$g, [double]$cx, [double]$cy, [double]$r, $colors, [string]$rimHex) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse([float]($cx - $r), [float]($cy - $r), [float]($r * 2), [float]($r * 2))
    $brush = New-RadialBrush $path ($cx - $r * 0.3) ($cy - $r * 0.35) $colors @(0.0, 0.5, 1.0)
    $g.FillPath($brush, $path)
    $pen = New-Object System.Drawing.Pen((C $rimHex), 4)
    $g.DrawPath($pen, $path)
}

# Renders the master artwork at 4x and downsamples for clean anti-aliasing.
function Render-Icon([int]$size, [double]$logoScale, [bool]$rounded, [bool]$background) {
    $super = 4
    $big = New-Object System.Drawing.Bitmap(($size * $super), ($size * $super), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($big)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $g.ScaleTransform(($size * $super) / 512.0, ($size * $super) / 512.0)
    if ($background) { Draw-Background $g $rounded }
    $g.TranslateTransform(256, 256)
    $g.ScaleTransform([float]$logoScale, [float]$logoScale)
    $g.TranslateTransform(-256, -256)
    Draw-Diamond $g
    $g.Dispose()

    $out = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g2 = [System.Drawing.Graphics]::FromImage($out)
    $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g2.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g2.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g2.DrawImage($big, 0, 0, $size, $size)
    $g2.Dispose()
    $big.Dispose()
    return $out
}

function Save-Icon([string]$path, [int]$size, [double]$logoScale, [bool]$rounded = $true, [bool]$background = $true) {
    $dir = Split-Path -Parent $path
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    $img = Render-Icon $size $logoScale $rounded $background
    $img.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $img.Dispose()
    Write-Host ("  {0}  ({1}x{1})" -f $path.Substring($root.Length + 1), $size)
}

Write-Host 'Launcher icons (legacy, API < 26):'
$legacy = @{ 'mdpi' = 48; 'hdpi' = 72; 'xhdpi' = 96; 'xxhdpi' = 144; 'xxxhdpi' = 192 }
foreach ($d in $legacy.Keys) {
    Save-Icon (Join-Path $res "mipmap-$d\ic_launcher.png") $legacy[$d] 1.0 $true $true
}

Write-Host 'Adaptive icon foregrounds (logo inside the 66% safe zone):'
$foreground = @{ 'mdpi' = 108; 'hdpi' = 162; 'xhdpi' = 216; 'xxhdpi' = 324; 'xxxhdpi' = 432 }
foreach ($d in $foreground.Keys) {
    # Master logo bounding box is 77.3% of the canvas; 0.80 * 77.3% = 62%,
    # which keeps every stone tip inside the adaptive-icon safe circle.
    Save-Icon (Join-Path $res "mipmap-$d\ic_launcher_foreground.png") $foreground[$d] 0.80 $false $false
}

Write-Host 'Web / store icons:'
Save-Icon (Join-Path $pub 'icon-512.png') 512 1.0 $true $true
Save-Icon (Join-Path $pub 'icon.png') 512 1.0 $true $true
Save-Icon (Join-Path $pub 'icon-192.png') 192 1.0 $true $true
Save-Icon (Join-Path $pub 'icon-128.png') 128 1.0 $true $true
Save-Icon (Join-Path $pub 'pwa-192x192.png') 192 1.0 $true $true
Save-Icon (Join-Path $pub 'pwa-512x512.png') 512 1.0 $true $true
Save-Icon (Join-Path $pub 'pwa-maskable-512x512.png') 512 0.80 $false $true
Save-Icon (Join-Path $pub 'apple-touch-icon.png') 180 0.80 $false $true
Save-Icon (Join-Path $pub 'bazaar-icon-512.png') 512 1.0 $true $true

Write-Host 'Done.'
