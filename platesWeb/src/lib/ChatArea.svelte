<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";

  let newMessage = "";
  export let messages: { text: string; sender: string }[] = [];
  export let user_id: string;
  const dispatch = createEventDispatcher();
  let chatMessages: HTMLDivElement | null = null;

  async function sendMessage() {
    if (newMessage.trim()) {
      const userMessage = newMessage;
      messages = [...messages, { text: userMessage, sender: "You" }];
      newMessage = "";
      scrollToBottom();

      try {
        const response = await fetch("http://127.0.0.1:8000/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id, message: userMessage }),
        });

        if (!response.ok) throw new Error(`API error: ${response.statusText}`);

        const data = await response.json();

        if (data.intent === "search_recipe" || data.intent === "search_with_inventory") {
          dispatch("addNote", data.recipe);
        }
        if (data.intent === "save_inventory") {
          dispatch("fetchInventory");
        }

        messages = [...messages, { text: data.ai_response, sender: "AI" }];
        scrollToBottom();
      } catch (error) {
        console.error("Error sending message:", error);
        messages = [...messages, { text: "Error: Unable to get a response.", sender: "System" }];
        scrollToBottom();
      }
    }
  }

  function clearMessages() {
    messages = [];
  }

  function scrollToBottom() {
    setTimeout(() => {
      if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }, 0);
  }

  onMount(() => {
    scrollToBottom();
  });
</script>

<div class="chat-area">
  <div class="chat-messages" id="chat-container" bind:this={chatMessages}>
    {#each messages as message}
      <div class="message {message.sender === 'You' ? 'user' : 'ai'}">
        {message.text}
      </div>
    {/each}
  </div>

  <div class="input-container">
    <input
      type="text"
      bind:value={newMessage}
      on:keydown={(e) => e.key === "Enter" ? sendMessage() : null}
      placeholder="Type your message..."
      class="chat-input"
    />
    <button on:click={sendMessage} class="send-btn">
      <span>▶️</span>
    </button>
    <button on:click={clearMessages} class="clear-btn">🗑️</button>
  </div>
</div>

<style>
  .chat-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: inherit;
    width: 80%;
    max-width: 800px;
    padding: 10px;
    box-sizing: border-box;
    margin: auto;
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 10px;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
    background-color: #f9f9f9;
    display: flex;
    flex-direction: column;
  }

  /* Custom Scrollbar */
  .chat-messages::-webkit-scrollbar {
    width: 6px;
  }
  .chat-messages::-webkit-scrollbar-thumb {
    background: #686868;
    border-radius: 20px;
  }

  .message {
    margin: 5px 0;
    padding: 8px 12px;
    border-radius: 15px;
    max-width: 75%;
    word-wrap: break-word;
  }

  .user {
    background-color: #0078ff;
    color: white;
    align-self: flex-end;
    text-align: right;
  }

  .ai {
    background-color: #e6f7ff;
    color: black;
    align-self: flex-start;
    text-align: left;
  }

  .input-container {
    display: flex;
    gap: 5px;
  }

  .chat-input {
    flex: 1;
    padding: 10px;
    border-radius: 5px;
    border: 1px solid #ccc;
    box-sizing: border-box;
  }

  .send-btn, .clear-btn {
    border: none;
    background: none;
    font-size: 20px;
    cursor: pointer;
  }

  .send-btn:hover {
    color: #0078ff;
  }

  .clear-btn:hover {
    color: red;
  }
</style>
