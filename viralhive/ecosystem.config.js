// PM2 process file for keeping the daemon alive on a desktop/VPS/phone.
// Usage: pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "viralhive",
      script: "dist/cli.js",
      args: "daemon",
      cwd: __dirname,
      autorestart: true,
      max_restarts: 20,
      restart_delay: 5000,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
