Add-Type -AssemblyName System.Drawing

$srcPath = "c:\development\silachomka\public\silachomka.com-logo.png"
$img = [System.Drawing.Image]::FromFile($srcPath)
Write-Output "Original width: $($img.Width), height: $($img.Height)"

# Create a high-quality 512x512 PNG favicon/logo (< 200KB)
$dest512 = "c:\development\silachomka\public\silachomka.com-logo.png"
$destFavicon = "c:\development\silachomka\public\favicon.png"
$destOg = "c:\development\silachomka\public\og-image.png"

$bmp = New-Object System.Drawing.Bitmap 512, 512
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

$g.DrawImage($img, 0, 0, 512, 512)
$g.Dispose()
$img.Dispose()

# Save optimized PNG
$bmp.Save($destFavicon, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save($dest512, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save($destOg, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Write-Output "Saved optimized 512x512 logo to $dest512 and $destFavicon"
