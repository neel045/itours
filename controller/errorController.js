const AppError = require('./../Utils/appError');

const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
  const message = `Duplicate field Value: ${err.keyValue.name}, Please Use Another Value`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid Input Data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid Token. Please log in again.', 401);

const handleJWTExpiredError = () =>
  new AppError('Your Token has been expired please login again.', 401);

const sendErrorDev = (err, req, res) => {
  //A) API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }

  console.error('Error 💥', err);

  // B) RENDERED WEBSITE
  return res.status(err.statusCode).render('error', {
    title: 'Something Went Wrong!',
    msg: err.message
  });
};

const sendErrorPro = (err, req, res) => {
  //A) API
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    }
    //programming or other unknown error is occured: don't leak this kind of infomation
    // 1)Log error
    console.error('Error 💥', err);
    console.error('Error 💥', err.stack);

    // 2) send generated message
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!'
    });
  }

  // B) RENDERED WEBSITE
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something Went Wrong!',
      msg: err.message
    });
  }
  //programming or other unknown error is occured: don't leak this kind of infomation
  // 1)Log error
  console.error('Error 💥', err);

  // 2) send GENERIC message
  return res.status(err.statusCode).render('error', {
    title: 'Something Went Wrong!',
    msg: 'Please Try Again Later'
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.name = err.name;
    error.message = err.message;

    if (error.name === 'CastError') {
      error = handleCastErrorDB(error);
    }
    if (error.code === 11000) {
      error = handleDuplicateFieldsDB(error);
    }
    if (error.name === 'ValidationError') {
      error = handleValidationErrorDB(error);
    }
    if (error.name === 'JsonWebTokenError') {
      error = handleJWTError();
    }
    if (error.name === 'TokenExpiredError') {
      error = handleJWTExpiredError();
    }
    sendErrorPro(error, req, res);
  }
};
