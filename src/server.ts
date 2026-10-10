import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectDB } from './config/db';
import { ensureAssessmentCatalog } from './services/seedAssessmentWork';
import { seedDemoAccounts } from './services/seedDemoAccounts';

const PORT = Number(process.env.PORT) || 5000;
const HOST = '0.0.0.0';

async function bootstrap() {
  await connectDB();
  try {
    await seedDemoAccounts();
    await ensureAssessmentCatalog();
  } catch (error) {
    console.error('Demo account / assessment catalog seed failed:', error);
  }
  const server = app.listen(PORT, HOST, () => {
    console.log(`🚀 UniMentor API running on http://localhost:${PORT} (bound to ${HOST})`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} is already in use by another process.`);
      console.error(`👉 Run the following command in PowerShell to free port ${PORT}:`);
      console.error(`   Get-NetTCPConnection -LocalPort ${PORT} | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }\n`);
    } else {
      console.error('Server error:', err);
    }
    process.exit(1);
  });

  const shutdown = () => {
    console.log('\n🛑 Shutting down UniMentor server...');
    if (typeof (server as any).closeAllConnections === 'function') {
      (server as any).closeAllConnections();
    }
    server.close(() => {
      console.log('✅ Port released. Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
