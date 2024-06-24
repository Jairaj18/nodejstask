const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const db = require('../config/dbConnection'); 
const jwt = require('jsonwebtoken');
const {JWT_SECRETKEY} = process.env;
const transporter = require('../config/nodeMailerConnection');

const register = (req, res) => {
 
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({errors: errors.array()});

    const { firstname, lastname, email, password } = req.body;

    db.query(
        `SELECT * FROM users WHERE LOWER(email) = LOWER(${db.escape(email)});`,
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (result && result.length) {
                return res.status(400).json({ error: 'Email already in use' });
            } else {
                // Email is available, proceed with registration
                bcrypt.hash(req.body.password, 10, (err, hashedPassword) => {
                    if (err) {
                        return res.status(500).json({ error: 'Error hashing password' });
                    }

                    db.query(
                        `INSERT INTO users (firstname, lastname, email, password) VALUES (${db.escape(req.body.firstname)}, ${db.escape(req.body.lastname)}, ${db.escape(req.body.email)}, ${db.escape(hashedPassword)});`,
                        (err, result) => {
                            if (err) {
                                return res.status(500).json({ error: 'Database error' });
                            }
                            return res.status(201).json({ message: 'User registered successfully' });
                        }
                    );
                });
            }
        }
    );
};


const login = (req, res) => {
    
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({errors: errors.array()});

    const { email, password } = req.body;

    db.query(
        `SELECT * FROM users WHERE email = ${db.escape(email)}`,
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (!result.length) {
                return res.status(401).json({ error: 'User not found' });
            }
            bcrypt.compare(password, result[0].password, 
                (err, isMatch) => {
                if (err) {
                    return res.status(500).json({ error: 'Error comparing passwords' });
                }
                if (isMatch) {
                    jwt.sign(
                        { id: result[0].id },
                        JWT_SECRETKEY,
                        { expiresIn: '5m' },
                        (err, token) => {
                            if (err) {
                                return res.status(500).json({ error: 'Error in signing token' });
                            }
                            return res.status(200).json({ 
                                token ,
                                msg:"Login successful",
                                user: result[0]
                            });
                        }
                    );
                } else {
                    return res.status(401).json({ error: 'Incorrect password' });
                }
            });
        }
    );
};

const sendMailtoResetPassword = async (req, res) => {

    const { email } = req.body;
    
    db.query(
        `SELECT * FROM users WHERE email = ${db.escape(email)}`,
        async (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (!result.length) {
                return res.status(401).json({ error: 'User not found' });
            }
            
            const secret = result[0].id + process.env.JWT_SECRETKEY;
            console.log(result[0].name  );
            const token = jwt.sign({ customer_id: result[0].id }, secret, { expiresIn: '5m' });
            const link = `http://localhost:3000/forgotpassword/${result[0].id}/${token}`;
            
            console.log("Link:====>", link);

            var mailOptions = {
                from: process.env.EMAIL_USER,
                to: result[0].email,
                subject: "Reset Password",
                text: "Link for Password Reset",
                html: `<h3>Hii ${result[0].firstname}, Please copy this link <a href="${link}"> and reset your password</a></h3>`
            };
            
            try {
                let info = await transporter.sendMail(mailOptions);
                console.log("Email sent: " + info.response);
                return res.status(200).json({ 
                    message: 'Email sent successfully',
                    link: link
                });
            } catch (error) {
                return res.status(500).json({ error: 'Failed to send email' });
            }
        });
};

const resetPassword = (req, res) => {
    const { password, confirm_password } = req.body;
    const { id, token } = req.query;
    try {
        db.query(
            `SELECT * FROM users WHERE id = ${db.escape(id)}`,
            async (err, result) => {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }
                if (result.length === 0) {
                    return res.status(401).json({ error: 'User not found' });
                }

                const customer_id = result[0].id;
                const new_secret = customer_id + process.env.JWT_SECRETKEY;
                
                try {
                    const decodedCustomerId = jwt.verify(token, new_secret);

                    if (password && confirm_password) {
                        if (password !== confirm_password) {
                            return res.status(400).json({
                                success: false,
                                msg: "New Password and Confirm Password don't match",
                            });
                        } else {
                            const newHashPassword = await bcrypt.hash(password, 10)

                            db.query(
                                `UPDATE users SET password = ${db.escape(newHashPassword)} WHERE id = ${db.escape(customer_id)}`,
                                async (updateErr, updateResult) => {
                                    if (updateErr) {
                                        return res.status(500).json({ error: 'Failed to update password' });
                                    } else {
                                        return res.status(200).json({
                                            success: true,
                                            msg: "Password reset successfully",
                                        });
                                    }
                                }
                            );
                        }
                    }
                } catch (jwtError) {
                    return res.status(401).json({ error: 'Invalid or expired token' });
                }
            }
        );
    } catch (catchErr) {
        
        return res.status(500).json({ error: 'Failed to reset password' });
    }
}

module.exports = {
    register,
    login,
    sendMailtoResetPassword,
    resetPassword
};
