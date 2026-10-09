import { connectDB } from '../config/db';
import { seedDemoAccounts } from '../services/seedDemoAccounts';

async function run() {
  await connectDB();
  await seedDemoAccounts();
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
