const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');
const crypto = require('crypto');

const signToken = (id) => {
  const JWT = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
  return JWT;
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user.id);
  const cookiesOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true, // cookies can not be accessed or modified any way by the browser Prevent client-side JavaScript access
    // partitioned: true, // Required for CHIPS compliance in cross-site contexts
    secure: process.env.NODE_ENV === 'production', // Secure in production, false for local dev
  };
  console.log(cookiesOptions);
  res.cookie('jwt', token, cookiesOptions);
  // Remove password from response
  user.password = undefined;
  res.status(statusCode).json({
    status: 'success',
    token,
    data: user,
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, password, confirmPassword, role } = req.body;
  const newUser = await User.create({
    name,
    email,
    password,
    confirmPassword,
    role,
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  // 1) check if email and password are provided
  if (!email || !password) {
    return next(new Error('please provide email and password'), 400);
  }

  // 2) check if email and password are existed in the db
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new Error('incorrect email or password'), 401);
  }

  // 3) if ok send token to client
  createSendToken(user, 200, res);
});

exports.logout = catchAsync(async (req, res, next) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({
    status: 'success',
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) get the token and check if it's there
  let token = null;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
    if (token === 'null') {
      token = null;
    }
  }
  if (!token && req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token || token === 'null') {
    next(
      new AppError('You are not logged in! please log in to get access.', 401)
    );
  }
  // 2) verification the token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  console.log(decoded);
  // 3) check if the user still exists if the user not deleted
  const user = await User.findById(decoded.id);
  if (!user) {
    return next(
      new AppError('The user belonging to this token is no longer exists'),
      401
    );
  }

  // 4) check if the user changed his password after the token was issued
  if (user.changePasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently change the password, please log in again!'),
      401
    );
  }

  // Grant access to protected routes
  req.user = user;
  res.locals.user = user;
  next();
});

// grant acess to protected routes
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verification the token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) check if the user still exists if the user not deleted
      const user = await User.findById(decoded.id);
      if (!user) {
        return next();
      }

      // 3) check if the user changed his password after the token was issued
      if (user.changePasswordAfter(decoded.iat)) {
        return next();
      }

      // There is a logged in user
      res.locals.user = user;

      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles = ['admin', 'lead-guide'] , userRole = 'user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgetPassword = catchAsync(async (req, res, next) => {
  // 1) get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    next(new AppError('user with this email is not found', 404));
  }
  // 2) generate random reset token
  const resetToken = user.createResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  // 3) send the token to the user's email
  try {
    const resetUrl = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetUrl).sendPasswordReset();
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) get user based on token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: {
      $gt: Date.now(),
    },
  });
  // 2) if token has not expired
  if (!user) {
    return next(new AppError('Token is invalid or expired', 400));
  }
  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  user.passwordResetExpires = undefined;
  user.passwordResetToken = undefined;
  await user.save(); // validate for the new password

  // 3) update changePasswordAt for the user in the userModel Methods

  // 4) log the user in, send jwt
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) get the user form collection
  const user = await User.findById(req.user.id).select('+password');
  // 2) check if posted current password is correct
  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError('Your current password is wrong'), 401);
  }

  // 3) if so, update password
  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  await user.save();
  // if use findByIdAndUpdate => no confirm pass validation is done
  // no pass encryption is done
  // no changed at pass is done
  // query middlewares will not be called

  // 4) log user in, send JWT
  createSendToken(user, 200, res);
});
