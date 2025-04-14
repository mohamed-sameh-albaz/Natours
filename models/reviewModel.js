// review / rating / createdAt / ref to tour / ref to user
const mongoose = require('mongoose');
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

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;