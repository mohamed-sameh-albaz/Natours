const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');
const sharp = require('sharp');
const multer = require('multer');

const multerStorage = multer.memoryStorage(); // stored as a buffer

const multerFilter = (req, file, cb) => {
  // filter for images
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadTourImgs = upload.fields([
  { name: 'imageCover', max: 1 },
  { name: 'images', max: 3 },
]);

// upload.single('image') => req.file
// upload.single('images', 5) => req.files

exports.resizeTourImgs = catchAsync(async (req, res, next) => {
  // console.log(req.files);
  if (!req.files.images || !req.files.imageCover) next();
  // coverImage
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`; // for the update factory handler
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333) // 3 / 2 ratio
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);
  // Imgaes
  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
      await sharp(file.buffer)
        .resize(2000, 1333) // 3 / 2 ratio
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);
      req.body.images.push(filename);
    })
  );
  console.log(req.body);

  next();
});

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingAverage,price';
  req.query.fields = 'name,price,ratingAverages,description,difficulty';
  next();
};

exports.createTour = factory.createOne(Tour);
exports.getAllTours = factory.getAll(Tour);
exports.getTourById = factory.getOne(Tour, { path: 'reviews' });
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingAverages: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingAverages' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = +req.params.year;
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $project: {
        _id: 0, // execlude id of each tour
        month: '$_id', // include the month field with _id
        numTourStarts: 1, // include numTourStarts
        tours: 1,
      },
    },
    {
      $sort: {
        month: 1,
        numTourStarts: -1,
      },
    },
  ]);
  res.status(200).json({
    status: 'success',
    results: plan.length,
    data: {
      plan,
    },
  });
});

// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/34.1111,-118.113491/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const raduis = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;
  if (!lat || !lng) {
    next(
      new AppError(
        'please provide lattitude and longitude in the format of lat,lng',
        400
      )
    );
  }

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], raduis] } },
  });
  res.status(200).json({
    status: 'Succes',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const multiplier = unit === 'mi' ? 0.0006213712 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'please provide lattitude and longitude in the format of lat,lng',
        400
      )
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        // should always be the first stage in the pipline and require contains a geospatial index in fields
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);
  res.status(200).json({
    status: 'Succes',
    data: {
      data: distances,
    },
  });
});
