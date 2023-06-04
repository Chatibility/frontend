const { log } = console;
const CHATBOT_ID = window.chatbaseConfig.chatbotId;
const chatbotContainer = document.getElementById("chatbot-container");

if (!chatbotContainer) {
    console.error("Please make sure to insert id attribute 'chatbot-container' in your HTML");
}

class SpeechToText {
  constructor() {
    this.recognition = null;
    this.isSpeechStarted = false;
  }

  init() {
    if ("webkitSpeechRecognition" in window) {
      this.recognition = new webkitSpeechRecognition();
    } else if ("SpeechRecognition" in window) {
      this.recognition = new SpeechRecognition();
    } else {
      console.error("Speech recognition is not supported in this browser");
      return;
    }

    this.recognition.lang = "en-US";
    this.recognition.continuous = true;
  }

  start() {
    if (this.recognition && !this.isSpeechStarted) {
      this.recognition.start();
      this.isSpeechStarted = true;
    }
  }

  stop() {
    if (this.recognition && this.isSpeechStarted) {
      this.recognition.stop();
      this.isSpeechStarted = false;
    }
  }

  kill() {
    if (this.recognition && this.isSpeechStarted) {
      this.recognition.abort();
      this.isSpeechStarted = false;
    }
  }

  attachResultListener(callback) {
    if (this.recognition) {
      this.recognition.addEventListener("result", function (event) {
        const result = event.results[event.results.length - 1][0].transcript;
        this.isSpeechStarted = true;
        callback(result);
      });
    }
  }

  attachEndListener(callback) {
    if (this.recognition) {
      this.recognition.addEventListener("speechend", () => {
        if (this.isSpeechStarted) {
          this.isSpeechStarted = false;
          callback();
        }
      });
    }
  }
}


class TextToSpeech {
  constructor(text) {
    this.text = text;
    this.speech = null;
  }

