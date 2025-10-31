# VS Code Termux Panel — Final Auto Installer Edition

This release includes:
- Full server-side GitHub OAuth via `passport-github2` (requires OAuth App setup)
- Token injection endpoint (for PAT) as fallback
- node-pty based real terminal integration (with graceful fallback if build fails)
- Monaco Editor integrated into client (requires build)
- Auto install script for Termux and PM2 support

## Quick Install (Termux)
1. Upload zip to device and unzip to $HOME/vscode-termux-panel
2. In Termux:
   ```bash
   cd ~/vscode-termux-panel
   bash install.sh
   ```
3. Create GitHub OAuth App (for best UX):
   - Go to https://github.com/settings/developers -> OAuth Apps -> New OAuth App
   - Set Application name: VSCode Termux Panel
   - Homepage URL: http://localhost:4000
   - Authorization callback URL: http://localhost:4000/auth/github/callback
   - After create, copy CLIENT ID and CLIENT SECRET and put them in `server/.env`:
     ```env
     GITHUB_CLIENT_ID=your_client_id
     GITHUB_CLIENT_SECRET=your_client_secret
     GITHUB_CALLBACK_URL=http://localhost:4000/auth/github/callback
     ```
4. Start server (pm2 will be started by install script):
   ```bash
   pm2 start ecosystem.config.js
   pm2 logs
   ```
5. Open http://localhost:4000 in your browser. Use "Login with GitHub" to authorize, or paste a Personal Access Token in sidebar as fallback.

## Notes on node-pty and Monaco
- `node-pty` may require build tools on some Android devices. The install script attempts to install dependencies; if node-pty fails to build, the server falls back to an echo terminal (no real pty).
- Monaco Editor is included as a client dependency in package.json. Building on low-memory devices may fail; consider building on desktop and copying `client/dist` to the device.

## Debugging & Common Fixes (Android 6–15)
- If `pkg` not found, fallback to `apt`. Ensure termux is up-to-date.
- If `npm install` fails on node-pty: install `clang`, `make`, and `python` in Termux and retry:
  ```bash
  pkg install clang make python -y
  cd server
  npm rebuild node-pty --build-from-source
  ```
- If client build fails due to memory, build client on desktop and copy `client/dist` into the device:
  ```bash
  # On desktop
  npm install
  npm run build
  # copy client/dist to device:/home/user/vscode-termux-panel/client/dist
  ```
- PM2 process keeps server alive; use `pm2 logs` to inspect runtime errors.

## Security & Tokens
- For fully automated GitHub features, the recommended flow is OAuth App (server-side). The PAT injection is a fallback and requires user to paste a token with `repo` scope.
- Tokens are stored in `server/.env`. If you wish to remove them, delete the variable and restart the server:
  ```bash
  sed -i '/GITHUB_CLIENT/d' server/.env
  pm2 restart vscode-termux-server
  ```

## Developer Credits
Developer: Paong & Evelyn
Discord: https://discord.gg/h29Hrudn7
License: MIT
