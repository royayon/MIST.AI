const socket = io();

const outputYou = document.querySelector('.output-you');
const outputBot = document.querySelector('.output-bot');
const btn = document.querySelector('button');
const sendBtn = document.querySelector('.input-group .fa');
const sendText = document.querySelector('.form-control');

const magic_word = "jupyter";


// VoiceIn App Routing
const vRouter = [
    ['motivation', 'motivation'],
    ['dashboard', 'dashboard'],
    ['attendance', 'attendance'],
    ['reminder', 'reminder'],
    ['weather', 'weather'],
    ['study planner', 'studyplanner'],
    ['about', 'about'],
    ['about', 'about'],
    ['about', 'about'],
];

// Speech Recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.lang = 'en-US';
recognition.interimResults = false;
recognition.maxAlternatives = 1;


btn.addEventListener('click', () => {
    if (!detectMob()) {
        annyang.abort();
    }
    responsiveVoice.speak("yes?", "UK English Female");
    recognition.start();
    // Button Style Change to RED
    btn.style.background = 'linear-gradient(180deg, #c62828 0%, #d32f2f 80%, #f44336 100%)';
});

recognition.addEventListener('speechstart', () => {
    console.log('Speech has been detected.');
});

recognition.addEventListener('result', (e) => {
    console.log('Result has been detected.');

    let last = e.results.length - 1;
    let text = e.results[last][0].transcript;

    outputYou.textContent = text;
    console.log('Confidence: ' + e.results[0][0].confidence);

    inAppNLP(text);
    if (!detectMob()) {
        annyang.resume();
    }
    //annyang.start();

    //socket.emit('chat message', text);
});

recognition.addEventListener('speechend', () => {
    recognition.stop();
    // Button Style Change to GREENISHs
    btn.style.background = 'linear-gradient(180deg, #39C2C9 0%, #3FC8C9 80%, #3FC8C9 100%)';

    if (!detectMob()) {
        annyang.resume();
    }

});

recognition.addEventListener('error', (e) => {
    recognition.stop();
    // Button Style Change to GREENISHs
    btn.style.background = 'linear-gradient(180deg, #39C2C9 0%, #3FC8C9 80%, #3FC8C9 100%)';

    outputBot.textContent = 'Error: ' + e.error;
    if (!detectMob()) {
        annyang.resume();
    }
});

//In app NLP
function inAppNLP(text) {
    let url;
    const link = window.location.href;

    if (link.includes('mist-ai.herokuapp.com/')) {
        url = 'https://mist-ai.herokuapp.com/';
    } else {
        url = 'http://localhost:5000/';
    }
    for (i = 0; i < vRouter.length; i++) {
        if (text.toLowerCase().includes(vRouter[i][0]) && (text.toLowerCase().includes('take me to') || text.toLowerCase().includes('go to'))) {
            talkback('Taking you to ' + vRouter[i][1]);
            var timer = setInterval(function () {
                window.location.href = url + vRouter[i][1];
                clearInterval(timer);
            }, 2000);
            // window.location.href = url2 + vRouter[i][1];
            return;
            break;
        }
    }
    socket.emit('chat message', text);
}

//Send Button Clicked
sendBtn.addEventListener('click', () => {
    sendInText();
});

sendText.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        // code for enter key pressed
        sendInText();
    }
});

function sendInText() {
    let text = sendText.value;
    if (text != "") {
        outputYou.textContent = text;
        inAppNLP(text.toString());
        //socket.emit('chat message', text);
        sendText.value = "";
    }
}



// Speech Synthesis
var timeDelay = 500;

function synthVoiceFirst(text) {
    var flag = 0;

    const awaitVoices = new Promise(resolve =>
            window.speechSynthesis.onvoiceschanged = resolve)
        .then(() => {
            const synth = window.speechSynthesis;
            const utterance = new SpeechSynthesisUtterance();

            var voices = synth.getVoices();


            utterance.voice = voices[4];
            utterance.volume = 1;
            utterance.rate = 1;
            utterance.pitch = 1;
            utterance.text = text;

            synth.speak('.');
            flag = 1;
            timeDelay = 0;
        });

    var timer = setInterval(function () {
        if (flag == 0) {
            synthVoice(text);
            clearInterval(timer);
        }
    }, timeDelay);



}

function synthVoice(text) {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance();
    const voices = synth.getVoices();
    utterance.volume = 1;
    utterance.default = false;
    utterance.voice = voices.filter(function (voice) {
        return voice.name == "Google UK English Female"

    })[0];
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.text = text;
    synth.speak(utterance);
}

socket.on('bot reply', function (replyText) {
    talkback(replyText);
    // synthVoiceFirst(replyText);

    // if (replyText == '') replyText = 'Something went wrong!';
    // outputBot.textContent = replyText;
});

function talkback(replyText) {
    // synthVoiceFirst(replyText);
    responsiveVoice.speak(replyText, "UK English Female");

    if (replyText == '') replyText = 'Something went wrong!';
    outputBot.textContent = replyText;
}