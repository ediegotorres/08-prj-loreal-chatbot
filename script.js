const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");
const connectionStatus = document.getElementById("connectionStatus");

const WORKER_URL =
  window.CHATBOT_WORKER_URL ||
  "https://sparkling-silence-ef3e.diego15306.workers.dev";

const SYSTEM_PROMPT = `
You are the L'Oréal Beauty Advisor, a polished and safety-conscious assistant.
Only answer questions that are clearly about L'Oréal products, beauty routines, beauty concerns,
ingredient usage in beauty routines, or how to build routines involving L'Oréal categories and brands.
If a request is unrelated to beauty or unrelated to L'Oréal products/routines, politely refuse and redirect
the user to ask about skincare, haircare, makeup, fragrance, scalp care, routines, usage order, or product types.
Never claim personal medical authority. For serious skin reactions or medical concerns, advise consulting a professional.
Keep answers practical, concise, and premium in tone. When helpful, suggest a simple morning or evening routine order.
`;

const ALLOWED_TOPICS = [
  "l'oreal",
  "loreal",
  "paris",
  "maybelline",
  "garnier",
  "cerave",
  "la roche-posay",
  "vichy",
  "skinceuticals",
  "essie",
  "kiehl",
  "skincare",
  "haircare",
  "makeup",
  "fragrance",
  "beauty",
  "routine",
  "serum",
  "cleanser",
  "moisturizer",
  "shampoo",
  "conditioner",
  "sunscreen",
  "mascara",
  "foundation",
  "lipstick",
  "acne",
  "dry skin",
  "oily skin",
  "sensitive skin",
  "frizz",
  "scalp",
  "hair",
  "skin",
];

const conversationHistory = [];

function isConfigured() {
  return WORKER_URL && !WORKER_URL.includes("your-cloudflare-worker-subdomain");
}

function isRelevantBeautyQuestion(text) {
  const normalized = text.toLowerCase();
  return ALLOWED_TOPICS.some((topic) => normalized.includes(topic));
}

function setStatus(message, configured = false) {
  connectionStatus.textContent = message;
  connectionStatus.style.borderColor = configured
    ? "rgba(46, 125, 50, 0.22)"
    : "rgba(17, 17, 17, 0.08)";
  connectionStatus.style.background = configured ? "#f4fbf4" : "#faf7f0";
}

function scrollToBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function addEmptyState() {
  chatWindow.innerHTML = `
    <div class="empty-state">
      <h2>Your L'Oréal beauty desk is open.</h2>
      <p>Try: "Build me a simple morning routine for dry skin" or "What kind of L'Oréal haircare helps with frizz?"</p>
    </div>
  `;
}

function appendUserMessage(text) {
  const message = document.createElement("article");
  message.className = "msg user";
  message.innerHTML = `
    <span class="msg-label">You</span>
    <div class="msg-body"></div>
  `;
  message.querySelector(".msg-body").textContent = text;
  chatWindow.appendChild(message);
  scrollToBottom();
}

function appendAssistantMessage(question, answer, extraClass = "") {
  const message = document.createElement("article");
  message.className = `msg ai ${extraClass}`.trim();
  message.innerHTML = `
    <span class="msg-label">L'Oréal Beauty Advisor</span>
    <div class="msg-question"><strong>Question:</strong> ${escapeHtml(question)}</div>
    <div class="msg-body"></div>
  `;
  message.querySelector(".msg-body").textContent = answer;
  chatWindow.appendChild(message);
  scrollToBottom();
  return message;
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function fetchAssistantReply() {
  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...conversationHistory],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "The Cloudflare Worker could not complete the request.");
  }

  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("The assistant returned an empty response.");
  }

  return content;
}

if (isConfigured()) {
  setStatus("Cloudflare Worker detected. Requests stay server-side and the API key remains hidden.", true);
} else {
  setStatus("Set window.CHATBOT_WORKER_URL to your deployed Cloudflare Worker URL to enable live OpenAI responses.");
}

addEmptyState();

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const prompt = userInput.value.trim();

  if (!prompt) {
    return;
  }

  if (chatWindow.querySelector(".empty-state")) {
    chatWindow.innerHTML = "";
  }

  appendUserMessage(prompt);
  userInput.value = "";

  if (!isRelevantBeautyQuestion(prompt)) {
    appendAssistantMessage(
      prompt,
      "I can help with L'Oréal beauty topics only. Ask me about skincare, haircare, makeup, fragrance, routines, ingredients, or product categories from the L'Oréal family."
    );
    return;
  }

  if (!isConfigured()) {
    appendAssistantMessage(
      prompt,
      "This chat UI is ready, but it needs a deployed Cloudflare Worker URL before it can contact OpenAI. Add your Worker URL to window.CHATBOT_WORKER_URL in the browser console or wire it into this page before deployment.",
      "error"
    );
    return;
  }

  conversationHistory.push({ role: "user", content: prompt });

  sendBtn.disabled = true;
  sendBtn.textContent = "Sending...";

  const thinkingMessage = appendAssistantMessage(prompt, "Thinking through your beauty question...", "thinking");

  try {
    const answer = await fetchAssistantReply();
    thinkingMessage.remove();
    appendAssistantMessage(prompt, answer);
    conversationHistory.push({ role: "assistant", content: answer });
  } catch (error) {
    thinkingMessage.remove();
    appendAssistantMessage(
      prompt,
      error.message || "Something went wrong while contacting the assistant.",
      "error"
    );
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "Send";
    userInput.focus();
  }
});
