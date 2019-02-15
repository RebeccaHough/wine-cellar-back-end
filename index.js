var express = require('express');
var fs = require('fs');
var app = express();
var nodemailer = require('nodemailer');

const dbfilepath = './database.csv';
const settingsfilepath = './user-settings.json';

//for email alerter/nodemailer
var transporter;
const serverEmailAddress = 'wine.cellar.backend@gmail.com';
const serverEmailPassword = 'W1n3-C3114r';
const serverEmailService = 'gmail';

// TODO what is this for
// app.configure(function(){
//     app.use('/public', express.static(__dirname + '/public'));  
//     app.use(express.static(__dirname + '/public')); 
//     app.use(express.bodyParser());
// });

//TODO sheduled tasks for report gen and alarms
//https://www.codementor.io/miguelkouam/how-to-schedule-tasks-in-node-js-express-using-agenda-h8sdo6b9p

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
        //TODO
        appendToFile(body, settingsfilepath);
    } else {
        //TODO send Bad request 400 or something
        res.send("Malformatted body");
    }
});

/** 
 * Set time intervals 
 */
app.post('/time', function(req, res) {
    console.log('Received POST request on endpoint \'/time\'.');
    res.send("Hello time!");
});

/**
 * Send test email to email address saved in user-settings.json
 */
app.get('/email-me', function(req, res) {
    console.log('Received GET request on endpoint \'/email-me\'.');
    sendEmail()
    .then((info) => {
        res.send("Email successfully sent.");
    }).catch((err) => {
        res.send("Email failed to send.");
    });
});

//#endregion

//#region *** File functions ***

/** 
 * Append data specified by input args to database file contents
 * @param filepath
 * @param contents
 */
function appendToFile(filepath, contents) {
    //fs.appendFile
    console.warn('TODO');
}

/**
 * Return a Promise version of fs.readFile()
 * Usage: readFile(filename).then(data => {...}).catch(err => {...}));
 * @returns {Promise} a Promise
*/
function readFile(filename) {
    return new Promise(function(resolve, reject) {
        fs.readFile(filename, function(err, data){
            if (err) 
                reject(err); 
            else
                resolve(data);
        });
    });
};

/** 
 * Get database contents 
 * @param filepath
 * @returns string containing database contents
 */
function readDatabase(filepath) {
    //return file contents
    //TODO
    fs.readFile('filepath');
    return "";
}

/**
 * Load user settings from file
 * https://stackoverflow.com/questions/10049557/reading-all-files-in-a-directory-store-them-in-objects-and-send-the-object?answertab=active#tab-top
 * http://www.yaoyuyang.com/2017/01/20/nodejs-batch-file-processing.html
 * 
 * @param setting optional parameter to specify which setting to retreive
 * @returns the values of the setting(s) requested as a JS object
 */
function loadUserSettings(setting) {
    return new Promise(function(resolve, reject) {
        readFile('./user-settings.json')
        .then(data => {
            //load file content into javascript object
            userSettings = JSON.parse(data);
            //if specific setting was asked for
            if(typeof setting !== 'undefined') {
                //return specific setting
                resolve(userSettings[setting]);
            } else {
                //else return all settings
                resolve(userSettings);
            }
        }).catch(err => {
            reject(err);
        });
    });
}

//#endregion

//#region *** Data analysis functions ***

//#endregion

//#region *** Email alterter functions ***

/**
 * Send an email alert
 * TODO https://www.codementor.io/joshuaaroke/sending-html-message-in-nodejs-express-9i3d3uhjr
 * https://support.google.com/mail/?p=BadCredentials <----------
 */
function sendEmail() {
    //TODO load html body for this alarm
    var html = '<h1>Hello world</h1>';

    //TODO readFile('/html/alert-html.html') see Promise.all

    return new Promise(function(resolve, reject) {
        //load user email then send email
        loadUserSettings('userEmailAddress')
        .then(userEmailAddress => {
            //initialise email options
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
                    console.log("Failed to send email");
                    console.log(error);
                    //inform caller so they can inform the user
                    reject(err);
                } else {
                    console.log('Email successfully sent.');
                    console.log(info.response);
                    //inform caller so they can inform the user
                    resolve(info);
                }
            });
        }).catch((err) => {
            console.log('Failed to read settings file.');
            console.log(err);
            //inform caller so they can inform the user
            reject(err);
        });
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

//#endregion

app.listen(1337, '0.0.0.0');