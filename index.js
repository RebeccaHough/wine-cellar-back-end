var express = require('express');
var fs = require('fs');
var app = express();
var nodemailer = require('nodemailer');

const dbfilepath = './database.csv';
const settingsfilepath = './settings.json'; //TODO

//for email alerter/nodemailer
var transporter;
const serverEmailAddress = 'youremail@gmail.com';
const serverEmailPassword = 'yourpassword';
const serverEmailService = 'gmail';

// TODO what is this for
// app.configure(function(){
//     app.use('/public', express.static(__dirname + '/public'));  
//     app.use(express.static(__dirname + '/public')); 
//     app.use(express.bodyParser());
// });

//#region *** Pi endpoints ***

/** 
 * Send Pi settings data
 */ 
app.get('/get-settings-data', function(req, res) {
    console.log('Received GET request on endpoint \'/get-settings-data\'.');
    res.send("Hello get!");
 });

/**
 * Add data from Pi to Db
 */ 
app.post('/add-data', function(req, res) {
    console.log('Received POST request on endpoint \'/add-data\'.');
    //extract body
    body = req.body;
    //test req.body is in csv format
    //TODO stricter error checking
    //TODO for loop for each line
    if(
        (items = body.split(',')) 
        && items[0].instanceof(number) //unix timestamp
        && items[1].instanceof(number) //temperature
        && items[2].instanceof(number) //relative humidity percentage
    ) {
        body = body.split('/n')
        //save res to Db file
        //TODO maybe overkill to do this in a for loop
        for(line in body) {
            //save to database.csv
            appendToDatabase(dbfilepath, body);
        }
    }
});

//#endregion

//#region *** Client endpoints ***

/** 
 * Send Db
 */ 
app.get('/', function(req, res) {
    console.log('Received GET request on endpoint \'/\'.');
    res.send("Hello get!");
});

/** 
 * Set settings
 */ 
app.post('/user', function(req, res) {
    console.log('Received POST request on endpoint \'/user\'.');
    if(body = JSON.parse(req.body)) {

    } else {
        //TODO send Bad request 400 or something
        res.send("Hello user!");
    }
});

/** 
 * Set time intervals 
 */
app.post('/time', function(req, res) {
    console.log('Received POST request on endpoint \'/time\'.');
    res.send("Hello time!");
});

//#endregion

//#region *** File functions ***

/** 
 * Append data specified by input args to database file contents
 * @param filepath
 * @param contents
 */
function appendToDatabase(filepath, contents) {
    fs.appendFile
}

/** 
 * Get database contents 
 * @param filepath
 * @returns string containing database contents
 */
function readDatabase(filepath) {
    //return file contents
    //TODO
    fs.readFile('filepath')
    return "";
}

/**
 * TODO Handle user settings
 */
function handleUserSettings() {
    return;
}

//#endregion

//#region *** Data analysis functions ***

//TODO

//#endregion

//#region *** Email alterter functions ***

/**
 * Send an email alert
 * TODO https://www.codementor.io/joshuaaroke/sending-html-message-in-nodejs-express-9i3d3uhjr
 */
function sendEmail() {
    //TODO load html body for this alarm
    var html = '<h1>Hello</h1>';

    //TODO load user's email address from settings, or request it
    var userEmailAddress = 'youremail@gmail.com';

    //initialise email options
    //TODO setup email account for server
    var mailOptions = {
        from: serverEmailAddress,
        to: userEmailAddress,
        subject: 'Sending Email using Node.js',
        html: html
      };

    //ensure nodemailer's transporter is available
    if(!transporter) createTransporter();

    //send email
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
          //TODO inform user
        } else {
          console.log('Email sent: ' + info.response);
          //TODO inform user
        }
      });
}

/**
 * Create nodemailer transporter
 */
function createTransporter() {
    transporter = nodemailer.createTransport({
        service: serverEmailService,
        auth: {
          user: serverEmailAddress,
          pass: serverEmailPassword
        }
    });
}

//#endregion

//#region *** Report generator functions ***

//TODO

//#endregion

app.listen(1337);