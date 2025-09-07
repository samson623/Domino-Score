module.exports = {
  apps: [
    {
      name: 'preview-server',
      script: 'node_modules/serve/bin/serve.js',
      args: '-s . -l 3000',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
