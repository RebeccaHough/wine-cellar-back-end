//load modules
var express = require('express');
var app = express();
var fs = require('fs');
var nodemailer = require('nodemailer');
var schedule = require('node-schedule');
var bodyParser = require('body-parser');

//file paths
const dbFilepath = './savedata/database.csv';
const settingsFilepath = './savedata/user-settings.json';

//for email alerter/nodemailer
var transporter;
const serverEmailAddress = 'wine.cellar.backend@gmail.com';
const serverEmailPassword = 'W1n3-C3114r';
const serverEmailService = 'gmail';

//variables loaded from user-settings.json
let settings;
/** Array to hold all scheduled jobs for alarm checking */
let alarms;

app.use(bodyParser.json());

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
        //(This should, in theory, rarely happen. One possible occurance would be if the app receives a
        //request before the main has finished loading user-settings into memory. In which case,
        //the action of reading the file again may be redundant, but is more proactive and easier than 
        //waiting an unknown amount of time for main to load in said settings.)
        readFile(settingsFilepath)
        .then((data) => {
            console.log("Sending settings to Pi.");
            res.send(JSON.stringify(data.dataCollectionParams));
        }).catch((err) => {
            console.error(err);
            //TODO error message format
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
    let body = req.body;
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
 * The data is well-formed if it is an array of arrays that contain exactly 3 'number' objects.
 * 
 * TODO need to handle malformed data better
 * 
 * @param {any} data a javascript object to be checked against the above conditions
 * @return {boolean} a boolean indicating the data's validity
 */
function validatePiData(data) {
    for(let array in data) {
        if(
            (items = array.split(','))
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
        readFile(settingsFilepath)
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
(function setup() {
    console.log("Starting wine cellar back end.")
    //load various settings into memory
    loadUserSettings()
    .then(loadSettings => {
        settings = loadSettings;
        alarms = [];
        
        //for each alarm, schedule a job based on check frequency
        for(alarm in settings.alarms) {
            if(!alarm in alarms) createAlarm(alarm);
        }

        //schedule a job for report generation
        //when = toTime(settings.reportParams.reportGenerationFrequency)
        let report = schedule.scheduleJob('42 * * * *', function() {
            subject = "Monthly wine cellar report"
            //generate necessary report details
            content = generateReportData();
            sendEmail(subject, 'html/report.html', content);
        });
    }).catch(err => {
        console.log(err); //TODO
    });
})();

/**
 * TODO update how often a sheduled task runs (may not be able to use a function for this)
 * https://github.com/node-schedule/node-schedule
 * @param time time in ??
 * @returns time in cron format
 */
function toTime(time) {
    //convert time to time format used by scheduler (cron)
    //or use rules
    //var rule = new schedule.RecurrenceRule();
    //rule.minute = 42;
    //or use dates
    //ver date = new Date();
    return time;
}


/**
 * Create and schedule an alarm.
 * 
 * @param alarm Javascript object containing information about an alarm such as its name and condition 
 */
function createAlarm(alarm) {
    let newAlarm = schedule.scheduleJob(alarm.checkFrequency, function() {
        checkAlarm(alarm);
    });
    //store in global alarms array
    alarms.push(newAlarm);
}

/**
 * Update an alarm job that is currently extant, its condition or its frequency.
 * Must call upon settings change.
 */
function updateAlarm(alarm, propertyChanged) {
    //TODO if any alarm or report generation params are changed
    //for(alarm in alarms)
    //if(alarm == this alarm)
    //alarm.reschedule(toTime(alarm.checkFrequency));
}

/**
 * TODO Check whether the recent data entries in the database meet a certain condition and take action 
 * if they do.
 * 
 * @param alarm Javascript object containing information about an alarm such as its name and condition 
 */
function checkAlarm(alarm) {
    //read database
    readFile(dbFilepath)
    .then(data => {
        //TODO check if most recent database entires violate condition
        //if so, send email
        //if not, do nothing
        if(data != alarm.condition) {
            subject = 'Alarm' + alarm.name + 'from wine-cellar-back-end';
            content = 'Condition ' + alarm.condition + ` met. Please take action to correct the 
            wine cellar's environment.`;
            sendEmail(subject, 'alert-email.html', content);
        }
        
        //store last line read, to know where to start checking entries from next time

    }).catch(err => {
        console.log(err); //TODO
    });
}

//#endregion

//#region *** Email alterter functions ***

/**
 * Send an email alert.
 * TODO https://www.codementor.io/joshuaaroke/sending-html-message-in-nodejs-express-9i3d3uhjr
 * TODO above link uses email-templates to load emails
 * 
 * @param {string} subject the optional email subject
 * @param {string} html the optional filepath from which the email's html should be loaded
 * @param {string} content optional content to add to the email's html
 */
function sendEmail(subject, html, content) {
    if(!subject) subject = 'Test email from wine-cellar-back-end';
    if(!html) { 
        html = '<p>This is a test email!</p>';
    } else {
        //TODO load html body for this alarm/report
        //TODO readFile('/html/alert-html.html') see Promise.all
        if(content) ; //TODO load in specific content 
    }

    return new Promise(function(resolve, reject) {
        //TODO IMPORTANT change so don't need to get userEmailAddress from file
        //load user email then send email
        loadUserSettings('userEmailAddress')
        .then(userEmailAddress => {
            //initialise email options
            var mailOptions = {
                from: serverEmailAddress,
                to: userEmailAddress,
                subject: subject,
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

/**
 * Generate report data
 */
function generateReportData() {

}

//#endregion

app.listen(1337, '0.0.0.0', function() {
    console.log("Server listening on port 1337...")
});
