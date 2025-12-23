<script>
  import { onMount } from "svelte";

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  let messages = [];
  let inputMessage = "";
  let sessionId = null;
  let isLoading = false;
  let isTyping = false;
  let errorMessage = "";
  let messagesContainer;

  onMount(() => {
    const savedSessionId = localStorage.getItem("chatSessionId");
    if (savedSessionId) {
      sessionId = savedSessionId;
      loadHistory();
    }
  });

  async function loadHistory() {
    try {
      const response = await fetch(`${API_URL}/chat/history/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        messages = data.messages;
        scrollToBottom();
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  }

  async function sendMessage() {
    const trimmedMessage = inputMessage.trim();

    if (!trimmedMessage) {
      errorMessage = "Please enter a message";
      return;
    }

    if (trimmedMessage.length > 5000) {
      errorMessage = "Message is too long (max 5000 characters)";
      return;
    }

    errorMessage = "";
    isLoading = true;

    const userMessage = {
      sender: "user",
      text: trimmedMessage,
      created_at: new Date().toISOString(),
    };

    messages = [...messages, userMessage];
    inputMessage = "";
    scrollToBottom();

    isTyping = true;

    try {
      const requestBody = { message: trimmedMessage };
      if (sessionId) {
        requestBody.sessionId = sessionId;
      }

      const response = await fetch(`${API_URL}/chat/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      if (!sessionId) {
        sessionId = data.sessionId;
        localStorage.setItem("chatSessionId", sessionId);
      }

      const aiMessage = {
        sender: "ai",
        text: data.reply,
        created_at: new Date().toISOString(),
      };

      messages = [...messages, aiMessage];
      scrollToBottom();
    } catch (error) {
      errorMessage =
        error.message || "Failed to send message. Please try again.";
      console.error("Error sending message:", error);
    } finally {
      isLoading = false;
      isTyping = false;
    }
  }

  function handleKeyPress(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function startNewChat() {
    messages = [];
    sessionId = null;
    localStorage.removeItem("chatSessionId");
    errorMessage = "";
  }
</script>

<div class="chat-widget">
  <div class="chat-header">
    <div class="header-content">
      <h2>Support Agent</h2>
      <span class="status-indicator">Online</span>
    </div>
    <button class="new-chat-btn" on:click={startNewChat}>New Chat</button>
  </div>

  <div class="messages-container" bind:this={messagesContainer}>
    {#if messages.length === 0}
      <div class="welcome-message">
        <p>👋 Hello! I'm your AI support agent.</p>
        <p>Ask me about:</p>
        <ul>
          <li>Shipping policies</li>
          <li>Returns and refunds</li>
          <li>Support hours</li>
          <li>Contact information</li>
        </ul>
      </div>
    {/if}

    {#each messages as message}
      <div class="message {message.sender}">
        <div class="message-content">
          <div class="message-text">{message.text}</div>
          <div class="message-time">{formatTime(message.created_at)}</div>
        </div>
      </div>
    {/each}

    {#if isTyping}
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    {/if}
  </div>

  {#if errorMessage}
    <div class="error-message">
      {errorMessage}
    </div>
  {/if}

  <div class="input-container">
    <textarea
      bind:value={inputMessage}
      on:keypress={handleKeyPress}
      placeholder="Type your message..."
      disabled={isLoading}
      rows="1"
    ></textarea>
    <button
      on:click={sendMessage}
      disabled={isLoading || !inputMessage.trim()}
      class="send-btn"
    >
      {isLoading ? "..." : "Send"}
    </button>
  </div>
</div>

<style>
  .chat-widget {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    height: 600px;
    overflow: hidden;
  }

  .chat-header {
    background: #4a5568;
    color: white;
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-content {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .chat-header h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #a0aec0;
  }

  .status-indicator::before {
    content: "";
    width: 8px;
    height: 8px;
    background: #48bb78;
    border-radius: 50%;
  }

  .new-chat-btn {
    background: #2d3748;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s;
  }

  .new-chat-btn:hover {
    background: #1a202c;
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .welcome-message {
    text-align: center;
    color: #4a5568;
    padding: 40px 20px;
  }

  .welcome-message p {
    margin: 12px 0;
    font-size: 16px;
  }

  .welcome-message ul {
    list-style: none;
    padding: 0;
    margin: 16px 0;
  }

  .welcome-message li {
    padding: 8px 0;
    color: #718096;
  }

  .message {
    display: flex;
    margin-bottom: 8px;
  }

  .message.user {
    justify-content: flex-end;
  }

  .message.ai {
    justify-content: flex-start;
  }

  .message-content {
    max-width: 70%;
    display: flex;
    flex-direction: column;
  }

  .message-text {
    padding: 12px 16px;
    border-radius: 12px;
    word-wrap: break-word;
    line-height: 1.5;
  }

  .message.user .message-text {
    background: #4299e1;
    color: white;
    border-bottom-right-radius: 4px;
  }

  .message.ai .message-text {
    background: #edf2f7;
    color: #2d3748;
    border-bottom-left-radius: 4px;
  }

  .message-time {
    font-size: 11px;
    color: #a0aec0;
    margin-top: 4px;
    padding: 0 4px;
  }

  .message.user .message-time {
    text-align: right;
  }

  .typing-indicator {
    display: flex;
    gap: 4px;
    padding: 12px 16px;
    background: #edf2f7;
    border-radius: 12px;
    width: fit-content;
    border-bottom-left-radius: 4px;
  }

  .typing-indicator span {
    width: 8px;
    height: 8px;
    background: #a0aec0;
    border-radius: 50%;
    animation: typing 1.4s infinite;
  }

  .typing-indicator span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .typing-indicator span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes typing {
    0%,
    60%,
    100% {
      transform: translateY(0);
    }
    30% {
      transform: translateY(-10px);
    }
  }

  .error-message {
    background: #fed7d7;
    color: #c53030;
    padding: 12px 20px;
    font-size: 14px;
    border-top: 1px solid #fc8181;
  }

  .input-container {
    display: flex;
    gap: 12px;
    padding: 16px 20px;
    border-top: 1px solid #e2e8f0;
    background: #f7fafc;
  }

  textarea {
    flex: 1;
    padding: 12px;
    border: 1px solid #cbd5e0;
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    resize: none;
    min-height: 44px;
    max-height: 120px;
  }

  textarea:focus {
    outline: none;
    border-color: #4299e1;
  }

  textarea:disabled {
    background: #edf2f7;
    cursor: not-allowed;
  }

  .send-btn {
    padding: 12px 24px;
    background: #4299e1;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
    min-width: 80px;
  }

  .send-btn:hover:not(:disabled) {
    background: #3182ce;
  }

  .send-btn:disabled {
    background: #a0aec0;
    cursor: not-allowed;
  }
</style>
