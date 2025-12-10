// Chat Together - Real-time Chat Application
// Uses Ably Realtime for pub/sub messaging

class ChatApp {
    constructor() {
        // TODO: Replace with your actual Ably API key
        // Get your free API key from: https://ably.com/accounts/any/apps/any/app_keys
        this.ABLY_KEY = '0ZLtnA.J2C8Uw:8V3T6aBsIMcLHpPi3g-7wlY6x8l4F3UsjmSNsvxCwP8';
        
        // App state
        this.ably = null;
        this.channel = null;
        this.username = this.getStoredUsername();
        this.roomName = this.getRoomFromURL();
        this.isConnected = false;
        this.onlineUsers = new Set();
        this.typingUsers = new Map();
        this.typingTimeout = null;
        this.lastMessageTime = 0;
        this.messageCount = 0;
        
        // Rate limiting
        this.RATE_LIMIT = 5; // messages per second
        this.RATE_WINDOW = 1000; // 1 second
        
        // Profanity filter (basic word list)
        this.profanityList = [
            'damn', 'hell', 'stupid', 'idiot', 'moron', 'dumb', 'crazy',
            // Add more words as needed - this is a very basic filter
        ];
        
        // Settings
        this.settings = {
            enterToSend: this.getStoredSetting('enterToSend', true),
            darkTheme: this.getStoredSetting('darkTheme', false)
        };
        
        this.initializeApp();
    }
    
    // Initialize the application
    initializeApp() {
        this.initializeElements();
        this.applySettings();
        this.setupEventListeners();
        this.updateRoomDisplay();
        
        if (!this.username) {
            this.promptForUsername();
        } else {
            this.initRealtime();
        }
    }
    
    // Get DOM elements
    initializeElements() {
        this.elements = {
            roomName: document.getElementById('room-name'),
            onlineCount: document.getElementById('online-count'),
            roomSelector: document.getElementById('room-selector'),
            shareBtn: document.getElementById('share-btn'),
            settingsBtn: document.getElementById('settings-btn'),
            connectionStatus: document.getElementById('connection-status'),
            statusText: document.getElementById('status-text'),
            messagesContainer: document.getElementById('messages-container'),
            typingIndicator: document.getElementById('typing-indicator'),
            typingText: document.getElementById('typing-text'),
            messageInput: document.getElementById('message-input'),
            sendBtn: document.getElementById('send-btn'),
            
            // Room Modal
            roomModal: document.getElementById('room-modal'),
            closeRoomModal: document.getElementById('close-room-modal'),
            roomInput: document.getElementById('room-input'),
            joinRoom: document.getElementById('join-room'),
            
            // Share Modal
            shareModal: document.getElementById('share-modal'),
            closeShareModal: document.getElementById('close-share-modal'),
            shareUrl: document.getElementById('share-url'),
            copyUrl: document.getElementById('copy-url'),
            
            // Settings Modal
            settingsModal: document.getElementById('settings-modal'),
            closeSettings: document.getElementById('close-settings'),
            usernameInput: document.getElementById('username-input'),
            enterToSendCheck: document.getElementById('enter-to-send'),
            darkThemeCheck: document.getElementById('dark-theme'),
            saveSettings: document.getElementById('save-settings')
        };
    }
    
