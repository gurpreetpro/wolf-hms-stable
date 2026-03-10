# How to Build Wolf Guard APK (Android SDK)

This guide explains how to compile the `wolf-guard-mobile` React Native app into an installable `.apk` file using the Android SDK.

## Prerequisites
1.  **JDK 17**: Ensure Java Development Kit 17 is installed (`java --version`).
2.  **Android Studio**: Must be installed with **Android SDK Command-line Tools** and **CMake**.
3.  **ANDROID_HOME**: Environment variable must point to your SDK location (e.g., `C:\Users\HP\AppData\Local\Android\Sdk`).

## Steps

### 1. Generate Native Code (Prebuild)
Since we use native sensors, we must eject from "Expo Go" to "Development Build":
```powershell
cd wolf-guard-mobile
npx expo prebuild --platform android
```
*   This will create an `android` folder in your project.
*   It asks for a package name: default `com.wolf.guard` is fine.

### 2. Build Release APK
Navigate to the android folder and run Gradle:
```powershell
cd android
./gradlew assembleRelease
```
*   This process downloads dependencies and compiles Kotlin/Java code.
*   It may take 10-15 minutes on the first run.

### 3. Locate APK
Once successful, your APK will be at:
`wolf-guard-mobile/android/app/build/outputs/apk/release/app-release.apk`

### 4. Install on Device
Connect your Android phone via USB and run:
```powershell
adb install android/app/build/outputs/apk/release/app-release.apk
```

## Troubleshooting
*   **SDK Location**: If gradle complains "SDK not found", create a `local.properties` file in `android/` with:
    ```
    sdk.dir=C:\\Users\\HP\\AppData\\Local\\Android\\Sdk
    ```
*   **Java Version**: Ensure `JAVA_HOME` points to JDK 17.
    *   **Auto-Fix**: Run this in PowerShell before building:
        ```powershell
        $env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
        ```
*   **Gradle Error**: If `gradlew` is not recognized, ensure you are in the `android/` directory.
