module.exports = {
  apps: [{
    name: 'vscode-termux-server',
    script: 'server/server.js',
    cwd: '.',
    env: { NODE_ENV: 'production', PORT: 4000 }
  }]
}
