[Setup]
; Basic setup details
AppName=Wolf HMS Diagnostic Tool
AppVersion=1.0.0
DefaultDirName={pf}\WolfDiagnostics
DefaultGroupName=WolfDiagnostics
OutputBaseFilename=wolf-diagnose-setup
Compression=lzma
SolidCompression=yes
; Require admin privileges to install to Program Files
PrivilegesRequired=admin
ChangesEnvironment=yes

[Files]
; Helper tool to manage PATH variable (Optional, assumes user deals with PATH or runs directly)
; For simplicity, we just copy the EXE
Source: "wolf-diagnose.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
; Create a shortcut in Start Menu
Name: "{group}\Wolf HMS Diagnostic Tool"; Filename: "{app}\wolf-diagnose.exe"
; Create desktop icon
Name: "{commondesktop}\Wolf HMS Diagnostic Tool"; Filename: "{app}\wolf-diagnose.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Run]
; Option to run after install
Filename: "{app}\wolf-diagnose.exe"; Description: "Run Diagnostic Tool"; Flags: nowait postinstall skipifsilent

[Code]
// NOTE: Automatically adding to PATH is complex in Inno Setup scripts without external DLLs or extensive code.
// Ideally, the user should copy the .exe to the project root as this is a CLI tool dependent on CWD.
// However, the shortcut allows double-clicking.
