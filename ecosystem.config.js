module.exports = {
  apps: [
    {
      name: 'preview-server',
      script: 'node_modules/.bin/serve',
      args: '-s . -l 3000',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
