@echo off
if exist "C:\Program Files\Java\jdk-22" (
    set "JAVA_HOME=C:\Program Files\Java\jdk-22"
    set "PATH=C:\Program Files\Java\jdk-22\bin;%PATH%"
)
echo Using Java:
java -version
mvn clean spring-boot:run
