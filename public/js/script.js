const socket = io();

const outputYou = document.querySelector('.output-you');
const outputBot = document.querySelector('.output-bot');
const btn = document.querySelector('button');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.lang = 'en-US';
recognition.interimResults = false;
recognition.maxAlternatives = 1;

btn.addEventListener('click', () => {
    recognition.start();
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

    socket.emit('chat message', text);
});

recognition.addEventListener('speechend', () => {
    recognition.stop();
});

recognition.addEventListener('error', (e) => {
    outputBot.textContent = 'Error: ' + e.error;
});



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

            synth.speak(utterance);
            flag = 1;
        });

    var timer = setInterval(function () {
        if (flag == 0) {
            synthVoice(text);
            clearInterval(timer);
        }
    }, 100);



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
    synthVoiceFirst(replyText);

    if (replyText == '') replyText = '(No answer...)';
    outputBot.textContent = replyText;
});