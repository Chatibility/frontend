const { log } = console;

class TextToSpeech {
  constructor(text) {
    this.text = text;
    this.speech = null;
  }

  play() {
    if ('speechSynthesis' in window) {
      this.speech = new SpeechSynthesisUtterance(this.text);
      window.speechSynthesis.speak(this.speech);
    } else {
      console.log('Text-to-speech is not supported in this browser.');
    }
  }

  pause() {
    if (this.speech && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  }

  stop() {
    if (this.speech) {
      window.speechSynthesis.cancel();
    }
  }
}

var endpoint = "ws://185.220.205.156:9000/chat";
var ws = new WebSocket(endpoint);
var allMessages = "";
// Receive message from server word by word. Display the words as they are received.
ws.onmessage = function (event) {
    var messages = document.getElementById('messages');
    var data = JSON.parse(event.data);
    if (data.sender === "bot") {
        if (data.type === "start") {
            var status = document.getElementById('status');
            status.innerHTML = "Computing answer...";
            var div = document.createElement('div');
            div.className = 'message';
            div.dataset.message = "server";
            var p = document.createElement('p');
            p.innerHTML = "<strong>" + "Chatbot: " + "</strong>";
            div.appendChild(p);
            messages.appendChild(div);
            log("start");
        } else if (data.type === "stream") {
            var status = document.getElementById('status');
            status.innerHTML = "Chatbot is typing...";
            var p = messages.lastChild.lastChild;
            if (data.message === "\n") {
                p.innerHTML += "<br>";
            } else {
                p.innerHTML += data.message;
            }
            allMessages += data.message;
            log("stream")
        } else if (data.type === "info") {
            var status = document.getElementById('status');
            status.innerHTML = data.message;
            log("info")
        } else if (data.type === "end") {
            var status = document.getElementById('status');
            status.innerHTML = "Ask a question";
            var button = document.getElementById('send-btn');
            button.innerHTML = "Send";
            button.disabled = false;
            const textToSpeech = new TextToSpeech(allMessages);
            textToSpeech.play();
            allMessages = "";
            log("end");
        } else if (data.type === "error") {
            var status = document.getElementById('status');
            status.innerHTML = "Ask a question";
            var button = document.getElementById('send-btn');
            button.innerHTML = "Send";
            button.disabled = false;
            var p = messages.lastChild.lastChild;
            p.innerHTML += data.message;
            // textToSpeech.stop();
            log("error");
        }
    } else {
        var div = document.createElement('div');
        div.className = 'message';
        div.dataset.message = "client";
        var p = document.createElement('p');
        p.innerHTML = "<strong>" + "You: " + "</strong>";
        p.innerHTML += data.message;
        div.appendChild(p);
        messages.appendChild(div);
    }
    // Scroll to the bottom of the chat
    messages.scrollTop = messages.scrollHeight;
}
// Send message to server
function sendMessage(event) {
    event.preventDefault();
    console.log("event");
    var message = document.getElementById('prompt').value;
    if (message === "") {
        return;
    }
    ws.send(message);
    document.getElementById('prompt').value = "";

    // Turn the button into a loading button
    var button = document.getElementById('send-btn');
    button.innerHTML = "Loading...";
    button.disabled = true;
}