module.exports = {
  apps: [
    {
      name: 'task-orbit-server',
      script: 'node',
      args: 'server/index.cjs',
      cwd: __dirname,
      watch: false,
      autorestart: true
    },
    {
      name: 'task-orbit-web',
      script: 'npx.cmd',
      args: 'vite --host',
      cwd: __dirname,
      watch: false,
      autorestart: false
    }
  ]
};
