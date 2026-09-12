
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("c:\development\silachomka\public\covers\noisemaker.jpg")
$bmp = New-Object System.Drawing.Bitmap 800, 800
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, 800, 800)
$g.Dispose()
$img.Dispose()
$bmp.Save("c:\development\silachomka\public\covers\noisemaker_sm.jpg", [System.Drawing.Imaging.ImageFormat]::Jpeg)
$bmp.Dispose()

