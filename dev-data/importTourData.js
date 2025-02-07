const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tour = require('./../models/tourModel');

dotenv.config({ path: `${__dirname}/../config.env` });
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
mongoose.connect(DB).then(() => console.log('DB is connected successful'));

const data = fs.readFileSync(`${__dirname}/tours-simple.json`, 'utf-8');
const tours = JSON.parse(data);

const importData = async () => {
  try {
    await Tour.create(tours);
    console.log('data created successfully');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

const deleteData = async () => {
  try {
    await Tour.deleteMany();
    console.log('data deleted successfully');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}
