/**
 * Vercel Serverless Entry Point
 * Note: Vercel auto-detects Express from src/app.js and may use it directly.
 * This file exists as a fallback for manual serverless configuration.
 */
const app = require('../src/app');

module.exports = app;
