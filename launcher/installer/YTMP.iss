; YTMP Windows installer
; Builds YTMP-Setup.exe — installs app, ffmpeg, PATH, desktop shortcut.

#define MyAppName "YTMP"
#define MyAppVersion "1.1.0"
#define MyAppPublisher "YTMP"
#define MyAppExeName "YTMP.exe"

[Setup]
AppId={{A7C3E91F-4B2D-4E18-9F6A-8D1C0B7A5E32}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=..\..\release
OutputBaseFilename=YTMP-Setup
SetupIconFile=..\tubetone.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
ChangesEnvironment=yes
CloseApplications=yes
RestartApplications=no
InfoBeforeFile=INSTALL_INFO.txt
LicenseFile=

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional icons:"; Flags: checkedonce

[Files]
; App (PyInstaller onedir)
Source: "..\..\release\YTMP\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

; ffmpeg → C:\ffmpeg\bin
Source: "ffmpeg_payload\bin\*"; DestDir: "C:\ffmpeg\bin"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "ffmpeg_payload\OWNER.txt"; DestDir: "C:\ffmpeg"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Registry]
Root: HKLM; Subkey: "SYSTEM\CurrentControlSet\Control\Session Manager\Environment"; \
    ValueType: expandsz; ValueName: "FFMPEG_LOCATION"; ValueData: "C:\ffmpeg\bin"; Flags: uninsdeletevalue

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch YTMP"; Flags: nowait postinstall skipifsilent

[Code]
const
  EnvironmentKey = 'SYSTEM\CurrentControlSet\Control\Session Manager\Environment';
  FfmpegPath = 'C:\ffmpeg\bin';

function NeedsAddPath(Param: string): boolean;
var
  OrigPath: string;
begin
  if not RegQueryStringValue(HKEY_LOCAL_MACHINE, EnvironmentKey, 'Path', OrigPath) then
  begin
    Result := True;
    exit;
  end;
  { Look for the path with leading/trailing semicolon to avoid partial matches }
  Result := Pos(';' + Uppercase(Param) + ';', ';' + Uppercase(OrigPath) + ';') = 0;
end;

procedure EnvAddPath(Path: string);
var
  Paths: string;
begin
  if not NeedsAddPath(Path) then
    exit;

  if not RegQueryStringValue(HKEY_LOCAL_MACHINE, EnvironmentKey, 'Path', Paths) then
    Paths := '';

  if (Paths <> '') and (Paths[Length(Paths)] <> ';') then
    Paths := Paths + ';';

  Paths := Paths + Path;
  RegWriteExpandStringValue(HKEY_LOCAL_MACHINE, EnvironmentKey, 'Path', Paths);
end;

procedure EnvRemovePath(Path: string);
var
  Paths: string;
  PathsU: string;
  Needle: string;
  P: Integer;
begin
  if not RegQueryStringValue(HKEY_LOCAL_MACHINE, EnvironmentKey, 'Path', Paths) then
    exit;

  PathsU := ';' + Uppercase(Paths) + ';';
  Needle := ';' + Uppercase(Path) + ';';
  P := Pos(Needle, PathsU);
  if P = 0 then
    exit;

  { Map index from padded uppercase string back onto original Paths }
  Delete(Paths, P, Length(Path) + 1);
  while Pos(';;', Paths) > 0 do
    StringChangeEx(Paths, ';;', ';', True);
  if (Length(Paths) > 0) and (Paths[1] = ';') then
    Delete(Paths, 1, 1);
  if (Length(Paths) > 0) and (Paths[Length(Paths)] = ';') then
    SetLength(Paths, Length(Paths) - 1);

  RegWriteExpandStringValue(HKEY_LOCAL_MACHINE, EnvironmentKey, 'Path', Paths);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
    EnvAddPath(FfmpegPath);
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
  begin
    EnvRemovePath(FfmpegPath);
    { Only remove C:\ffmpeg if we installed it (OWNER marker) }
    if FileExists('C:\ffmpeg\OWNER.txt') then
    begin
      DelTree('C:\ffmpeg', True, True, True);
    end;
  end;
end;
