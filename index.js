const APIAI_TOKEN = "ca6ad02d83b24d6d81b920bba3180f4e" || process.env.DIALOGFLOW_CLIENT_ACCESS_TOKEN;
// const APIAI_SESSION_ID = process.env.APIAI_SESSION_ID;

const express = require('express');
const path = require('path');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const apiai = require('apiai')(APIAI_TOKEN);
const router = express.Router();

// Firebase
const admin = require('firebase-admin');

let serviceAccount = require(path.join(__dirname + '/mist_ai_fdb.json'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

let db = admin.firestore();


const app = express();

// Body Parser Middleware
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

// Handlebars Middleware
// app.engine('handlebars', exphbs({
//     defaultLayout: 'index'
// }));
// app.set('view engine', 'handlebars');
// var handlebars = require('handlebars');

// handlebars.registerHelper('for', function (from, to, incr, block) {
//     var accum = '';
//     for (var i = from; i < to; i += incr)
//         accum += block.fn(i);
//     return accum;
// });
// handlebars.registerHelper({
//     eq: function (v1, v2) {
//         return v1 === v2;
//     },
//     ne: function (v1, v2) {
//         return v1 !== v2;
//     },
//     lt: function (v1, v2) {
//         return v1 < v2;
//     },
//     gt: function (v1, v2) {
//         return v1 > v2;
//     },
//     lte: function (v1, v2) {
//         return v1 <= v2;
//     },
//     gte: function (v1, v2) {
//         return v1 >= v2;
//     },
//     and: function () {
//         return Array.prototype.slice.call(arguments).every(Boolean);
//     },
//     or: function () {
//         return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
//     }
// });


// PUBLIC
app.use(express.static(__dirname + '/views')); // html
app.use(express.static(__dirname + '/public')); // js, css, images


const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
    console.log('Server started on port ' + port);
})


// Socket IO
const io = require('socket.io')(server);
io.on('connection', function (socket) {
    console.log('a user connected!');
});

io.on('connection', function (socket) {
    socket.on('chat message', (text) => {
        console.log('Message: ' + text);

        // Get a reply from API.ai

        let apiaiReq = apiai.textRequest(text, {
            sessionId: 'APIAI_SESSION_ID'
        });

        apiaiReq.on('response', (response) => {
            let aiText = response.result.fulfillment.speech;
            console.log('Bot reply: ' + aiText);
            socket.emit('bot reply', aiText);
        });

        apiaiReq.on('error', (error) => {
            console.log(error);
        });

        apiaiReq.end();

    });
});

function addToDB(docRef, jsonObj) {
    docRef.add(jsonObj);
}

function getFromDB(docRef) {
    return docRef
        .get()
        .then(function (querySnapshot) {
            return querySnapshot.docs.map(doc => Object.assign(doc.data(), {
                id: doc.id
            }));
        });
}



app.get('/db', (req, res) => {
    // Add TO DB
    // let setAda = {
    //     first: 'Ayon',
    //     last: 'Roy',
    //     born: 1998
    // };

    // addToDB(db.collection('users'), setAda);


    //Get JSON
    let obj = getFromDB(db.collection('users')).then(o => {
        console.log(o);
    });

});

// Routers
app.get('/', (req, res) => {
    res.sendFile('index.html');
});

app.get('/navigation', (req, res) => {
    res.sendFile(path.join(__dirname + '/views/navigationSys.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname + '/views/dashboard.html'));
});


// Routers POST
app.post('/setReminder', (req, res) => {
    let title = req.body.title;
    let desc = req.body.desc;
    let time = req.body.time;

    let reminder = {
        title,
        desc,
        time
    };

    addToDB(db.collection('reminders'), reminder);
});


// // Dialogflow Webhook
// app.post('/webhook', (req, res) => {

//     const link = req.body.parameters.Link;
//     // return res.json({
//     //     speech: 'done',
//     //     fulfillmentText: 'done',
//     //     source: 'MIST.AI'
//     // });
// });