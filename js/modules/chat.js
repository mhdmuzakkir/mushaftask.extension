(function(window) {
    'use strict';

    var CHAT_POLL_MS = 1000;
    var chatPollInterval = null;
    var lastMessageCount = 0;

    function getChatDir() {
        if (!state.tasksFolder) return null;
        return path.join(state.tasksFolder, 'chat');
    }

    function getUserChatFile(username) {
        var dir = getChatDir();
        if (!dir || !username) return null;
        return path.join(dir, 'messages-' + username.toLowerCase() + '.json');
    }

    function ensureChatDir() {
        try {
            var dir = getChatDir();
            if (dir && !fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        } catch (e) {
            console.error('Error creating chat dir:', e);
        }
    }

    function loadAllChatMessages() {
        var dir = getChatDir();
        if (!dir) return [];
        var allMessages = [];
        try {
            if (!fs.existsSync(dir)) return [];
            var files = fs.readdirSync(dir).filter(function(f) {
                return f.startsWith('messages-') && f.endsWith('.json');
            });
            files.forEach(function(file) {
                try {
                    var data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
                    if (Array.isArray(data.messages)) {
                        allMessages = allMessages.concat(data.messages);
                    }
                } catch (e) {
                    console.error('Error reading chat file', file, e);
                }
            });
        } catch (e) {
            console.error('Error loading chat messages:', e);
        }
        // Sort by timestamp
        allMessages.sort(function(a, b) {
            return new Date(a.timestamp) - new Date(b.timestamp);
        });
        return allMessages;
    }

    function saveUserChatMessages(username, messages) {
        var file = getUserChatFile(username);
        if (!file) return false;
        try {
            ensureChatDir();
            fs.writeFileSync(file, JSON.stringify({ messages: messages }, null, 2));
            return true;
        } catch (e) {
            console.error('Error saving chat:', e);
            return false;
        }
    }

    function generateMessageId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    function sendChatMessage(text) {
        if (!text || !text.trim()) return;
        if (!authState.currentUser) {
            showToast('Please log in to send messages', 'error');
            return;
        }
        var trimmed = text.trim();
        if (trimmed.length > 500) {
            showToast('Message too long (max 500 chars)', 'error');
            return;
        }
        var username = authState.currentUser;
        var userFile = getUserChatFile(username);
        var messages = [];
        try {
            if (userFile && fs.existsSync(userFile)) {
                var data = JSON.parse(fs.readFileSync(userFile, 'utf8'));
                messages = Array.isArray(data.messages) ? data.messages : [];
            }
        } catch (e) {}

        messages.push({
            id: generateMessageId(),
            username: username,
            text: trimmed,
            timestamp: new Date().toISOString()
        });
        // Keep last 100 messages per user
        if (messages.length > 100) {
            messages = messages.slice(messages.length - 100);
        }
        if (saveUserChatMessages(username, messages)) {
            renderChatMessages();
            scrollChatToBottom();
        }
    }

    function getUserColor(username) {
        var colors = ['#4a9eff', '#2ecc71', '#f39c12', '#e74c3c', '#EC407A', '#9b59b6', '#1abc9c', '#e67e22'];
        var hash = 0;
        for (var i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

    function formatChatTime(iso) {
        try {
            var d = new Date(iso);
            var h = d.getHours();
            var m = d.getMinutes().toString().padStart(2, '0');
            var ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12;
            h = h ? h : 12;
            return h + ':' + m + ' ' + ampm;
        } catch (e) {
            return '';
        }
    }

    function getChatAvatarHtml(username) {
        var userColor = getUserColor(username);
        var firstLetter = username ? username.charAt(0).toUpperCase() : '?';
        var avatarUrl = '';
        try {
            if (authState.config && authState.config.users && authState.config.users[username] && authState.config.users[username].avatar) {
                avatarUrl = authState.config.users[username].avatar;
            }
        } catch (e) {}
        if (avatarUrl) {
            return '<span class="chat-avatar" style="background-image:url(\'' + avatarUrl + '\');background-color:transparent;"></span>';
        }
        return '<span class="chat-avatar" style="background-color:' + userColor + ';">' + firstLetter + '</span>';
    }

    function renderChatMessages() {
        var container = document.getElementById('chatMessagesList');
        if (!container) return;
        var messages = loadAllChatMessages();
        lastMessageCount = messages.length;
        var currentUser = authState.currentUser || '';

        if (messages.length === 0) {
            container.innerHTML = '<p class="chat-empty">Salam!</p><button id="sendSalamBtn" class="btn-secondary" style="margin-top:10px;">السلام عليكم ورحمة الله وبركاته</button>';
            var salamBtn = document.getElementById('sendSalamBtn');
            if (salamBtn) {
                salamBtn.addEventListener('click', function() {
                    sendChatMessage('السلام عليكم ورحمة الله وبركاته');
                });
            }
            return;
        }

        var html = '';
        messages.forEach(function(msg) {
            var isMe = msg.username && msg.username.toLowerCase() === currentUser.toLowerCase();
            var time = formatChatTime(msg.timestamp);
            var userColor = getUserColor(msg.username);
            html += '<div class="chat-message ' + (isMe ? 'chat-message-me' : 'chat-message-other') + '">';
            html += '<div class="chat-message-header">';
            html += getChatAvatarHtml(msg.username);
            html += '<span class="chat-message-user" style="color:' + userColor + ';">' + escapeHtml(msg.username) + '</span>';
            html += '<span class="chat-message-time">' + time + '</span>';
            html += '</div>';
            html += '<div class="chat-message-text">' + escapeHtml(msg.text) + '</div>';
            html += '</div>';
        });
        container.innerHTML = html;
    }

    function scrollChatToBottom() {
        var container = document.getElementById('chatMessagesContainer');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    function updateChatBadge() {
        var messages = loadAllChatMessages();
        var unread = Math.max(0, messages.length - (state.lastReadChatCount || 0));
        var chatBtn = document.querySelector('.bottom-tab-btn[data-tab="chat"]');
        if (!chatBtn) return;
        var badge = chatBtn.querySelector('.chat-badge');
        if (unread > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'chat-badge';
                chatBtn.style.position = 'relative';
                chatBtn.appendChild(badge);
            }
            badge.textContent = unread > 99 ? '99+' : unread;
        } else if (badge) {
            badge.remove();
        }
    }

    function clearChatBadge() {
        var chatBtn = document.querySelector('.bottom-tab-btn[data-tab="chat"]');
        if (chatBtn) {
            var badge = chatBtn.querySelector('.chat-badge');
            if (badge) badge.remove();
        }
        state.lastReadChatCount = lastMessageCount;
        saveSettings();
    }

    function clearAllChatMessages() {
        var dir = getChatDir();
        if (!dir) return false;
        try {
            if (!fs.existsSync(dir)) return true;
            var files = fs.readdirSync(dir).filter(function(f) {
                return f.startsWith('messages-') && f.endsWith('.json');
            });
            files.forEach(function(file) {
                try {
                    fs.unlinkSync(path.join(dir, file));
                } catch (e) {
                    console.error('Error deleting chat file', file, e);
                }
            });
            lastMessageCount = 0;
            state.lastReadChatCount = 0;
            renderChatMessages();
            updateChatBadge();
            return true;
        } catch (e) {
            console.error('Error clearing chat messages:', e);
            return false;
        }
    }

    function checkForNewMessages() {
        if (!state.tasksFolder) return;
        var messages = loadAllChatMessages();
        if (messages.length !== lastMessageCount) {
            var hadNewMessages = messages.length > lastMessageCount;
            renderChatMessages();
            if (hadNewMessages) {
                scrollChatToBottom();
                var chatTab = document.getElementById('chatTab');
                if (!chatTab || !chatTab.classList.contains('active')) {
                    showToast('New message received', 'info');
                }
            }
            lastMessageCount = messages.length;
            updateChatBadge();
        }
    }

    function startChatPolling() {
        if (chatPollInterval) return;
        if (!state.tasksFolder) return;
        renderChatMessages();
        scrollChatToBottom();
        chatPollInterval = setInterval(checkForNewMessages, CHAT_POLL_MS);
        updateChatBadge();
        console.log('Chat polling started');
    }

    function stopChatPolling() {
        if (chatPollInterval) {
            clearInterval(chatPollInterval);
            chatPollInterval = null;
            console.log('Chat polling stopped');
        }
    }

    function initChat() {
        var sendBtn = document.getElementById('chatSendBtn');
        var input = document.getElementById('chatInput');
        if (sendBtn) {
            sendBtn.addEventListener('click', function() {
                if (input) {
                    sendChatMessage(input.value);
                    input.value = '';
                    input.focus();
                }
            });
        }
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    sendChatMessage(input.value);
                    input.value = '';
                }
            });
        }
    }

    window.startChatPolling = startChatPolling;
    window.stopChatPolling = stopChatPolling;
    window.initChat = initChat;
    window.renderChatMessages = renderChatMessages;
    window.updateChatBadge = updateChatBadge;
    window.clearChatBadge = clearChatBadge;
    window.clearAllChatMessages = clearAllChatMessages;
})(window);
