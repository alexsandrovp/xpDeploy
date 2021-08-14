Remove-Item ./build -Recurse -Force -ErrorAction SilentlyContinue
New-Item ./build/xpDeploy -ItemType Directory
Copy-Item .\.vscodeignore ./build/xpDeploy/
Copy-Item .\CHANGELOG.md ./build/xpDeploy/
Copy-Item .\extension.js ./build/xpDeploy/
Copy-Item .\package.json ./build/xpDeploy/
Copy-Item .\README.md ./build/xpDeploy/
Copy-Item .\xpcommands.js ./build/xpDeploy/
Copy-Item .\xputils.js ./build/xpDeploy/
Compress-Archive ./build/xpDeploy xpDeploy.zip -CompressionLevel Optimal