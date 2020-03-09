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


// Tensorflow js
const tf = require('@tensorflow/tfjs');
// const tfn = require("@tensorflow/tfjs-node");
// async function loadModel() {
//     const handler = tfn.io.fileSystem("./model/my-model1.json");
//     const model = await tf.loadModel(handler);
// }
// loadModel();




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


// CLOUD FIRESTORE CRUD

function addToDB(docRef, jsonObj) {
    let ref = docRef.add(jsonObj).then();
    return true;
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

function updateDB(docRef, jsonObj) {
    let ref = docRef.update(jsonObj);
    return true;
}

function deleteDB(docRef) {
    let ref = docRef.delete();
    return true;
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

app.get('/reminder', (req, res) => {
    res.sendFile(path.join(__dirname + '/views/reminder.html'));
});

app.get('/weather', (req, res) => {
    res.sendFile(path.join(__dirname + '/views/weather.html'));
});

app.get('/addCourse', (req, res) => {
    res.sendFile(path.join(__dirname + '/views/addCourseAuth.html'));
});

app.get('/attendance', (req, res) => {
    res.sendFile(path.join(__dirname + '/views/attendance.html'));
});

app.get('/getCourses', (req, res) => {
    //Get JSON
    let obj = getFromDB(db.collection('courses')).then(o => {
        //console.log(o);
        res.send(o);
    });
});

app.get('/getReminders', (req, res) => {
    //Get JSON
    let obj = getFromDB(db.collection('reminders')).then(o => {
        //console.log(o);
        res.send(o);
    });
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
    //res.sendFile(path.join(__dirname + '/views/reminder.html'));
    res.redirect("/reminder");
});

app.post('/addCourse', (req, res) => {
    let pass = req.body.pass;
    if (pass == "iamfaculty") {
        res.sendFile(path.join(__dirname + '/views/addCourse.html'));
    } else {
        res.sendFile(path.join(__dirname + '/views/error.html'));
    }

});

app.post('/addACourse', (req, res) => {
    let courseName = req.body.courseName;
    let credit = req.body.sellist1;
    let creativity = req.body.creativity;
    let memorization = req.body.memorization;
    let computation = req.body.computation;
    let analysis = req.body.analysis;

    let absent = 0;
    var timeSlot;

    async function predictSample(sample) {
        const model = await tf.loadLayersModel(
            'https://myhttp.herokuapp.com/SPmodel2.json'
        );
        let result = model
            .predict(tf.tensor(sample, [1, sample.length]))
            .arraySync();
        var maxValue = 0;
        var predictedTime = 12;
        for (var i = 0; i < 12; i++) {
            if (result[0][i] > maxValue) {
                predictedTime = i;
                maxValue = result[0][i];
            }
        }
        return timeFromClassNum(predictedTime);
    }

    // Returns the string value for Baseball pitch labels
    function timeFromClassNum(classNum) {
        switch (classNum) {
            case 0:
                return "1";
            case 1:
                return "2";
            case 2:
                return "3";
            case 3:
                return "4";
            case 4:
                return "5";
            case 5:
                return "6";
            case 6:
                return "7";
            case 7:
                return "8";
            case 8:
                return "9";
            case 9:
                return "10";
            case 10:
                return "11";
            case 11:
                return "12";
            default:
                return "0";
        }
    }
    async function run() {
        const testSample = [parseInt(creativity), parseInt(memorization), parseInt(computation), parseInt(analysis)];
        timeSlot = await predictSample(testSample);

        let course = {
            courseName,
            credit,
            creativity,
            memorization,
            computation,
            analysis,
            absent,
            timeSlot
        };

        addToDB(db.collection('courses'), course);
        res.sendFile(path.join(__dirname + '/views/success.html'));
    }
    run();

});

app.post('/updateAbsent', (req, res) => {
    let absent = req.body.absent;
    let id = req.body.id;

    let updateObj = {
        absent
    };

    updateDB(db.collection('courses').doc(id), updateObj);
    //res.sendFile(path.join(__dirname + '/views/attendance.html'));

});

app.post('/deleteReminder', (req, res) => {
    let id = req.body.id;

    deleteDB(db.collection('reminders').doc(id));
    res.redirect(path.join(__dirname + 'reminder.html'));

});

app.get('/predict', (req, res) => {
    let Creativity = 5;
    let Memorization = 3;
    let Computation = 2;
    let Analysis = 1;

    async function predictSample(sample) {
        const model = await tf.loadLayersModel(
            'https://myhttp.herokuapp.com/SPmodel2.json'
        );
        let result = model
            .predict(tf.tensor(sample, [1, sample.length]))
            .arraySync();
        var maxValue = 0;
        var predictedTime = 12;
        for (var i = 0; i < 12; i++) {
            if (result[0][i] > maxValue) {
                predictedTime = i;
                maxValue = result[0][i];
            }
        }
        return timeFromClassNum(predictedTime);
    }

    // Returns the string value for Baseball pitch labels
    function timeFromClassNum(classNum) {
        switch (classNum) {
            case 0:
                return "1";
            case 1:
                return "2";
            case 2:
                return "3";
            case 3:
                return "4";
            case 4:
                return "5";
            case 5:
                return "6";
            case 6:
                return "7";
            case 7:
                return "8";
            case 8:
                return "9";
            case 9:
                return "10";
            case 10:
                return "11";
            case 11:
                return "12";
            default:
                return "0";
        }
    }
    async function run() {
        const testSample = [Creativity, Memorization, Computation, Analysis];
        console.log(await predictSample(testSample));
        res.send(await predictSample(testSample));
    }
    run();
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