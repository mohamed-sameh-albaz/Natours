const mongoose = require('mongoose');

const tourSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A tour must have a name'],
    unique: true,
  },
  price: {
    type: Number,
    required: [true, 'A tour must have a price'],
  },
  ratings: {
    type: Number,
    default: 4.5,
  },
});

const Tour = mongoose.models.Tour || mongoose.model('Tour', tourSchema);
module.exports = Tour;