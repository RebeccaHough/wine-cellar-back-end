var express = require('express');
var fs = require('fs');
var app = express();

const filepath = './database.csv';

// what is this for
// app.configure(function(){
//     app.use('/public', express.static(__dirname + '/public'));  
//     app.use(express.static(__dirname + '/public')); 
//     app.use(express.bodyParser());
// });

/*** Pi endpoints ***/

/**
 * Add entries to Db
 */ 
app.post('/add', function(req, res) {
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
            appendToDatabase(filepath, body);
        }
    }
});

/*** Client endpoints ***/

/** 
 * Send Db
 */ 
app.get('/', function(req, res) {
   res.send("Hello get!");
});

/** 
 * Set settings
 */ 
app.post('/user', function(req, res) {
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
    res.send("Hello time!");
});

/*** Functions ***/

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

app.listen(1337);

// http.createServer(function (req, res) {
//     fs.readFile('demofile1.html', function(err, data) {
//       res.writeHead(200, {'Content-Type': 'text/html'});
//       res.write(data);
//       res.end();
//     });
// }).listen(8080);