const express = require('express');
const viewController = require('./../controllers/viewController');
const authController = require('./../controllers/authController');
const router = express.Router();

router.get('/', authController.isLoggedIn, viewController.getOverview);
router.get('/login', authController.isLoggedIn, viewController.getLoginForm);
router.get('/tour/:slug', authController.isLoggedIn, viewController.getTour);
router.get('/me', authController.protect, viewController.getAccount);
// router.patch('/me', authController.protect, viewController.updateUserSettings);
// router.post(
//   '/submit-user-data',
//   authController.protect,
//   viewController.updateUserData
// );

module.exports = router;
