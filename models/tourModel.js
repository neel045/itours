const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel');
// const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less or equal 40 characters'],
      minlength: [10, 'A tour name must have greater or equal 10 characters']
      // validate: [validator.isAlpha, 'Tour name must be contain only characters']
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have duration']
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have Max Group size']
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have Difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is Either: easy, medium ,difficult'
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'rating must be above 1.0'],
      max: [5, 'rating must be below 5.0']
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, 'A tour must have price']
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function(val) {
          //custom validator can only use when creating a new document
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below the regular price.'
      }
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have summary']
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String,
      trim: true,
      required: [true, 'A tour must have image']
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false
    },
    startLocation: {
      //GeoJson
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    ]
  },

  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('durationWeeks').get(function() {
  return this.duration / 7;
});

//virtual populate it's like inner join for dbms
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id'
});

//DOCUMENT  MIDDLEWARE: runs before the .save()and .create() not for .insertMany()
tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

//Performing embedding user documents into the tour documents
// tourSchema.pre('save', async function(next) {
//   const guidesPromises = this.guides.map(async id => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// tourSchema.pre('save', function(next) {
//   console.log('Will save or not.....wait my friend');
//   next();
// });

// tourSchema.post('save', function(doc, next) {
//   console.log(doc);
//   next();
// });

//QUERY MIDDLEWARE
// tourSchema.pre('find', function() {
tourSchema.pre(/^find/, function(next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

//populate for embeding a data into document
tourSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'guides',
    select: '-__v'
  });
  next();
});

//aggregation middleware
// tourSchema.pre('aggregate', function(next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   // console.log(this.pipeline());
//   next();
// });

tourSchema.post(/^find/, function(docs, next) {
  console.log(`Query took  ${Date.now() - this.start}`);
  next();
});
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
