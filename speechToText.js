class SpeechRecognitionHandler {
  constructor() {
    this.recognition = null;
  }

  init() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new webkitSpeechRecognition();
    } else if ('SpeechRecognition' in window) {
      this.recognition = new SpeechRecognition();
    } else {
      console.error('Speech recognition not available');
      return;
    }

    this.recognition.lang = 'en-US';
    this.recognition.continuous = true;
  }

  start() {
    if (this.recognition) {
      this.recognition.start();
    }
  }

  stop() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  attachResultListener(callback) {
    if (this.recognition) {
      this.recognition.addEventListener('result', function(event) {
        const result = event.results[event.results.length - 1][0].transcript;
        callback(result);
      });
    }
  }

  attachEndListener(callback) {
    if (this.recognition) {
      this.recognition.addEventListener('end', callback);
    }
  }
}

// Example usage:
const recognitionHandler = new SpeechRecognitionHandler();
recognitionHandler.init();

const startButton = document.getElementById('start-btn');
const sendButton = document.getElementById('send-btn');
const inputElem = document.getElementById('prompt');

startButton.addEventListener('click', function() {
  recognitionHandler.start();
});

sendButton.addEventListener('click', function() {
  recognitionHandler.stop();
});

recognitionHandler.attachResultListener(function(result) {
  inputElem.value = result;
  console.log(result);
  // Send the recognized text to the backend server for processing
  // Implement your HTTP request here
});

recognitionHandler.attachEndListener(function() {
  inputElem.value = "";
  // Optionally clear or update the UI when recognition ends
});
