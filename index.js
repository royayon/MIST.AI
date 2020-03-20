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



// CRON Task Schedule
//const cron = require("node-cron");


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

app.get('/motivation', (req, res) => {
    res.sendFile(path.join(__dirname + '/views/motivation.html'));
});

app.get('/studyPlanner', (req, res) => {
    res.sendFile(path.join(__dirname + '/views/studyPlanner.html'));
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

app.get('/getStudyPlans', (req, res) => {
    //Get JSON
    let obj = getFromDB(db.collection('studyplanner')).then(o => {
        //console.log(o);
        res.send(o);
    });
});



app.get('/setStudyPlanner', (req, res) => {
    function sortByProperty(property) {
        return function (a, b) {
            if (a[property] > b[property])
                return 1;
            else if (a[property] < b[property])
                return -1;

            return 0;
        }
    }

    // Study Planner Function
    function dayDistributor(CoursesLen) {
        let day = []
        let di = 1;
        for (let i = 0; i < CoursesLen; i++) {
            day[i] = di;
            if (di === 6) {
                di = 1;
            } else {
                di += 1;
            }
        }
        return day;
    }

    // TimeSlot decoder
    function timeSlotDecoder(timeSlot) {
        timeSlot = parseInt(timeSlot);
        if (timeSlot === 1) {
            return '12:00 PM';
        } else if (timeSlot === 2) {
            return '02:00 PM';
        } else if (timeSlot === 3) {
            return '04:00 PM';
        } else if (timeSlot === 4) {
            return '06:00 PM';
        } else if (timeSlot === 5) {
            return '08:00 PM';
        } else if (timeSlot === 6) {
            return '10:00 PM';
        } else if (timeSlot === 7) {
            return '12:00 AM';
        } else if (timeSlot === 8) {
            return '02:00 AM';
        } else if (timeSlot === 9) {
            return '04:00 AM';
        } else if (timeSlot === 10) {
            return '06:00 AM';
        } else if (timeSlot === 11) {
            return '08:00 AM';
        } else if (timeSlot === 12) {
            return '10:00 AM';
        }
    }

    let courses;

    var studyPlannedWeek = [];
    getFromDB(db.collection('courses')).then(o => {
        courses = o;
        courses = Object.keys(courses).map(function (key) {
            return courses[key];
        }).sort(sortByProperty("timeSlot"));

        var day = dayDistributor(courses.length);

        let dayTimeTracker = [
            [],
            [],
            [],
            [],
            [],
            [],
            []
        ];

        for (let i = 0; i < courses.length; i++) {
            var today = new Date();
            //date.setDate(date.getDate() + day[i]);
            var dd = today.getDate() + day[i] + 1; // +1 because Heroku in in america
            var mm = today.getMonth() + 1;
            var yyyy = today.getFullYear();


            let timeSlot;

            if (!dayTimeTracker[day[i]].includes(courses[i].timeSlot)) {
                timeSlot = courses[i].timeSlot;
            } else {
                let minDistFrmOriginal = 20;
                for (let dayT = 3; dayT <= 7; dayT++) {
                    dayT = dayT.toString();
                    if (!dayTimeTracker[day[i]].includes(dayT)) {
                        if (minDistFrmOriginal > Math.abs(parseInt(dayT) - parseInt(courses[i].timeSlot))) {
                            minDistFrmOriginal = Math.abs(parseInt(dayT) - parseInt(courses[i].timeSlot));
                            timeSlot = dayT;
                        }
                    }
                }
            }

            let date = mm + '/' + dd + '/' + yyyy + ' ' + timeSlotDecoder(timeSlot);

            dayTimeTracker[day[i]].push(timeSlot);



            //console.log(date);

            let study = {
                title: 'Study ' + courses[i].courseName,
                desc: 'Study ' + courses[i].courseName + ' for 2 hrs from ' + timeSlotDecoder(timeSlot) + ' to ' + timeSlotDecoder(parseInt(timeSlot) + 1),
                type: 'SP',
                time: date
            };

            addToDB(db.collection('studyplanner'), study);

            studyPlannedWeek.push(study);

        }
        res.send(JSON.stringify(studyPlannedWeek));
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
        time,
        type: "Rem"
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


app.post('/webhook', (req, res) => {
    if (req.body.queryResult.intent.displayName === "SetReminder") {
        let dateD = req.body.queryResult.parameters.datetime_date;
        let timeD = req.body.queryResult.parameters.datetime_time;

        let td = new Date(dateD);
        let tt = timeD;
        var td_year = td.getFullYear();
        var td_month = td.getMonth() + 1;
        var td_day = td.getDate();

        let outputDate = `${td_month}/${td_day}/${td_year} ${tConvert(tt.substring(0,5))}`;


        let title = req.body.queryResult.parameters.remindertitle;

        let desc = "must";
        let time = outputDate;
        let type = "Rem";

        let reminder = {
            title,
            desc,
            time: outputDate,
            type
        };

        addToDB(db.collection('reminders'), reminder);



        let textResponse = `Setting up your reminder for ${title} for ${td_day}/${td_month}/${td_year} at ${tConvert(tt)}`;

        res.send(createTextResponse(textResponse));

    } else if (req.body.queryResult.intent.displayName === "GetCoursesName") {
        let textResponse = "Your current enrolled Courses are:\n";
        let courses;
        let obj = getFromDB(db.collection('courses')).then(o => {
            //console.log(o);
            // res.send(o);
            courses = o;
        });
        for (let i = 0; i < courses.length; i++) {
            textResponse += courses[i].courseName + "\n";
        }

        res.send(createTextResponse(textResponse));


    } else {
        let textResponse = `Sorry!`;

        res.send(createTextResponse(textResponse));
    }

    function createTextResponse(textResponse) {
        let response = {
            "fulfillmentText": textResponse,
            "fulfillmentMessages": [{
                "text": {
                    "text": [
                        textResponse
                    ]
                }
            }],
            "source": "example.com",
            "payload": {
                "google": {
                    "expectUserResponse": true,
                    "richResponse": {
                        "items": [{
                            "simpleResponse": {
                                "textToSpeech": "this is a simple response"
                            }
                        }]
                    }
                },
                "facebook": {
                    "text": "Hello, Facebook!"
                },
                "slack": {
                    "text": "This is a text response for Slack."
                }
            }
        }
        return response;
    }

    function tConvert(time) {
        // Check correct time format and split into components
        time = time.toString().match(/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];

        if (time.length > 1) { // If time format correct
            time = time.slice(1); // Remove full string match value
            time[5] = +time[0] < 12 ? ' AM' : ' PM'; // Set AM/PM
            time[0] = +time[0] % 12 || 12; // Adjust hours
        }
        return time.join(''); // return adjusted time or original string
    }

    function formatAMPM(date) {
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        if (isNaN(minutes)) {
            minutes = 0;
        }
        minutes = minutes < 10 ? '0' + minutes : minutes;
        var strTime = hours + ':' + minutes + ' ' + ampm;
        return strTime;
    }
});



// Cron Schedule
// schedule tasks to be run on the server   
// cron.schedule("25 1 * * *", function () {
//     //console.log("running a task");
//     function sortByProperty(property) {
//         return function (a, b) {
//             if (a[property] > b[property])
//                 return 1;
//             else if (a[property] < b[property])
//                 return -1;

//             return 0;
//         }
//     }

//     // Study Planner Function
//     function dayDistributor(CoursesLen) {
//         let day = []
//         let di = 1;
//         for (let i = 0; i < CoursesLen; i++) {
//             day[i] = di;
//             if (di === 6) {
//                 di = 1;
//             } else {
//                 di += 1;
//             }
//         }
//         return day;
//     }

//     // TimeSlot decoder
//     function timeSlotDecoder(timeSlot) {
//         timeSlot = parseInt(timeSlot);
//         if (timeSlot === 1) {
//             return '12:00 PM';
//         } else if (timeSlot === 2) {
//             return '02:00 PM';
//         } else if (timeSlot === 3) {
//             return '04:00 PM';
//         } else if (timeSlot === 4) {
//             return '06:00 PM';
//         } else if (timeSlot === 5) {
//             return '08:00 PM';
//         } else if (timeSlot === 6) {
//             return '10:00 PM';
//         } else if (timeSlot === 7) {
//             return '12:00 AM';
//         } else if (timeSlot === 8) {
//             return '02:00 AM';
//         } else if (timeSlot === 9) {
//             return '04:00 AM';
//         } else if (timeSlot === 10) {
//             return '06:00 AM';
//         } else if (timeSlot === 11) {
//             return '08:00 AM';
//         } else if (timeSlot === 12) {
//             return '10:00 AM';
//         }
//     }
//     let courses;

//     //var studyPlannedWeek = [];
//     getFromDB(db.collection('courses')).then(o => {
//         courses = o;
//         courses = Object.keys(courses).map(function (key) {
//             return courses[key];
//         }).sort(sortByProperty("timeSlot"));

//         var day = dayDistributor(courses.length);



//         for (let i = 0; i < day.length; i++) {
//             var today = new Date();
//             //date.setDate(date.getDate() + day[i]);
//             var dd = today.getDate() + day[i];
//             var mm = today.getMonth() + 1;
//             var yyyy = today.getFullYear();

//             let date = mm + '/' + dd + '/' + yyyy + ' ' + timeSlotDecoder(courses[i].timeSlot);

//             //console.log(date);

//             let study = {
//                 title: 'Study ' + courses[i].courseName,
//                 desc: 'Study ' + courses[i].courseName + ' for 2 hrs from ' + timeSlotDecoder(courses[i].timeSlot) + ' to ' + timeSlotDecoder(parseInt(courses[i].timeSlot) + 1),
//                 type: 'SP',
//                 time: date
//             };

//             addToDB(db.collection('studyplanner'), study);

//             //studyPlannedWeek.push(study);

//         }
//         //res.send(JSON.stringify(studyPlannedWeek));
//     });

// });

// // Dialogflow Webhook
// app.post('/webhook', (req, res) => {

//     const link = req.body.parameters.Link;
//     // return res.json({
//     //     speech: 'done',
//     //     fulfillmentText: 'done',
//     //     source: 'MIST.AI'
//     // });
// });