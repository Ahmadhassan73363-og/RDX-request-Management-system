// Vercel Serverless Catch-All Route for /api/*
// Ensures all /api/* requests are dispatched to Express without path truncation
import app from '../server/app.js';

export default app;
