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

/** Settings loaded from user-settings.json */
let settings;
/** Array to hold all scheduled jobs for alarm checking */
let alarms;
/** Object to hold scheduled job for report generation*/
let report;

/** List of valid endpoints, for use in invalid request responses */
let endpoints = [
    "/",
    "/get-settings-data",
    "/email-me",
    "/add-data", 
    "/user-settings", 
    "/time"
]
/** Reference to http.Server, set with app.listen() */
let server;
/** TODO last checked */
let lastChecked;

app.use(bodyParser.json());
//TODO to serve files may need something like express.static()

//#region *** Pi endpoints ***

/** 
 * Send Pi data collection settings.
 */ 
app.get('/data-collection-settings', function(req, res) {
    console.log('Received GET request on endpoint \'/get-settings-data\'.');
    //load dataCollectionParams portion of settings
    loadUserSettings('dataCollectionParams')
    .then((settings) => {
        console.log("Sending data collection settings to Pi.");
        res.status(200).json({ message: "Settings sent.", data: settings});
    }).catch((err) => {
        console.error(err);
        res.status(500).json({ message: "Failed to read user-settings file. Could not send settings."});
    });
 });

/**
 * Append data receieved from Pi to the database (the file pointed to by dbFilepath).
 */
app.post('/database', function(req, res) {
    console.log('Received POST request on endpoint \'/database\'.');
    //extract body
    let body = req.body;
    //if req.body is in expected format
    if(validatePiData(body)) {
        //convert to CSV format
        body = jsToCSV(body);
        //save new data to database
        appendToFile(dbFilepath, body)
        .then(info => {
            console.log("Successfully wrote data to database file.");
            res.status(200).json({ message: "Successfully wrote data to database file."});
        }).catch(err => {
            console.log("Failed to append data to database file.");
            console.log(err);
            res.status(500).json({ message: "Failed to append data to database file. Could not save data."});
        });
    } else {
        console.log("Failed to append data to database file. Received data was malformed.");
        res.status(500).json({ message: "Failed to append data to database file. Received data was malformed."});
    }
});

//#endregion

//#region *** Front-end client endpoints ***

/** 
 * Generic endpoint.
 */ 
app.get('/', function(req, res) {
    console.log('Received GET request on endpoint \'/\'.');
    res.status(200).json({ message: "Generic GET recieved. Please use the appropriate endpoint for server functionality.", endpoints: endpoints });
});

/**
 * Send database.
 */
app.get('/database', function(req, res) {
    console.log('Received GET request on endpoint \'/database\'.');
    //load database
    readFile(dbFilepath)
    .then((database) => {
        console.log("Sending database.");
        res.status(200).json({ message: "Database sent.", data: database});
    }).catch((err) => {
        console.error(err);
        res.status(500).json({ message: "Failed to read database file. Could not send database."});
    });
 });
 
/** 
 * Send settings data.
 */ 
app.get('/user-settings', function(req, res) {
    console.log('Received GET request on endpoint \'/user-settings\'.');
    //load all settings
    loadUserSettings()
    .then((settings) => {
        console.log("Sending settings.");
        res.status(200).json({ message: "Settings sent.", data: settings});
    }).catch((err) => {
        console.error(err);
        res.status(500).json({ message: "Failed to read user-settings file. Could not send settings."});
    });
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
    //         res.status(200).json({ message: "Successfully saved settings." });
    //     }).catch(err => {
    //         //if setings fail to be written to file, disregard them
    //         console.log("Failed to write settings to file. Could not save settings.");
    //         console.log(err);
    //         res.status(500).json({ message: "Failed to write settings to file. Could not save settings." });
    //     });
    // } else {
    //      console.log("Failed to save settings. Received data was malformed.");
    //      res.status(500).json({ message: "Failed to save settings. Received data was malformed."});
    // }
    res.status(500).json({ message: "Endpoint currently disabled."});
});

/**
 * Send test email to email address saved in user-settings.json.
 */
app.get('/email-me', function(req, res) {
    console.log('Received GET request on endpoint \'/email-me\'.');
    //send empty test email
    sendEmail()
    .then(info => {
        res.status(200).json({ message:"Successfully sent test email." });
    }).catch(err => {
        console.log("Failed to send test email.");
        console.log(err);
        res.status(500).json({ message:"Failed to send test email." });
    });
});

/**
 * Send a report to email address saved in user-settings.json.
 * Manual trigger for report generation.
 */
app.get('/send-report', function(req, res) {
    console.log('Received GET request on endpoint \'/send-report\'.');
    //send empty test email
    sendEmail()
    .then(info => {
        res.status(200).json({ message:"Successfully sent report." });
    }).catch(err => {
        console.log("Failed to send report.");
        console.log(err);
        res.status(500).json({ message:"Failed to send report." });
    });
});

//#endregion

//#region *** Invalid endpoints ***

