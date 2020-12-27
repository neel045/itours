const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongooseSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const AppError = require('./Utils/appError');
const globalErrorHandler = require('./controller/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

//serving static files
// app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));

// 1.GLOBAL MIDDELWARES

//Set Security http headers
app.use(helmet());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//limit request from same IP
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many request from this ip please try again in an hour'
});
app.use('/api', limiter);

//body parser, reading data from body req.body
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(
  express.urlencoded({
    extended: true,
    limit: '10kb'
  })
);

//Data sanitization against NOSQL injections
app.use(mongooseSanitize());

//Data sanitization against XSS attacks
app.use(xss());

//Http parameter polution using hpp
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuntity',
      'maxGroupSize',
      'difficulty',
      'price',
      'ratingsAverage'
    ]
  })
);

//test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

//This Middleware used for setting security policy without this it does not allow to fetch map
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    `connect-src 'self' ws://127.0.0.1:65308/ http://127.0.0.1:3000/api/v1/bookings/checkout-session https://*.tiles.mapbox.com https://api.mapbox.com https://events.mapbox.com https://cdnjs.cloudflare.com/ajax/libs/axios/0.21.1/axios.min.js http://127.0.0.1:3000/api/v1/users/login https://js.stripe.com/v3/`
  );
  next();
});

//ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
