/**
 * Gheremiah AI Chat Handler
 * Manages chat UI interactions and communication with the VS Code extension
 */

// Type declaration for VS Code webview API
declare function acquireVsCodeApi(): {
    postMessage(message: any): void;
};

const vscode = acquireVsCodeApi();
const messageHistory = document.getElementById('message-history') as HTMLElement;
const userInput = document.getElementById('user-input') as HTMLInputElement;
const sendButton = document.getElementById('send-button') as HTMLButtonElement;

let isWaitingForResponse = false;

/**
 * Add a message to the chat history
 */
function addMessage(
    text: string,
    sender: 'user' | 'bot',
    timestamp: Date = new Date()
): void {
    const template = sender === 'user'
        ? document.getElementById('user-message-template') as HTMLTemplateElement
        : document.getElementById('bot-message-template') as HTMLTemplateElement;

    const clone = template.content.cloneNode(true) as DocumentFragment;
    const messageText = clone.querySelector('.message-text') as HTMLElement;
    const timeSpan = clone.querySelector('.text-xs') as HTMLElement;

    if (sender === 'bot') {
        // Render markdown-style code blocks
        let formattedText = text
            .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
                return `<pre><code class="language-${lang || 'javascript'}">${escapeHtml(code.trim())}</code></pre>`;
            })
            .replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1 py-0.5 rounded">$1</code>');

        messageText.innerHTML = formattedText;
    } else {
        messageText.textContent = text;
    }

    timeSpan.textContent = timestamp.toLocaleTimeString();
    messageHistory.appendChild(clone);
    messageHistory.scrollTop = messageHistory.scrollHeight;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show typing indicator while waiting for bot response
 */
function showTypingIndicator(): void {
    const template = document.getElementById('typing-indicator') as HTMLTemplateElement;
    const clone = template.content.cloneNode(true) as DocumentFragment;
    (clone.firstElementChild as HTMLElement).id = 'typing-indicator';
    messageHistory.appendChild(clone);
    messageHistory.scrollTop = messageHistory.scrollHeight;
}

/**
 * Remove typing indicator
 */
function removeTypingIndicator(): void {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

/**
 * Send message to the extension
 */
async function sendMessage(): Promise<void> {
    if (isWaitingForResponse) return;

    const text = userInput.value.trim();
    if (!text) return;

    // Disable input while processing
    isWaitingForResponse = true;
    sendButton.disabled = true;
    userInput.disabled = true;

    // Add user message
    addMessage(text, 'user');
    userInput.value = '';

    // Show typing indicator
    showTypingIndicator();

    // Send to extension
    vscode.postMessage({ command: 'askGemini', text: text });
}

/**
 * Event Listeners
 */
sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Auto-resize input
userInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
});

// Listen for messages from extension
window.addEventListener('message', (event: MessageEvent) => {
    const message = event.data;
    if (message.command === 'gheremiahResponse') {
        removeTypingIndicator();
        addMessage(message.text, 'bot');

        // Re-enable input
        isWaitingForResponse = false;
        sendButton.disabled = false;
        userInput.disabled = false;
        userInput.focus();
    }
});

// Focus input on load
userInput.focus();
