---
name: wolf-guard-mobile
description: Guide for building, configuring, and debugging the Wolf Guard Mobile (WGM) React Native/Expo app
---

# Wolf Guard Mobile (WGM) — Build & Debug Skill

## Project Location
- **Source**: `wgm/` in the wolf-hms-stable repo
- **Build copy**: `C:\wgm` (short path to avoid Windows 260-char limit in Android builds)

## Environment Configuration
File: `wgm/src/config/environment.js`

```javascript
// Set ENV to switch between local dev and production
const ENV = 'vps_cloud';  // 'development' | 'vps_cloud' | 'production'

// VPS Cloud config points to:
// API_URL: 'http://185.213.27.158/wolf/api'
```

**IMPORTANT**: After changing environment.js, you must rebuild the APK. JS changes are bundled at build time.

## Building APK

### Prerequisites
- Android SDK at `C:\Users\HP\AppData\Local\Android\Sdk`
- Java JBR at `C:\Program Files\Android\Android Studio\jbr`
- Source must be at `C:\wgm` (not the long `.gemini/antigravity/...` path)

### Build Commands
```powershell
# Set environment
$env:ANDROID_HOME = "C:\Users\HP\AppData\Local\Android\Sdk"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

# Ensure local.properties exists
Set-Content "C:\wgm\android\local.properties" "sdk.dir=C:\\Users\\HP\\AppData\\Local\\Android\\Sdk"

# Build (incremental, ~1-2 min)
.\android\gradlew.bat -p android assembleRelease

# Copy APK to Desktop
Copy-Item "C:\wgm\android\app\build\outputs\apk\release\app-release.apk" "$env:USERPROFILE\Desktop\WolfGuard.apk" -Force
```

### Known Build Issues

| Issue | Fix |
|-------|-----|
| `mergeDexRelease FAILED` (smartlocation) | Delete `node_modules/expo-location/android/build/` and rebuild |
| `RNCWebViewModule not found` (crash on open) | `npm install react-native-webview` then rebuild |
| `Network Error` on login | Add `android:usesCleartextTraffic="true"` to AndroidManifest.xml |
| `SYSTEM LOCKED` screen | Bio-lock fires on every foreground event — disable in AuthContext.js |
| Path too long errors | Build from `C:\wgm`, not the long workspace path |

### AndroidManifest.xml Critical Setting
```xml
<application android:usesCleartextTraffic="true" ...>
```
Without this, Android blocks HTTP connections to the VPS (which uses `http://`, not `https://`).

## App Architecture
```
wgm/
├── App.js                    # Root navigator + NeuralBackground
├── src/
│   ├── config/environment.js # API URL switcher
│   ├── context/
│   │   ├── AuthContext.js    # Login, logout, bio-lock, duty mode
│   │   └── ThemeContext.js   # Dead code — almost nothing uses it
│   ├── screens/              # 14 screens
│   │   ├── LoginScreen.js
│   │   ├── PatrolScreen.js   # Home screen (after duty selection)
│   │   ├── DutySelectionScreen.js
│   │   └── ...
│   ├── services/
│   │   ├── api.js            # Axios instance with baseURL
│   │   ├── securityService.js # Guard API calls
│   │   └── locationService.js # GPS tracking
│   └── components/
│       └── NeuralBackground.js # Static SVG background
└── android/                  # Native Android build
```

## Syncing Changes
After editing in `wolf-hms-stable/wgm/`, sync to the build directory:
```powershell
Copy-Item "path\to\changed\file" "C:\wgm\same\path" -Force
```

## Local Development (without building APK)
```bash
cd wgm
npx expo start
# Scan QR with Expo Go app on phone (dev mode only)
```
