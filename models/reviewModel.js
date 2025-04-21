// review / rating / createdAt / ref to tour / ref to user
const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String, 
      required: [true, 'A review must have a description'],
      trim: true
    }, 
    rating: {
      type: Number,
      min: 1, 
      max: 5,
      default: 1
    }, 
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A Review must belong to a user']
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'A Review must belong to a tour']
    }
  },
  {
    timestamps: true,
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

reviewSchema.index({ user: 1, tour: 1 }, { unique: true });

reviewSchema.pre(/^find/, function(next) {
  // this.populate({
  //   path: 'tour',
  //   select: 'name',
  // }).populate({
  //   path: 'user',
  //   select: 'name photo',
  // });
  this.populate({
    path: 'user',
    select: 'name _id',
  });
  next();
})

reviewSchema.statics.calcAvgRatings = async function(tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    }, 
    {
      $group: {
        _id:  '$tour',
        nRating: { $sum: 1},
        avgRating: { $avg: '$rating' } 
      }
    }
  ]);
  if(stats.length) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    })
  }else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    })
  }
}

reviewSchema.post('save', function() {
  // Review.calcAvgRatings(this.tour);
  this.constructor.calcAvgRatings(this.tour);
})

// findByIdAndUpdate => findOneAndUpdate
// findByIdAndDelete => findOneAndDelete
reviewSchema.pre(/^findOneAnd/, async function(next) {
  this.r = await this.clone().findOne();
  next();
})

reviewSchema.post(/^findOneAnd/, async function() {
  // await this.findOne(); // can not work here as query has already executed
  await this.r.constructor.calcAvgRatings(this.r.tour);
})

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;