    // Setup all event listeners
    setupEventListeners() {
        // Send message
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        
        // Message input events
        this.elements.messageInput.addEventListener('keydown', (e) => this.handleInputKeydown(e));
        this.elements.messageInput.addEventListener('input', () => this.handleTyping());
        this.elements.messageInput.addEventListener('paste', (e) => this.handlePaste(e));
        
        // Room selector
        this.elements.roomSelector.addEventListener('click', () => this.openRoomSelector());
        this.elements.closeRoomModal.addEventListener('click', () => this.closeRoomSelector());
        this.elements.joinRoom.addEventListener('click', () => this.joinNewRoom());
        this.elements.roomInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.joinNewRoom();
            }
        });
        
        // Quick room buttons
        document.querySelectorAll('.room-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const roomName = e.target.dataset.room;
                this.switchToRoom(roomName);
            });
        });
        
        // Share
        this.elements.shareBtn.addEventListener('click', () => this.openShare());
        this.elements.closeShareModal.addEventListener('click', () => this.closeShare());
        this.elements.copyUrl.addEventListener('click', () => this.copyShareUrl());
        
        // Settings
        this.elements.settingsBtn.addEventListener('click', () => this.openSettings());
        this.elements.closeSettings.addEventListener('click', () => this.closeSettings());
        this.elements.saveSettings.addEventListener('click', () => this.saveSettings());
        
        // Modal outside click
        [this.elements.roomModal, this.elements.shareModal, this.elements.settingsModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeAllModals();
                }
            });
        });
        
        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
        
        // Auto-resize textarea
        this.elements.messageInput.addEventListener('input', () => this.autoResizeTextarea());
        
        // Window events
        window.addEventListener('beforeunload', () => this.handleDisconnect());
        window.addEventListener('hashchange', () => this.handleRoomChange());
    }
    
    // Get room name from URL hash
    getRoomFromURL() {
        const hash = window.location.hash.slice(1);
        const params = new URLSearchParams(hash);
        return params.get('room') || 'general';
    }
    
    // Update room display
    updateRoomDisplay() {
        this.elements.roomName.textContent = this.roomName;
        document.title = `Chat Together - #${this.roomName}`;
    }
    
    // Handle room change via URL
    handleRoomChange() {
        const newRoom = this.getRoomFromURL();
        if (newRoom !== this.roomName) {
            this.roomName = newRoom;
            this.updateRoomDisplay();
            if (this.isConnected) {
                this.reconnectToRoom();
            }
        }
    }
    
    // Get stored username
    getStoredUsername() {
        return localStorage.getItem('chat-username') || '';
    }
    
    // Store username
    storeUsername(username) {
        localStorage.setItem('chat-username', username);
    }
    
    // Get stored setting
    getStoredSetting(key, defaultValue) {
        const stored = localStorage.getItem(`chat-setting-${key}`);
        return stored !== null ? JSON.parse(stored) : defaultValue;
    }
    
    // Store setting
    storeSetting(key, value) {
        localStorage.setItem(`chat-setting-${key}`, JSON.stringify(value));
    }
    
    // Apply settings
    applySettings() {
        // Apply dark theme
        if (this.settings.darkTheme) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        
        // Update checkboxes
        this.elements.enterToSendCheck.checked = this.settings.enterToSend;
        this.elements.darkThemeCheck.checked = this.settings.darkTheme;
    }
    
    // Prompt for username on first visit
    promptForUsername() {
        const username = prompt('Enter your username:');
        if (username && username.trim()) {
            this.username = this.sanitizeText(username.trim()).substring(0, 30);
            this.storeUsername(this.username);
            this.initRealtime();
        } else {
            // Set a default username if none provided
            this.username = `User${Math.floor(Math.random() * 10000)}`;
            this.storeUsername(this.username);
            this.initRealtime();
        }
    }
    
    // Initialize Ably connection
    async initRealtime() {
        try {
            this.showConnectionStatus('Connecting...', 'connecting');
            
            // Check if API key is set
            if (this.ABLY_KEY === 'YOUR_ABLY_KEY_HERE') {
                this.showConnectionStatus('Please set your Ably API key in app.js', 'error');
                this.showSystemMessage('⚠️ Chat is not configured. Please set your Ably API key in app.js file.');
                return;
            }
            
            // Initialize Ably
            this.ably = new Ably.Realtime({
                key: this.ABLY_KEY,
                clientId: this.username
            });
            
            // Handle connection state changes
            this.ably.connection.on('connected', () => {
                this.handleConnected();
            });
            
            this.ably.connection.on('disconnected', () => {
                this.handleDisconnected();
            });
            
            this.ably.connection.on('failed', (error) => {
                this.handleConnectionError(error);
            });
            
            // Join the room
            await this.joinRoom();
            
        } catch (error) {
            console.error('Failed to initialize Ably:', error);
            this.handleConnectionError(error);
        }
    }
    
    // Join a chat room
    async joinRoom() {
        try {
            // Get the channel for this room
            this.channel = this.ably.channels.get(`chat-room:${this.roomName}`);
            
            // Subscribe to messages
            this.channel.subscribe('chat', (message) => {
                this.handleNewMessage(message);
            });
            
            // Subscribe to typing indicators
            this.channel.subscribe('typing', (message) => {
                this.handleTypingIndicator(message);
            });
            
            // Enter presence
            await this.channel.presence.enter({
                username: this.username,
                joinedAt: Date.now()
            });
            
            // Subscribe to presence changes
            this.channel.presence.subscribe((presenceMessage) => {
                this.handlePresenceChange(presenceMessage);
            });
            
            // Get current presence members
            const members = await this.channel.presence.get();
            this.updateOnlineCount(members);
            
            this.showSystemMessage(`👋 ${this.username} joined the chat`);
            
        } catch (error) {
            console.error('Failed to join room:', error);
            this.handleConnectionError(error);
        }
    }
    
    // Reconnect to a different room
    async reconnectToRoom() {
        if (this.channel) {
            await this.channel.presence.leave();
            this.channel.unsubscribe();
        }
        
        this.clearMessages();
        await this.joinRoom();
    }
    
    // Handle successful connection
    handleConnected() {
        this.isConnected = true;
        this.hideConnectionStatus();
        console.log('Connected to Ably');
    }
    
    // Handle disconnection
    handleDisconnected() {
        this.isConnected = false;
        this.showConnectionStatus('Disconnected - trying to reconnect...', 'error');
        console.log('Disconnected from Ably');
    }
    
    // Handle connection errors
    handleConnectionError(error) {
        this.isConnected = false;
        this.showConnectionStatus('Connection failed - check your internet connection', 'error');
        console.error('Ably connection error:', error);
        
        if (error.message && error.message.includes('key')) {
            this.showSystemMessage('⚠️ Invalid API key. Please check your Ably configuration.');
        }
    }
    
    // Show connection status
    showConnectionStatus(message, type) {
        this.elements.statusText.textContent = message;
        this.elements.connectionStatus.className = `connection-status ${type}`;
        this.elements.connectionStatus.style.display = 'block';
    }
    
    // Hide connection status
    hideConnectionStatus() {
        this.elements.connectionStatus.style.display = 'none';
    }
    
    // Handle new message
    handleNewMessage(message) {
        const data = message.data;
        const isMyMessage = message.clientId === this.username;
        
        this.renderMessage({
            username: data.username,
            text: data.text,
            timestamp: data.timestamp,
            mine: isMyMessage
        });
        
        // Remove typing indicator for this user
        if (this.typingUsers.has(data.username)) {
            this.typingUsers.delete(data.username);
            this.updateTypingIndicator();
        }
    }
    
    // Handle typing indicator
    handleTypingIndicator(message) {
        const data = message.data;
        
        // Ignore our own typing indicators
        if (message.clientId === this.username) return;
        
        if (data.typing) {
            this.typingUsers.set(data.username, Date.now());
        } else {
            this.typingUsers.delete(data.username);
        }
        
        this.updateTypingIndicator();
        
        // Auto-remove typing indicator after 3 seconds
        setTimeout(() => {
            const typingTime = this.typingUsers.get(data.username);
            if (typingTime && Date.now() - typingTime > 2500) {
                this.typingUsers.delete(data.username);
                this.updateTypingIndicator();
            }
        }, 3000);
    }
    
    // Handle presence changes
    handlePresenceChange(presenceMessage) {
        if (presenceMessage.action === 'enter') {
            const username = presenceMessage.data?.username || presenceMessage.clientId;
            if (username !== this.username) {
                this.showSystemMessage(`👋 ${username} joined the chat`);
            }
        } else if (presenceMessage.action === 'leave') {
            const username = presenceMessage.data?.username || presenceMessage.clientId;
            if (username !== this.username) {
                this.showSystemMessage(`👋 ${username} left the chat`);
            }
        }
        
        // Update online count
        if (this.channel && this.channel.presence && this.channel.presence.get) {
            try {
                const presencePromise = this.channel.presence.get();
                if (presencePromise && presencePromise.then) {
                    presencePromise.then(members => {
                        this.updateOnlineCount(members);
                    }).catch(error => {
                        console.error('Error getting presence members:', error);
                    });
                }
            } catch (error) {
                console.error('Error accessing presence:', error);
            }
        }
    }
    
    // Update online count
    updateOnlineCount(members) {
        const count = members.length;
        this.onlineUsers = new Set(members.map(m => m.data?.username || m.clientId));
        this.elements.onlineCount.textContent = `${count} online`;
    }
    
    // Update typing indicator
    updateTypingIndicator() {
        const typingUsernames = Array.from(this.typingUsers.keys()).filter(username => username !== this.username);
        
        if (typingUsernames.length === 0) {
            this.elements.typingIndicator.style.display = 'none';
        } else {
            let text;
            if (typingUsernames.length === 1) {
                text = `${typingUsernames[0]} is typing...`;
            } else if (typingUsernames.length === 2) {
                text = `${typingUsernames[0]} and ${typingUsernames[1]} are typing...`;
            } else {
                text = `${typingUsernames.length} people are typing...`;
            }
            
            this.elements.typingText.textContent = text;
            this.elements.typingIndicator.style.display = 'block';
        }
    }
    
    // Handle input keydown
    handleInputKeydown(e) {
        if (e.key === 'Enter') {
            if (this.settings.enterToSend && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        }
    }
    
    // Handle typing
    handleTyping() {
        if (!this.isConnected || !this.channel) return;
        
        // Clear existing timeout
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }
        
        // Send typing indicator
        this.channel.publish('typing', {
            username: this.username,
            typing: true
        });
        
        // Stop typing after 2 seconds
        this.typingTimeout = setTimeout(() => {
            if (this.channel) {
                this.channel.publish('typing', {
                    username: this.username,
                    typing: false
                });
            }
        }, 2000);
    }
    
    // Handle paste
    handlePaste(e) {
        const paste = (e.clipboardData || window.clipboardData).getData('text');
        if (paste.length > 1000) {
            e.preventDefault();
            alert('Message is too long. Please keep it under 1000 characters.');
        }
    }
    
    // Send message
    sendMessage() {
        const text = this.elements.messageInput.value.trim();
        if (!text || !this.isConnected || !this.channel) return;
        
        // Rate limiting
        if (!this.checkRateLimit()) {
            this.showSystemMessage('⚠️ You are sending messages too quickly. Please slow down.');
            return;
        }
        
        // Length validation
        if (text.length > 1000) {
            this.showSystemMessage('⚠️ Message is too long. Please keep it under 1000 characters.');
            return;
        }
        
        // Basic profanity filter
        const filteredText = this.filterProfanity(text);
        
        // Publish message
        this.channel.publish('chat', {
            username: this.username,
            text: filteredText,
            timestamp: Date.now()
        });
        
        // Clear input
        this.elements.messageInput.value = '';
        this.autoResizeTextarea();
        
        // Stop typing indicator
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }
        
        this.channel.publish('typing', {
            username: this.username,
            typing: false
        });
    }
    
    // Check rate limiting
    checkRateLimit() {
        const now = Date.now();
        
        if (now - this.lastMessageTime < this.RATE_WINDOW) {
            this.messageCount++;
            if (this.messageCount > this.RATE_LIMIT) {
                return false;
            }
        } else {
            this.messageCount = 1;
            this.lastMessageTime = now;
        }
        
        return true;
    }
    
    // Basic profanity filter
    filterProfanity(text) {
        let filtered = text;
        this.profanityList.forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            filtered = filtered.replace(regex, '*'.repeat(word.length));
        });
        return filtered;
    }
    
    // Sanitize text to prevent XSS
    sanitizeText(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Render a message
    renderMessage({ username, text, timestamp, mine }) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${mine ? 'mine' : 'others'}`;
        
        const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-username">${this.sanitizeText(username)}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-bubble">
                ${this.sanitizeText(text)}
            </div>
        `;
        
        this.elements.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    // Show system message
    showSystemMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'system-message';
        messageDiv.textContent = text;
        
        this.elements.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    // Clear all messages
    clearMessages() {
        const messages = this.elements.messagesContainer.querySelectorAll('.message, .system-message');
        messages.forEach(msg => msg.remove());
    }
    
    // Scroll to bottom (only if user is at bottom)
    scrollToBottom() {
        const container = this.elements.messagesContainer;
        const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 50;
        
        if (isAtBottom) {
            container.scrollTop = container.scrollHeight;
        }
    }
    
    // Auto-resize textarea
    autoResizeTextarea() {
        const textarea = this.elements.messageInput;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 96) + 'px';
    }
    
    // Open settings modal
    openSettings() {
        this.elements.usernameInput.value = this.username;
        this.elements.enterToSendCheck.checked = this.settings.enterToSend;
        this.elements.darkThemeCheck.checked = this.settings.darkTheme;
        this.elements.settingsModal.style.display = 'flex';
        this.elements.usernameInput.focus();
    }
    
    // Close settings modal
    closeSettings() {
        this.elements.settingsModal.style.display = 'none';
    }
    
    // Open room selector modal
    openRoomSelector() {
        this.elements.roomInput.value = this.roomName;
        this.elements.roomModal.style.display = 'flex';
        this.elements.roomInput.focus();
        this.elements.roomInput.select();
    }
    
    // Close room selector modal
    closeRoomSelector() {
        this.elements.roomModal.style.display = 'none';
    }
    
    // Join new room
    joinNewRoom() {
        const newRoom = this.elements.roomInput.value.trim();
        if (!newRoom) {
            alert('Please enter a room name');
            return;
        }
        
        this.switchToRoom(newRoom);
    }
    
    // Switch to a different room
    switchToRoom(roomName) {
        const sanitizedRoom = this.sanitizeText(roomName.toLowerCase().replace(/[^a-z0-9-]/g, ''));
        if (sanitizedRoom && sanitizedRoom !== this.roomName) {
            window.location.hash = `room=${sanitizedRoom}`;
            this.closeAllModals();
        }
    }
    
    // Open share modal
    openShare() {
        const currentUrl = `${window.location.origin}${window.location.pathname}#room=${this.roomName}`;
        this.elements.shareUrl.value = currentUrl;
        this.elements.shareModal.style.display = 'flex';
        this.elements.shareUrl.select();
    }
    
    // Close share modal
    closeShare() {
        this.elements.shareModal.style.display = 'none';
    }
    
    // Copy share URL
    copyShareUrl() {
        this.elements.shareUrl.select();
        document.execCommand('copy');
        
        // Show feedback
        const originalText = this.elements.copyUrl.textContent;
        this.elements.copyUrl.textContent = 'Copied!';
        setTimeout(() => {
            this.elements.copyUrl.textContent = originalText;
        }, 2000);
    }
    
    // Close all modals
    closeAllModals() {
        this.elements.roomModal.style.display = 'none';
        this.elements.shareModal.style.display = 'none';
        this.elements.settingsModal.style.display = 'none';
    }
    
    // Save settings
    saveSettings() {
        const newUsername = this.elements.usernameInput.value.trim();
        const newEnterToSend = this.elements.enterToSendCheck.checked;
        const newDarkTheme = this.elements.darkThemeCheck.checked;
        
        // Validate username
        if (!newUsername) {
            alert('Username cannot be empty');
            return;
        }
        
        if (newUsername.length > 30) {
            alert('Username must be 30 characters or less');
            return;
        }
        
        // Update username if changed
        if (newUsername !== this.username) {
            this.username = this.sanitizeText(newUsername);
            this.storeUsername(this.username);
            
            // Update presence if connected
            if (this.isConnected && this.channel) {
                this.channel.presence.update({
                    username: this.username,
                    joinedAt: Date.now()
                });
            }
            
            this.showSystemMessage(`📝 Username changed to ${this.username}`);
        }
        
        // Update settings
        this.settings.enterToSend = newEnterToSend;
        this.settings.darkTheme = newDarkTheme;
        
        this.storeSetting('enterToSend', newEnterToSend);
        this.storeSetting('darkTheme', newDarkTheme);
        
        this.applySettings();
        this.closeSettings();
    }
    
    // Handle disconnect
    handleDisconnect() {
        if (this.channel) {
            this.channel.presence.leave();
        }
    }
}

// Initialize the chat app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});