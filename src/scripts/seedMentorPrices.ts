import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import User from '../models/User';

const MENTOR_RATES_AND_DETAILS = [
  // 500 - 3000 Range
  { rate: 1200, rating: 4.6, sessions: 18, exp: 'Peer Tutor (Batch 24)' },
  { rate: 1500, rating: 4.7, sessions: 22, exp: 'Junior Peer Mentor' },
  { rate: 1800, rating: 4.8, sessions: 29, exp: 'Lead Peer Mentor' },
  { rate: 2000, rating: 4.75, sessions: 25, exp: 'Subject Mentor' },
  { rate: 2200, rating: 4.85, sessions: 32, exp: 'Senior Peer Tutor' },
  { rate: 2500, rating: 4.9, sessions: 38, exp: 'Senior Peer Mentor' },
  { rate: 2800, rating: 4.92, sessions: 41, exp: 'Distinction Scholar Tutor' },
  { rate: 3000, rating: 4.88, sessions: 35, exp: 'Academic Peer Advisor' },
  { rate: 1400, rating: 4.5, sessions: 15, exp: 'Junior Tutor' },
  { rate: 2400, rating: 4.82, sessions: 27, exp: 'Teaching Assistant (Undergrad)' },
  { rate: 2600, rating: 4.91, sessions: 36, exp: 'Lead Academic Mentor' },

  // 3000 - 5000 Range
  { rate: 3200, rating: 4.85, sessions: 34, exp: 'Senior Faculty Assistant' },
  { rate: 3500, rating: 4.93, sessions: 48, exp: 'Advanced Subject Specialist' },
  { rate: 3800, rating: 4.89, sessions: 40, exp: 'Graduate Peer Instructor' },
  { rate: 4000, rating: 4.95, sessions: 52, exp: 'Lead Enterprise Mentor' },
  { rate: 4200, rating: 4.92, sessions: 46, exp: 'Visiting Tutor & Industry Eng' },
  { rate: 4500, rating: 5.0, sessions: 60, exp: 'Faculty Academic Mentor' },
  { rate: 4800, rating: 4.96, sessions: 55, exp: 'Principal Peer Instructor' },
  { rate: 5000, rating: 5.0, sessions: 65, exp: 'Master Academic Advisor' },
  { rate: 3400, rating: 4.87, sessions: 39, exp: 'Senior Systems Mentor' },
  { rate: 4600, rating: 4.98, sessions: 58, exp: 'Distinguished Faculty Mentor' },
];

async function updateMentorPrices() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI is missing in backend/.env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(uri);
  console.log('Connected to DB:', mongoose.connection.name);

  const mentors = await User.find({ role: 'mentor' });
  console.log(`Found ${mentors.length} mentors in MongoDB Atlas.`);

  for (let i = 0; i < mentors.length; i++) {
    const mentor = mentors[i];
    const details = MENTOR_RATES_AND_DETAILS[i % MENTOR_RATES_AND_DETAILS.length];

    mentor.hourlyRate = details.rate;
    mentor.rating = details.rating;
    mentor.reviewCount = details.sessions + 8;
    mentor.experience = details.exp;
    mentor.sessionCount = details.sessions;
    mentor.availability = (i % 2 === 0) ? 'Weekdays & Evenings' : 'Weekends & Flexible';

    await mentor.save();
    console.log(`✅ [${i + 1}/${mentors.length}] Updated ${mentor.name}: LKR ${mentor.hourlyRate}/hr | Rating: ${mentor.rating}★ | ${mentor.experience}`);
  }

  console.log('\n🎉 Successfully updated all mentors with varied hourly rates in 500-3000 and 3000-5000 ranges!');
  await mongoose.disconnect();
}

updateMentorPrices().catch((err) => {
  console.error('Update failed:', err);
  process.exit(1);
});
