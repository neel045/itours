const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please Tell us your name']
  },

  email: {
    type: String,
    required: [true, 'please provid your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please Provide a valid email']
  },

  photo: {
    type: String,
    default: 'default.jpg'
  },

  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },

  password: {
    type: String,
    minlength: 8,
    required: [true, 'Please provide a password'],
    select: false
  },
  passwordConfirm: {
    type: String,
    minlength: 8,
    required: [true, 'Please confirm your password'],
    validate: {
      validator: function(el) {
        //this only works on SAVE and CREATE!!!
        return el === this.password;
      },
      message: 'password are not same'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

userSchema.pre('save', async function(next) {
  // only run this function if password is actually modified
  if (!this.isModified('password')) return next();

  // hash the password cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // delete the passwordConfirm field
  this.passwordConfirm = undefined;
});

userSchema.pre('save', function(next) {
  if (!this.isModified(this.password) || !this.isNew) return next(); //the this reference bug was here

  this.passwordChangedAt = Date.now() - 1000;
});

userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.pre(/^find/, function(next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.changedPasswordAfter = function(JWTTimeStamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return changedTimeStamp < JWTTimeStamp; //100< 200 return true
  }

  //false means password is not changed
  return false;
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  console.log({ resetToken }, this.passwordResetToken);
  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
