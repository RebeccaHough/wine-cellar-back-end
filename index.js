//load modules
var express = require('express');
var app = express();
var fs = require('fs');
var nodemailer = require('nodemailer');
var schedule = require('node-schedule');

//file paths
const dbFilepath = './savedata/database.csv';
const settingsFilepath = './savedata/user-settings.json';

//for email alerter/nodemailer
var transporter;
const serverEmailAddress = 'wine.cellar.backend@gmail.com';
const serverEmailPassword = 'W1n3-C3114r';
const serverEmailService = 'gmail';

//settings loaded from user-settings.json
let settings;

//#region *** Pi endpoints ***

/** 
 * Send Pi settings data
 */ 
app.get('/get-settings-data', function(req, res) {
    console.log('Received GET request on endpoint \'/get-settings-data\'.');
    //if settings are currently stored in memory
    if(settings && settings.dataCollectionParams) {
        console.log("Sending settings to Pi.");
        res.send(JSON.stringify(data.dataCollectionParams));
    } else {
        //else read file then attempt to send relevant contents to Pi
        //(this should, in theory, never happen)
        readFile(settingsFilepath)
        .then((data) => {
            console.log("Sending settings to Pi.");
            res.send(JSON.stringify(data.dataCollectionParams));
        }).catch((err) => {
            console.error(err);
            res.send(JSON.stringify({
                error: "Failed to read user-settings file."
            }));
        });
    }
 });

/**
 * Append data receieved from Pi to the database (the file pointed to by dbFilepath)
 */ 
app.post('/add-data', function(req, res) {
    console.log('Received POST request on endpoint \'/add-data\'.');
    //extract body
    body = req.body;
    //if req.body is in expected format
    if(validatePiData(body)) {
        //save new data to database
        appendToFile(dbFilepath, body)
        .then(info => {
            console.log("Successfully wrote data to database file.");
            //TODO message format
            res.send("Successfully saved data.");
        }).catch(err => {
            console.log("Failed to write data to database file.");
            console.log(err);
            //TODO error message format
            res.send("Failed to save data to file.");
        });
    } else {
        console.log("Failed to append data to database file. Received data was malformatted.");
        //TODO error message format
        res.send("Malformatted data.");
    }
});

//#endregion

//#region *** Front-end client endpoints ***

/** 
 * Send database
 */ 
app.get('/', function(req, res) {
    console.log('Received GET request on endpoint \'/\'.');
    //TODO maybe save '/' for just a list of possible endpoints
    res.send("Hello get!");
});

/** 
 * Change/set user settings, and save them to file. 
 * 
 * Failure to write new settings to file will cause the new settings to be completely discarded; 
 * i.e. the script must be able to save the new settings in memory AND write them to file for 
 * them to be updated; it is an atomic operation.
 */ 
app.post('/user-settings', function(req, res) {
    console.log('Received POST request on endpoint \'/user-settings\'.');
    //TODO IMPORTANT handle just changing one setting or all of them
    //body may need to have keys 'settingName: value' and settings var can be used to fill in the rest
    //need to define this from client end as well
    //TODO also need to perform error checking/validation before blindly writing to file
    // if(body = JSON.parse(req.body)) {
    //     writeToFile(body, settingsFilepath)
    //     .then(info => {
    //         //save settings in memory ONLY if file write was succesful to avoid discrepancy
    //         settings = body;
    //         console.log("Successfully wrote settings to file.");
    //         //TODO message format
    //         res.send("Successfully saved settings.");
    //     }).catch(err => {
    //         console.log("Failed to write settings to file; disregarding settings.");
    //         console.log(err);
    //         //TODO error message format
    //         res.send("Failed to save settings.");
    //     });
    // } else {
    //     console.log("POST request body malformatted, could not update settings.");
    //     //TODO define error messages' format properly, using error codes and JSON?
    //     //e.g. something like
    //     //res.send(new HTTPError({
    //     //     //some JSON
    //     // }));
    //     res.send("Malformatted body.");
    // }
    res.send("Currently disabled.");
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
        res.send("Successfully sent test email.");
    }).catch((err) => {
        console.log("Failed to send test email.");
        console.log(err);
        res.send("Failed to send test email.");
    });
});

