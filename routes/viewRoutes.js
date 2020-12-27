const express = require('express');
const viewController = require('../controller/viewController');
const authController = require('./../controller/authController');
const bookingController = require('./../controller/bookingController');

const router = express.Router();

router.get(
  '/',
  bookingController.createBookingCheckout,
  authController.isLoggedIn,
  viewController.getOverview
);
router.get('/login', authController.isLoggedIn, viewController.getLoginForm);
router.get('/tour/:slug', authController.isLoggedIn, viewController.getTour);
router.get('/me', authController.protect, viewController.getAccount);
router.post(
  '/submit-user-data',
  authController.protect,
  viewController.updateUserData
);
router.get('/my-tours', authController.protect, viewController.getMyTours);

module.exports = router;
