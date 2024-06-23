const express = require('express');
const {signUpValidation,loginValidation} = require('../helpers/validation');
const userController = require('../controllers/userController');
const router = express.Router();

router.post('/resetPassword', userController.resetPassword);
router.post('/sendMailToResetPassword', userController.sendMailtoResetPassword);
router.post('/register', signUpValidation, userController.register);
router.post('/login', loginValidation, userController.login);

module.exports = router;