//unsupported methods
app.all('/', function(req, res) {
    console.log('Received unsupported method request endpoint \'/\'.');
    methodNotSupportedHandler(res, ["GET"]);
});
app.all('/data-collection-settings', function(req, res) {
    console.log('Received unsupported method request endpoint \'/data-collection-settings\'.');
    methodNotSupportedHandler(res, ["GET"]);
});
app.all('/database', function(req, res) {
    console.log('Received unsupported method request endpoint \'/database\'.');
    methodNotSupportedHandler(res, ["GET", "POST"]);
});
app.all('/user-settings', function(req, res) {
    console.log('Received unsupported method request endpoint \'/user-settings\'.');
    methodNotSupportedHandler(res, ["GET", "POST"]);
});
app.all('/email-me', function(req, res) {
    console.log('Received unsupported method request endpoint \'/email-me\'.');
    methodNotSupportedHandler(res, ["GET"]);
});
app.all('/send-report', function(req, res) {
    console.log('Received unsupported method request endpoint \'/send-report\'.');
    methodNotSupportedHandler(res, ["GET"]);
});

//invalid endpoints
app.use(function (req, res) {
    console.log('Received request on invalid endpoint.');
    res.status(404).json({ message: "Invalid endpoint. Please use the appropriate endpoint for server functionality.", endpoints: endpoints});
});

/**
 * Error handler for 405 errors
 * @param {any} res response object
 * @param {string[]} supportedMethods string array of allowed methods
 */
function methodNotSupportedHandler(res, supportedMethods) {
    //add header
    res.set({ 'Allow': supportedMethods });
    res.status(405).json({ message: "Method not supported." });
}

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
 * Return a Promise version of fs.writeFile().
 * Usage: writeToFile(filename, content).then(data => {...}).catch(err => {...}));
 * 
 * @param {string} filepath path to file to write to
 * @param {string} content the content to write
 * @returns {Promise} a Promise
 */
function writeToFile(filepath, content) {
    return new Promise(function(resolve, reject) {
        fs.writeFile(filepath, content, function(err){
            if(err) 
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
            if(err) 
                reject(err); 
            else
                resolve();
        });
    });
}

/**
 * Check the data receievd from the Pi is well-formed and valid.
 * 
 * The data is well-formed if it is an array of arrays that contain exactly 3 'number' objects, and the humidity attribute is a number between 0 and 100.
 * 
 * @param {any} data an array of javascript objects to be checked against the above conditions
 * @return {boolean} a boolean indicating the data's validity
 */
function validatePiData(data) {
    //use try/catch in case the data is malformed
    try {
        for(let object in data) {
            if(!(
                object.length == 3
                && (object.time).instanceof(number) //unix timestamp
                && (object.temperature).instanceof(number) //temperature
                && (object.humidity).instanceof(number) //relative humidity percentage
                && (object.humidity) >= 0
                && (object.humidity) <= 100
            )) {
                console.log("Pi data failed the validation check.");
                return false;
            }
        }
        //if all the data passes the checks
        console.log("Pi data sucessfully validated.");
        return true;
    } catch(err) {
        console.log("Pi data failed the validation check.");
        console.log(err);
        return false;
    }
}

/**
 * Convert a JavaScript object with named properties to CSV data using the properties' values.
 * E.g.
 * {
 *     cat: "meow",
 *     dog: "woof"
 * }
 * becomes the string:
 * "meow, woof"
 * Each object is on its own new line
 * 
 * @param jsobjects a Javascript object or array of objects
 */
let jsToCSV = (function(jsobjects) {
    function objectToCSVString(obj) {
        //order not guaranteed in JSON
        //so store in time, temp, humidity order
        return obj.time + "," + obj.temperature + "," + obj.humidity
    }
    return function _jsToCSV(jsobjects) {
        csvString = "";
        if(Array.isArray(jsobjects)) {
            for(object in jsobjects) {
                csvString = objectToCSVString(object);
                csvString += "\n";
            }
            //get rid of last newline
            csvString = csvString.substring(0, csvString.length - 1);
        } else if(typeof jsobjects === 'object') {
            csvString = objectToCSVString(jsobjects);
        } else return null;
        return csvString;
    }
})();


/**
 * Load user settings from file
 * 
 * @param setting optional parameter to specify which setting to retreive
 * @returns the values of the setting(s) requested as a JS object
 */
