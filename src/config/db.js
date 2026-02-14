const { Pool } = require('pg');
const redis = require('redis');

const pool = new Pool({
    user: process.env.DB_USER || 'admin',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'robotics_v1',
    password: process.env.DB_PASS || 'securepassword123',
    port: process.env.DB_PORT || 5432,
});

const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.connect().catch(console.error);

module.exports = { pool, redisClient };
