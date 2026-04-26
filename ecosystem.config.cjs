// PM2 ecosystem config for the FloorPlan AI Next.js app on the Vultr VPS.
// Used by deploy/scripts/deploy-app.sh.
//
// - Reads .env.local from the app directory at runtime
// - Restarts on crash, caps at 10 restarts/min to avoid tight-loop on boot
// - 1 instance is plenty for a single-VPS deploy; switch to "max" for cluster mode
//   only if you also wire sticky sessions and confirm Three.js workers are happy.

module.exports = {
  apps: [
    {
      name: 'aura',
      cwd: __dirname,
      script: 'node_modules/next/dist/bin/next',
      args: 'start --port 3000',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '30s',
      // 1 GB VPS: leave headroom for the kernel + nginx. Restart if Next ever
      // grows past ~600 MB (it normally sits well under 300 MB at idle).
      max_memory_restart: '600M',
      node_args: '--max-old-space-size=512',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
      },
    },
  ],
};
