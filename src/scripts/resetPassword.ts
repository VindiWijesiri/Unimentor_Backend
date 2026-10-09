import dotenv from 'dotenv';
dotenv.config();

import dns from 'dns';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

const resolver = new dns.Resolver();
try {
  resolver.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

const customLookup = (hostname: string, opts: any, cb: any) => {
  if (typeof opts === 'function') {
    cb = opts;
    opts = {};
  }
  resolver.resolve4(hostname, (err, addrs) => {
    if (!err && addrs && addrs.length > 0) {
      if (opts && opts.all) {
        return cb(null, addrs.map((a) => ({ address: a, family: 4 })));
      }
      return cb(null, addrs[0], 4);
    }
    dns.lookup(hostname, opts, cb);
  });
};

async function setupAccounts() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI missing');
    process.exit(1);
  }

  await mongoose.connect(uri, { lookup: customLookup });

  const targetEmail = process.argv[2] || 'student@unimentor.dev';
  const newPassword = process.argv[3] || 'password123';

  console.log(`Setting password for: ${targetEmail}`);

  let user = await User.findOne({ email: targetEmail });
  if (!user) {
    console.log(`User ${targetEmail} does not exist in Atlas. Creating student account...`);
    user = new User({
      name: 'UniMentor Student',
      email: targetEmail,
      password: newPassword,
      role: 'student',
    });
    await user.save();
    console.log(`✅ Created student account "${targetEmail}" with password: "${newPassword}"`);
  } else {
    user.password = newPassword;
    await user.save();
    console.log(`✅ Updated password for "${targetEmail}" to: "${newPassword}"`);
  }

  const allStudents = await User.find({ role: 'student' }).select('name email');
  console.log(`\nAll students in database (${allStudents.length}):`);
  allStudents.forEach((s) => console.log(` - ${s.name} (${s.email})`));

  await mongoose.disconnect();
  process.exit(0);
}

setupAccounts().catch((e) => {
  console.error('Failed:', e);
  process.exit(1);
});
