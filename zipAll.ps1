Remove-Item ./build -Recurse -Force -ErrorAction SilentlyContinue
$version = (Get-Content .\package.json | ConvertFrom-Json).version
$dirName = "./build/xpDeploy-$version"
New-Item $dirName -ItemType Directory
Copy-Item .\.vscodeignore $dirName
Copy-Item .\CHANGELOG.md $dirName
Copy-Item .\extension.js $dirName
Copy-Item .\package.json $dirName
Copy-Item .\README.md $dirName
Copy-Item .\xpcommands.js $dirName
Copy-Item .\xputils.js $dirName
Compress-Archive $dirName xpDeploy.zip -CompressionLevel Optimal