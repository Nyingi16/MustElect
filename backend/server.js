const express = require('express');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = require('./src/app');

const PORT = process.env.PORT || 3001;

// Start server
const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║     🗳️  MUST Elections Backend Server Started  🗳️        ║
╠══════════════════════════════════════════════════════════╣
║  📡 Server: http://localhost:${PORT}                      ║
║  🌍 Environment: ${process.env.NODE_ENV || 'development'}                    ║
║  🔗 Blockchain: ${process.env.BLOCKCHAIN_RPC_URL}     ║
║  💾 Database: ${process.env.DB_NAME}                    ║
╚══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});