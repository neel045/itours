//review ,rating, createdAt ,ref tour and user
const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'A review cannot be empty']
    },
    rating: {
      type: Number,
      required: [true, 'review must have rating'],
      min: [1, 'rating must be grater then or equal to one'],
      max: [5, 'rating must be less then or equal to five'],
      set: val => Math.round(val * 10) / 10 //4.66667 => 46.777 => round => 47 /10 => 4.7
    },
    createdAt: {
      type: Date,
      default: Date.now()
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'review must Belong to a tour']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'review must Belong to a user']
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// FIXME: This is bug which allow user to create multiple review on same tour
// TODO: Delete all existing data which does't follow this index
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// //populate for embeding a data into document
reviewSchema.pre(/^find/, function(next) {
  // this.populate({
  //   path: 'tour',
  //   select: 'name'
  // }).populate({
  //   path: 'user',
  //   select: 'name photo'
  // });
  //taking whole tour is costly in terms of server cost
  this.populate({
    path: 'user',
    select: 'name photo'
  });

  next();
});

reviewSchema.statics.calcAverageRatings = async function(tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  }
};

reviewSchema.post('save', function() {
  // this points to current review this.constructor has value of Model
  this.constructor.calcAverageRatings(this.tour);
});

//findByIdAndDelete
//findByIdAndUpdate

reviewSchema.pre(/^findOneAnd/, async function(next) {
  this.r = await this.findOne();
  next();
});

reviewSchema.post(/^findOneAnd/, async function() {
  // this.r = await this.findOne();Does not work here because query is already executed
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
