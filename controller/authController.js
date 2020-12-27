const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../Utils/catchAsync');
const AppError = require('./../Utils/appError');
const crypto = require('crypto');
const Email = require('./../Utils/email');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  user.password = undefined;

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);
  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(url);
  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // console.log('DAta', email, password);
  console.table(req.body);

  // 1)check if email and password exist or not
  if (!email || !password) {
    return next(new AppError('please provide valid email and password', 400));
  }

  // 2)check if user exist and password is correct
  const user = await User.findOne({ email }).select('+password');

  // 3)If everything is okay then send json web token
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect Email or Password', 401));
  }

  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'Logout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1)Check if token is exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access')
    );
  }

  //2)Varification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3)Check if user is still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist.',
        401
      )
    );
  }

  // 4)check if user changed password after the token was generated
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently Changed Password! Please log in again', 401)
    );
  }

  req.user = currentUser;
  res.locals.user = currentUser; //every pug template has access to res.locals

  next();
});

//only for rendered pages, no errors
exports.isLoggedIn = async (req, res, next) => {
  try {
    if (req.cookies.jwt) {
      //1)Varification token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      //2)Check if user is still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3)check if user changed password after the token was generated
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      //There is a LOGGED IN USER.
      res.locals.user = currentUser; //every pug template has access to res.locals
      return next();
    }
  } catch (error) {
    return next();
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //roles is an array and closure property of the js
    //roles ['admin']
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1) get user based on Posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('User Does not exist with this email address'));
  }

  //2) generate random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) send it to the user's email

  try {
    // await sendEmail({
    //   email: user.email,
    //   subject: 'Your password reset link and it will valid for only 10 min',
    //   message
    // });
    const resetURL = `${req.protocol}://${req.get('host')}
        /api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'sucess',
      message: 'token has been sent'
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('there was a error in sending a mail'), 500);
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on token

  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // 2)if token is not expired and there is a user,set a new password
  if (!user)
    return next(new AppError('token is invalid or token is expire', 400));

  //3) update changePasswordAt property for user
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 4) log the user in and send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) get user from collection
  const user = await User.findById(req.user.id).select('+password');
  // console.log(user);

  // 2)check if posted password is correct
  if (!user.correctPassword(req.body.passwordCurrent, user.password)) {
    return next(new AppError('Your Current Password is wrong !', 401));
  }

  // 3) if so update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // 4)log in user and send JWT
  createSendToken(user, 200, res);
});