//#endregion

//#region *** File functions ***

/**
 * Returns a Promise version of fs.readFile().
 * Usage: readFile(filename).then(data => {...}).catch(err => {...}));
 * @param {string} filepath path to file to read
 * @returns {Promise} a Promise
*/
function readFile(filepath) {
    return new Promise(function(resolve, reject) {
        fs.readFile(filepath, function(err, data){
            if (err) 
                reject(err); 
            else
                resolve(data);
        });
    });
}

/** 
 * Write specified by content to the file specified by filepath.
 * 
 * Return a Promise version of fs.appendFile().
 * Usage: appendToFile(filename, content).then(data => {...}).catch(err => {...}));
 * 
 * @param {string} filepath path to file to append to
 * @param {string} content the content to append
 * @returns {Promise} a Promise
 */
function writeToFile(filepath, content) {
    return new Promise(function(resolve, reject) {
        fs.writeFile(filepath, content, function(err){
            if (err) 
                reject(err); 
            else
                resolve();
        });
    });
}

/** 
 * Append data specified by content to the file specified by filepath.
 * 
 * Returns a Promise version of fs.appendFile().
 * Usage: appendToFile(filename, content).then(data => {...}).catch(err => {...}));
 * 
 * @param {string} filepath path to file to append to
 * @param {string} content the content to append
 * @returns {Promise} a Promise
 */
function appendToFile(filepath, content) {
    return new Promise(function(resolve, reject) {
        fs.appendFile(filepath, content, function(err){
            if (err) 
                reject(err); 
            else
                resolve();
        });
    });
}

/**
 * Check the data receievd from the Pi is well-formed and valid.
 * 
 * The data is well-formed if it contains single- or multi-line string of exactly 3 numbers per line,
 * each separated by a comma.
 * 
 * TODO test
 * 
 * @param {string} data single- or multi-line string of data to be checked against the above conditions
 * @return {boolean} a boolean indicating the data's validity
 */
function validatePiData(data) {
    data = data.split('/n');
    for(line in data) {
        if(
            (items = body.split(','))
            && items.length == 3
            && items[0].instanceof(number) //unix timestamp
            && items[1].instanceof(number) //temperature
            && items[2].instanceof(number) //relative humidity percentage
        ) return false;
    }
    return true;
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

/**
 * Perform initial start-up operations, such as loading settings into memory and
 * scheduling periodic operations, such as report generation
 */
(function main() {
    //load various settings into memory
    loadUserSettings.then(loadSettings => {
        settings = loadSettings;

        for(alarm in settings.alarms) {
            let alarm = schedule.scheduleJob('42 * * * *', function() {
                sendEmail();
            });
        }
        settings.reportParams.reportGenerationFrequency
    })
})();

/**
 * TODO update how often a sheduled task runs (may not be able to use a function for this)
 * https://github.com/node-schedule/node-schedule
 * @param time time in ??
 * @returns time in cron format
 */
function updateScheduledTime(time) {
    //convert time to time format used by scheduler (cron)
    //or use rules
    //var rule = new schedule.RecurrenceRule();
    //rule.minute = 42;
    //or use dates
    //ver date = new Date();
    return time;
}

//#endregion

//#region *** Email alterter functions ***

/**
 * Send an email alert
 * TODO https://www.codementor.io/joshuaaroke/sending-html-message-in-nodejs-express-9i3d3uhjr
 * TODO above link uses email-templates to load emails
 */
function sendEmail() {
    //TODO load html body for this alarm
    var html = '<h1>Hello world</h1>';

    //TODO readFile('/html/alert-html.html') see Promise.all

    return new Promise(function(resolve, reject) {
        //TODO IMPORTANT change so don't need to get userEmailAddress from file
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
                    console.log("Failed to send email.");
                    console.log(error);
                    //inform caller so they can inform the user
                    reject(error);
                } else {
                    console.log('Email successfully sent.');
                    console.log(info.response);
                    //inform caller so they can inform the user
                    resolve(info);
                }
            });
        }).catch((err) => {
            console.log('Failed to read settings file. Could not get email address of recipient.');
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