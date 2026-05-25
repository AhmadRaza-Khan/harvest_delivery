module.exports = {
  apps: [{
    name: 'harvestdelivery',
    script: 'dist/main.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'postgresql://harvestuser:harvest@cyberboost@delivery@0504@localhost:5432/harvestdelivery'
    }
  }]
};