function loadUserSettings(setting) {
    //if settings already exists, resolve instantly
    if(settings) 
        if(typeof setting !== 'undefined')
            if(settings[setting])
                return Promise.resolve(settings[setting]); 
            else {
                console.log("Requested setting does not exist.");
                return Promise.reject("Requested setting does not exist.");
            }
        else
            return Promise.resolve(settings);
    //else read settings from file
    return new Promise(function(resolve, reject) {
        readFile(settingsFilepath)
        .then(data => {
            //load file content into javascript object
            userSettings = JSON.parse(data);
            //if specific setting was asked for
            if(typeof setting !== 'undefined') {
                //return specific setting
                if(userSettings[setting])
                    resolve(userSettings[setting]); 
                else {
                    console.log("Requested setting does not exist.");
                    reject("Requested setting does not exist.");
                }
            } else {
                //else return all settings
                resolve(userSettings);
            }
        }).catch(err => {
            console.log("Failed to read file. Could not load settings.");
            console.log(err);
            //inform caller
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
    let retries = 0;
    while(retries < 30) {
        //load various settings into memory
        loadUserSettings()
        .then(loadSettings => {
            settings = loadSettings;
            alarms = [];
            
            //stop retrying
            retries = 30;

            //for each alarm, schedule a job based on check frequency
            for(alarm in settings.alarms) {
                createAlarm(alarm);
            }
    
            //schedule a job for report generation
            //when = toCronTime(settings.reportParams.reportGenerationFrequency)
            report = schedule.scheduleJob('0 12 * */1 *', function() {
                subject = "Wine cellar report"
                //generate necessary report details
                content = generateReportData();
                readFile('html/report.html')
                .then(data => {
                    sendEmail(subject, data, content);
                })
            });

        }).catch(err => {
            retries++;
            if(retries < 30)
                console.log("Retrying... Total retries: " + retires + ".");
            else {
                console.log("Retried 30 times without success. Shutting server down...");
                //exit server
                server.close();
            }
        });
    }
})();

/**
 * Convert a time in human readable format to cron format
 * @param {string} time time in human readable format
 * @returns {string} time in cron format
 */
function toCronTime(time) {
    let cronTime = time;
    //convert time to time format used by scheduler (cron)
    //every == /
    //if(time.contains("every"))
    //otherwise, run at this exact time (not that useful in this case?)
    //minute == first star, day == second star, month == third star
    //if no time specified
        //use 12pm i.e. 0 12 * * *
    //or use rules
    //var rule = new schedule.RecurrenceRule();
    //rule.minute = 42;
    return cronTime;
}


/**
 * Create and schedule an alarm.
 * 
 * @param alarm Javascript object containing information about an alarm such as its name and condition 
 */
function createAlarm(alarm) {
    //pass the correct alarm to the function
    let checkAlarmBind = checkAlarm.bind(null, alarm);
    //set the callback function for this alarm check
    let newAlarm = schedule.scheduleJob(alarm.checkFrequency, checkAlarmBind);
    //store this alarm in global alarms array
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
 * TODO Check whether the recent data entries in the database meet a certain condition and take action if they do.
 * 
 * @param alarm Javascript object containing information about an alarm such as its name and condition 
 */
function checkAlarm(alarm) {
    //read database
    readFile(dbFilepath)
    .then(data => {
        conditionMet = false;
        //TODO parse data back into a Javascript object
        data = CSVToJS(data);

        //check data against alarm condition
        for(line in data) {
            //TODO only check if most recent database entires violate condition
            if(line.time > lastChecked) {
                if(eval(alarm.condition) (line))
                    conditionMet = true;
            }
        }

        //TODO set last checked to now
        //lastChecked = now.toUNIXtimestamp();

        //if so, send email
        //if not, do nothing
        if(conditionMet) {
            console.log("Alarm " + alarm.name + " condition met.");
            if(alarm.isSubscribedTo) {
                subject = "Alarm " + alarm.name + " from wine-cellar-back-end";
                content = "Condition " + alarm.condition + " met. Please take action to correct the wine cellar's environment.";
                readFile('alert-email.html')
                .then(data => {
                    sendEmail(subject, data, content);
                });
            } else {
                console.log("Email alerts for " + alarm.name + " are not turned on. No email will be sent");
            }
        }
        
        //TODO store last line read, to know where to start checking entries from next time

    }).catch(err => {
        console.log("Encountered error while attempting to check database for alarm " + alarm.name + ".");
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
 * @param {string} html the optional html string to send
 * @param {string} content optional content to add to the email's html
 */
function sendEmail(subject, html, content) {
    if(!subject) subject = 'Test email from wine-cellar-back-end';
    if(!html) html = '<p>This is a test email!</p>';
    if(content) ; //TODO dynamically alter emails' html content

    return new Promise(function(resolve, reject) {
        loadUserSettings('userEmailAddress')
        .then(userEmailAddress => {
            //initialise email options
            let mailOptions = {
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
 * TODO Generate report data
 */
function generateReportData() {
    //over n timespan
    //generate graph
    //charts.js .toBase64Image();
    //https://www.chartjs.org/docs/latest/developers/api.html#tobase64image
    //https://github.com/chartjs/Chart.js

    //do statitsics

    //generate email html
    //readFile('').then(data => {sendEmail(subject, html, content)};
}

/**
 * Update report
 */
function updateReport(reportSettings, propertyChanged) {
    if(propertyChanged == 'reportGenerationFrequency') {
        //change report frequency
        report.reschedule(toCrontTime(reportSettings.reportGenerationFrequency));
    } 
    // else if(propertyChanged == 'reportGenerationFrequency') {
    // }
}

//#endregion

server = app.listen(1337, '0.0.0.0', function() {
    console.log("Server listening on port 1337...")
});
