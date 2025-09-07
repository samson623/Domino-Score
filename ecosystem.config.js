module.exports = {
  apps: [
    {
      name: 'preview-server',
      script: 'node preview-server.js',
      args: '',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
