
Add-Type -AssemblyName System.Drawing
$files = "atrocity.jpg", "kiss-and-tell.jpg", "baby.jpg"
foreach ($file in $files) {
    $path = "c:\development\silachomka\public\covers\$file"
    if (Test-Path $path) {
        $img = [System.Drawing.Image]::FromFile($path)
        $bmp = New-Object System.Drawing.Bitmap 800, 800
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.DrawImage($img, 0, 0, 800, 800)
        $g.Dispose()
        $img.Dispose()
        $bmp.Save("c:\development\silachomka\public\covers\sm_$file", [System.Drawing.Imaging.ImageFormat]::Jpeg)
        $bmp.Dispose()
        Move-Item -Path "c:\development\silachomka\public\covers\sm_$file" -Destination $path -Force
    }
}

