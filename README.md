# 1space

## Compilation


First, install the Tauri CLI by running `cargo install tauri-cli`.

After you have done that, clone the repository and inside of it run `cargo tauri build`.

The builds will reside within ./src-tauri/target/release/bundle/nsis or msi (both work).

If you are compiling on Windows remove .cargo/config as it is meant exclusively for compiling from Linux to Windows.
