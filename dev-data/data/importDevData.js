const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tour = require('./../../models/tourModel');
const User = require('./../../models/userModel');
const Review = require('./../../models/reviewModel');

dotenv.config({ path: `${__dirname}/../../config.env` });

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
console.log('Connection string:', DB);

mongoose.set('debug', true);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(DB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 50000,
      maxPoolSize: 10,
    });
    console.log('DB connected successfully:', conn.connection.name);
    return conn;
  } catch (err) {
    console.error('DB connection error:', err);
    throw err;
  }
};

const toursData = fs.readFileSync(`${__dirname}/tours.json`, 'utf-8');
const usersData = fs.readFileSync(`${__dirname}/users.json`, 'utf-8');
const reviewsData = fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8');
const tours = JSON.parse(toursData);
const users = JSON.parse(usersData);
const reviews = JSON.parse(reviewsData);

const importData = async () => {
  let conn;
  try {
    conn = await connectDB();
    console.log('Starting import...');

    console.log('Importing tours...');
    await Tour.create(tours, { validateBeforeSave: false });
    console.log('Tours imported:', tours.length);

    console.log('Importing users...');
    await User.create(users, { validateBeforeSave: false });
    console.log('Users imported:', users.length);

    console.log('Importing reviews...');
    await Review.create(reviews, { validateBeforeSave: false });
    console.log('Reviews imported:', reviews.length);

    console.log('Data import completed successfully');
  } catch (err) {
    console.error('Import error:', err);
    process.exit(1);
  } finally {
    if (conn) {
      await mongoose.connection.close();
      console.log('Connection closed');
    }
    process.exit(0);
  }
};

const deleteData = async () => {
  let conn;
  try {
    conn = await connectDB();
    console.log('Starting delete...');
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    const collectionExists = collections.some((c) => c.name === 'tours');
    console.log('Tours collection exists:', collectionExists);

    const count = await Tour.countDocuments();
    console.log('Documents in tours collection:', count);

    let result = await Tour.deleteMany();
    console.log('Data deleted successfully:', result.deletedCount, 'tours');
    result = await User.deleteMany();
    console.log('Data deleted successfully:', result.deletedCount, 'Users');
    result = await Review.deleteMany();
    console.log('Data deleted successfully:', result.deletedCount, 'Reviews');
  } catch (err) {
    console.error('Delete error:', err);
    process.exit(1);
  } finally {
    if (conn) {
      await mongoose.connection.close();
      console.log('Connection closed');
    }
    process.exit(0);
  }
};

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
} else {
  console.log('Please use --import or --delete');
  process.exit(1);
}
