# Setup if package-lock.json is present

```
npm install
```

# Setup if package-lock.json is NOT present (i.e. initial setup)

Install Node.js and npm, then run:

```
npm init
```
then
```
npm install express --save
```
then
```
npm install
npm install nodemon --save
```

# Run

After successful install, run
```
nodemon index.js
```
to start an auto-restarting node server. If using from within portable environment, replace `nodemon` with: 
```
..\..\..\Node.js\node.exe
```

# Accessing server

Once running, server can be accessed from localhost:1337 in browser (which will send a get request) or from Postman where various requests can be easily tested.

# Info

https://stackoverflow.com/questions/17981677/using-post-data-to-write-to-local-file-with-node-js-and-express
https://www.w3schools.com/nodejs/nodejs_filesystem.asp
https://www.tutorialspoint.com/expressjs/expressjs_hello_world.htm