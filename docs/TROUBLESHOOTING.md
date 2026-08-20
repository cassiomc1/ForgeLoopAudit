# Troubleshooting

## macOS application does not open

Inspect the downloaded artifact before changing quarantine attributes:

```bash
spctl --assess --type execute --verbose=4 "/Applications/ForgeLoop Studio.app"
codesign --verify --deep --strict --verbose=4 "/Applications/ForgeLoop Studio.app"
xcrun stapler validate "/Applications/ForgeLoop Studio.app"
"/Applications/ForgeLoop Studio.app/Contents/MacOS/ForgeLoop Studio"
```

Unsigned RC2 preview builds may be rejected by Gatekeeper. This is expected for the current release policy; signing and notarization are deferred to a future distribution milestone.

If macOS shows “Malware Blocked and Moved to Trash” for `Electron.app`, the local Electron runtime was quarantined or rejected before ForgeLoop Studio started. Reinstall the dependency from a trusted source and verify the signed/notarized release artifact; do not disable Gatekeeper as a project release strategy.

## ForgeLoop CLI not found

Check the binary available to the Finder-launched application and compare it with the terminal `PATH`. Studio uses `shell: false`, a bounded timeout and an explicit `--version` probe; it does not execute arbitrary commands.

## Blank window

Run a production build and inspect the renderer console for failed asset URLs, preload errors and main-process logs. Production assets are built with relative URLs so the packaged app does not depend on localhost.

## Invalid ForgeLoop artifact

Record the artifact name and schema validation error. Invalid or unverified data must remain visibly distinct from a valid protocol state.
