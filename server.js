require('dotenv').config();
const express = require('express');
const cors = require('cors');
var db = require('./config/dbConnection');
const bodyParser = require('body-parser');
const userRouter = require('./routes/userRouter');


const app = express();
const port = process.env.PORT || 5000;

app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/api', userRouter)
app.use((err,req,res,next) => {
    err.statusCode = err.statusCode || 500; 
    err.message = err.message || "internal server error";
    res.status(err.statusCode).json({
        message: err.message
    })
})


app.listen(port, () => console.log(`Example app listening on port ${port}!`));