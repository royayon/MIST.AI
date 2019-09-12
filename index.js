const APIAI_TOKEN = "ca6ad02d83b24d6d81b920bba3180f4e" || process.env.DIALOGFLOW_CLIENT_ACCESS_TOKEN;
// const APIAI_SESSION_ID = process.env.APIAI_SESSION_ID;

const express = require('express');
const app = express();
const apiai = require('apiai')(APIAI_TOKEN);

app.use(express.static(__dirname + '/views')); // html
app.use(express.static(__dirname + '/public')); // js, css, images


const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
    console.log('Server started on port ' + port);
})


const io = require('socket.io')(server);
io.on('connection', function (socket) {
    console.log('a user connected!');
});



app.get('/', (req, res) => {
    res.sendFile('index.html');
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