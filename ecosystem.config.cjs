module.exports = {
  apps: [{
    name: 'task-orbit-console',
    script: 'npx.cmd',
    args: 'vite --host',
    cwd: __dirname,
    watch: false,
    autorestart: false
  }]
};