  play() {
    if ("speechSynthesis" in window) {
      this.speech = new SpeechSynthesisUtterance(this.text);
      window.speechSynthesis.speak(this.speech);
    } else {
      console.log("Speech synthesis is not supported in this browser.");
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

class Chatbot {
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.ws = new WebSocket(endpoint);
    this.allMessages = "";

    this.ws.onmessage = this.receiveMessage.bind(this);
  }

  receiveMessage(event) {
    const messages = document.querySelector("[data-chb-messages]");;
    const data = JSON.parse(event.data);

    if (data.sender === "bot") {
      switch (data.type) {
        case "start": {
          this.showStatus("Computing answer...");
          this.addBotMessage("Chatbot: ");
          break;
        }

        case "stream": {
          this.showStatus("Chatbot is typing...");
          const p = messages.lastChild.lastChild;
          p.innerHTML += data.message === "\n" ? "<br>" : data.message;
          this.allMessages += data.message;
          break;
        }

        case "info": {
          this.showStatus(data.message);
          break;
        }

        case "end": {
          this.showStatus("Ask a question");
          this.updateSendButton("Send", false);
          const textToSpeech = new TextToSpeech(this.allMessages);
          textToSpeech.play();
          this.allMessages = "";
          break;
        }

        case "error": {
          this.showStatus("Ask a question");
          this.updateSendButton("Send", false);
          const p = messages.lastChild.lastChild;
          p.innerHTML += data.message;
          break;
        }

        default:
          // Handle any other types of messages
          break;
        }
    } else {
      const div = document.createElement("div");
      div.className = "chb__message";
      div.setAttribute("data-chb-message", "client");
      const p = document.createElement("p");
      p.innerHTML = "<strong>You: </strong>" + data.message;
      div.appendChild(p);
      messages.appendChild(div);
    }

    // Scroll to the bottom of the chat
    messages.scrollTop = messages.scrollHeight;
  }

  sendMessage(event) {
    event.preventDefault();

    const messageInput = document.querySelector("[data-chb-prompt]");
    const message = messageInput.value;

    if (message === "") {
      return;
    }

    this.ws.send(message);
    messageInput.value = "";

    this.updateSendButton("Loading...", true);
  }

  showStatus(message) {
    const status = document.querySelector("[data-chb-status]");;
    status.innerHTML = message;
  }

  addBotMessage(message) {
    const messages = document.querySelector("[data-chb-messages]");
    const div = document.createElement("div");
    div.className = "chb__message";
    div.setAttribute("data-chb-message", "server");
    const p = document.createElement("p");
    p.innerHTML = "<strong>Chatbot: </strong>";
    div.appendChild(p);
    messages.appendChild(div);
  }

  updateSendButton(text, isDisabled) {
    const button = document.querySelector("[data-chb-send]");
    button.innerHTML = text;
    button.disabled = isDisabled;
  }
}

window.addEventListener("DOMContentLoaded", () => {
    if (!chatbotContainer) return false;
    chatbotContainer.innerHTML = `<div class="chb-wrapper">
        <header class="chb__header">
          <h2 class="chb__title"><span>Chat</span>ibility</h2>
          <p data-chb-status class="chb__status">Ask your question</p>
          <button data-chb-close class="chb__close">
            <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 384 512"><path d="M376.6 84.5c11.3-13.6 9.5-33.8-4.1-45.1s-33.8-9.5-45.1 4.1L192 206 56.6 43.5C45.3 29.9 25.1 28.1 11.5 39.4S-3.9 70.9 7.4 84.5L150.3 256 7.4 427.5c-11.3 13.6-9.5 33.8 4.1 45.1s33.8 9.5 45.1-4.1L192 306 327.4 468.5c11.3 13.6 31.5 15.4 45.1 4.1s15.4-31.5 4.1-45.1L233.7 256 376.6 84.5z"/></svg>
          </button>
        </header>

        <div data-chb-messages class="chb__messages"></div>

        <form data-chb-form class="chb__form" autocomplete="off">
          <div class="chb__input-wrapper">
            <input data-chb-prompt type="text" class="chb__input" name="prompt" placeholder="Write your question" />
            <button data-chb-voice="off" type="button" class="chb__voice">
                <svg data-chb-voice-icon xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 384 512"><path d="M96 96V256c0 53 43 96 96 96s96-43 96-96H208c-8.8 0-16-7.2-16-16s7.2-16 16-16h80V192H208c-8.8 0-16-7.2-16-16s7.2-16 16-16h80V128H208c-8.8 0-16-7.2-16-16s7.2-16 16-16h80c0-53-43-96-96-96S96 43 96 96zM320 240v16c0 70.7-57.3 128-128 128s-128-57.3-128-128V216c0-13.3-10.7-24-24-24s-24 10.7-24 24v40c0 89.1 66.2 162.7 152 174.4V464H120c-13.3 0-24 10.7-24 24s10.7 24 24 24h72 72c13.3 0 24-10.7 24-24s-10.7-24-24-24H216V430.4c85.8-11.7 152-85.3 152-174.4V216c0-13.3-10.7-24-24-24s-24 10.7-24 24v24z"/></svg>
            </button>
          </div>
          <button data-chb-send type="submit" class="chb__button">Send</button>
        </form>
    </div>`;
});

window.addEventListener("load", () => {
    if (!chatbotContainer) return false;
    const chatbot = new Chatbot(`ws://185.220.205.156:5050/chat/${CHATBOT_ID}`);
    const speechToText = new SpeechToText();
    speechToText.init();

    const voiceButton = document.querySelector("[data-chb-voice]");
    const sendButton = document.querySelector("[data-chb-send]");
    const inputElem = document.querySelector("[data-chb-prompt]");
    const formElem = document.querySelector("[data-chb-form]");
    const openButton = document.querySelector("[data-chb-open]");
    const closeButton = document.querySelector("[data-chb-close]");

    formElem.addEventListener("submit", handleFormSubmit);

    voiceButton.addEventListener("click", toggleSpeechToText);

    speechToText.attachResultListener(handleSpeechResult);

    speechToText.attachEndListener(handleSpeechEnd);

    openButton.addEventListener("click", () => {
      setChatbotVisibility(true);
    });

    closeButton.addEventListener("click", () => {
      setChatbotVisibility(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey && event.code === "Space") {
        setChatbotVisibility(true);
        inputElem.focus();
      } else if (!event.ctrlKey && event.code === "Escape") {
        setChatbotVisibility(false);
      }
    });

    function setChatbotVisibility(visible) {
      chatbotContainer.setAttribute("data-chb-visible", visible);
    }


    function stopSpeechToText() {
      if (speechToText.isSpeechStarted) {
        speechToText.kill();
        voiceButton.setAttribute("data-chb-voice", "off");
      }
    }

    function handleFormSubmit(event) {
      stopSpeechToText();
      chatbot.sendMessage(event);
      inputElem.value = "";
    }

    function toggleSpeechToText() {
      if (speechToText.isSpeechStarted) {
        stopSpeechToText();
      } else {
        speechToText.start();
        voiceButton.setAttribute("data-chb-voice", "speaking");
        inputElem.value = "";
      }
    }

    function handleSpeechResult(result) {
      stopSpeechToText();
      inputElem.value = result;
    }

    function handleSpeechEnd() {
      stopSpeechToText();
      voiceButton.setAttribute("data-chb-voice", "finished");
    }
});