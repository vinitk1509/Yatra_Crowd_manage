$ErrorActionPreference = "Stop"

if (Test-Path "C:\Program Files\Java\jdk-22") {
    $env:JAVA_HOME = "C:\Program Files\Java\jdk-22"
    $env:Path = "$env:JAVA_HOME\bin;$env:Path"
}

Write-Host "Using Java: " -NoNewline
java -version

mvn clean spring-boot:run
