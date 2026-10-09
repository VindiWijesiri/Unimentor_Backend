import dotenv from 'dotenv';
dotenv.config();

import dns from 'dns';
import mongoose from 'mongoose';
import User from '../models/User';

// Configure DNS to use public DNS resolvers (bypasses restrictive local intranet DNS on Wi-Fi)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore if not permitted
}

const resolver = new dns.Resolver();
try {
  resolver.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore
}

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

async function migrateLegacyReviewIndexes(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) return;

  const collectionExists = await db.listCollections({ name: 'reviews' }).hasNext();
  if (!collectionExists) return;

  const reviews = db.collection('reviews');
  const indexes = await reviews.indexes();
  const legacyIndex = indexes.find(({ name }) => name === 'tutorId_1_studentId_1');

  if (legacyIndex) {
    const legacyReviews = reviews.find({
      tutorId: { $exists: true, $ne: null },
      studentId: { $exists: true, $ne: null },
    });

    for await (const review of legacyReviews) {
      await reviews.updateOne(
        { _id: review._id },
        {
          $set: {
            tutor: String(review.tutorId),
            student: review.studentId,
          },
          $unset: { tutorId: '', studentId: '' },
        },
      );
    }

    await reviews.dropIndex('tutorId_1_studentId_1');
    console.log('✅ Legacy review index migrated');
  }

  await reviews.createIndex(
    { tutor: 1, student: 1 },
    { unique: true, name: 'tutor_1_student_1' },
  );
}

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI?.trim();
  if (!uri) {
    throw new Error('MONGO_URI is not defined in backend/.env');
  }

  const maskedUri = uri.replace(/:[^:]*@/, ':****@');
  console.log(`\n⏳ Connecting to real MongoDB Atlas database...`);
  console.log(`📍 Connection URI: ${maskedUri}`);

  try {
    await mongoose.connect(uri, {
      lookup: customLookup,
      serverSelectionTimeoutMS: 10000,
    });

    console.log(`\n============================================================`);
    console.log(`✅ CONNECTED TO REAL DATABASE: ${mongoose.connection.name}`);
    console.log(`🌐 Cluster Host: ${mongoose.connection.host}`);

    // Query and log real data from the database
    const totalUsers = await User.countDocuments();
    const mentors = await User.find({ role: 'mentor' }).select('name email subjects rating');

    console.log(`📊 TOTAL DOCUMENTS IN USERS COLLECTION: ${totalUsers}`);
    console.log(`👨‍🏫 Real Mentors Count: ${mentors.length}`);
    mentors.forEach((m, i) => {
      console.log(`   [${i + 1}] ${m.name} (${m.email}) - Subjects: [${m.subjects?.join(', ') || 'General'}]`);
    });
    console.log(`============================================================\n`);

    await migrateLegacyReviewIndexes();
  } catch (err: any) {
    console.error('\n❌ FAILED TO CONNECT TO MONGODB ATLAS:');
    console.error(`   Error: ${err.message}`);
    throw err;
  }

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });
}
