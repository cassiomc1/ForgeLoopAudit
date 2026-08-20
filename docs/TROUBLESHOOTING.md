# Troubleshooting

## macOS application does not open

Inspect the downloaded artifact before changing quarantine attributes:

```bash
spctl --assess --type execute --verbose=4 "/Applications/ForgeLoop Studio.app"
codesign --verify --deep --strict --verbose=4 "/Applications/ForgeLoop Studio.app"
xcrun stapler validate "/Applications/ForgeLoop Studio.app"
"/Applications/ForgeLoop Studio.app/Contents/MacOS/ForgeLoop Studio"
```

Unsigned development builds may be rejected by Gatekeeper. Official release artifacts must be signed and notarized.

## ForgeLoop CLI not found

Check the binary available to the Finder-launched application and compare it with the terminal `PATH`. Studio uses `shell: false`, a bounded timeout and an explicit `--version` probe; it does not execute arbitrary commands.

## Blank window

Run a production build and inspect the renderer console for failed asset URLs, preload errors and main-process logs. Production assets are built with relative URLs so the packaged app does not depend on localhost.

## Invalid ForgeLoop artifact

Record the artifact name and schema validation error. Invalid or unverified data must remain visibly distinct from a valid protocol state.
