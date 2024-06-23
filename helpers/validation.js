const { check } = require('express-validator');

exports.signUpValidation = [
  check('firstname', 'firstname is required').not().isEmpty(),
  check('lastname', 'lastname is required').not().isEmpty(),
  check('email', 'email is required').isEmail(),
  check('password', 'password is required').isLength({ min: 6 })
];

exports.loginValidation = [
    check('email', 'email is required').isEmail(),
    check('password', 'password is required').isLength({ min: 6 })
];
   