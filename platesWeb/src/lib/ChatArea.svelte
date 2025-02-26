<script lang="ts">
  import { onMount } from "svelte";

  let messages = [];
  let newMessage = "";

  function sendMessage() {
    if (newMessage.trim()) {
      messages = [...messages, { text: newMessage, sender: "You" }];
      newMessage = "";
      // Scroll to the bottom after sending a message
      setTimeout(() => {
        const chatContainer = document.querySelector(".chat-messages");
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 0);
    }
  }
</script>

<div class="chat-area">
  <div class="chat-messages">
    {#each messages as message}
      <div class="message">
        <strong>{message.sender}:</strong>
        {message.text}
      </div>
    {/each}
  </div>
  <input
    type="text"
    bind:value={newMessage}
    on:keydown={(e) => (e.key === "Enter" ? sendMessage() : null)}
    placeholder="Type your message here..."
    class="chat-input"
  />
</div>

<style>
  .chat-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: inherit;
    width: 80%;
    justify-self: center;
    padding: 10px;
    max-width: 800px;
    box-sizing: border-box; /* Include padding and border in width calculation */
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 10px;
    padding: 5px;
    border: 1px solid #ccc;
    border-radius: 5px;
    background-color: #f9f9f9; /* Light background for messages */
  }

  .message {
    margin: 5px 0;
    padding: 5px;
    border-radius: 3px;
    background-color: #e6f7ff; /* Light blue for message bubbles */
  }

  .chat-input {
    padding: 10px;
    border-radius: 5px;
    border: 1px solid #ccc;
    width: 100%;
    box-sizing: border-box; /* Ensure padding and border are included in width */
  }
</style>
