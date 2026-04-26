function hashPassword(password) {
    function sha256(ascii) {
        function rightRotate(value, amount) {
            return (value >>> amount) | (value << (32 - amount));
        }
        var mathPow = Math.pow;
        var maxWord = mathPow(2, 32);
        var lengthProperty = 'length';
        var i, j;
        var result = '';
        var words = [];
        var asciiBitLength = ascii[lengthProperty] * 8;
        var hash = sha256.h = sha256.h || [];
        var k = sha256.k = sha256.k || [];
        var primeCounter = k[lengthProperty];
        var isComposite = {};
        for (var candidate = 2; primeCounter < 64; candidate++) {
            if (!isComposite[candidate]) {
                for (i = 0; i < 313; i += candidate) {
                    isComposite[i] = candidate;
                }
                hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
                k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
            }
        }
        ascii += '\x80';
        while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
        for (i = 0; i < ascii[lengthProperty]; i++) {
            j = ascii.charCodeAt(i);
            if (j >> 8) return;
            words[i >> 2] |= j << ((3 - i) % 4) * 8;
        }
        words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
        words[words[lengthProperty]] = (asciiBitLength);
        for (j = 0; j < words[lengthProperty];) {
            var w = words.slice(j, j += 16);
            var oldHash = hash;
            hash = hash.slice(0, 8);
            for (i = 0; i < 64; i++) {
                var i2 = i + j;
                var w15 = w[i - 15], w2 = w[i - 2];
                var a = hash[0], e = hash[4];
                var temp1 = hash[7] + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
                    + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] + (w[i] = (i < 16) ? w[i] : (
                        w[i - 16] + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) + w[i - 7]
                        + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | 0);
                var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
                    + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
                hash = [(temp1 + temp2) | 0].concat(hash);
                hash[4] = (hash[4] + temp1) | 0;
            }
            for (i = 0; i < 8; i++) {
                hash[i] = (hash[i] + oldHash[i]) | 0;
            }
        }
        for (i = 0; i < 8; i++) {
            for (j = 3; j + 1; j--) {
                var b = (hash[i] >> (j * 8)) & 255;
                result += ((b < 16) ? 0 : '') + b.toString(16);
            }
        }
        return result;
    }
    return sha256(password);
}
function loadConfig() {
    try {
        if (!state.tasksFolder) {
            console.log('loadConfig: tasksFolder not set');
            return null;
        }
        authState.configPath = path.join(state.tasksFolder, 'config.json');
        // Note: activityPath is now per-user, set after login
        console.log('loadConfig: config path:', authState.configPath);
        
        if (fs.existsSync(authState.configPath)) {
            console.log('loadConfig: config file exists, loading...');
            authState.config = JSON.parse(fs.readFileSync(authState.configPath, 'utf8'));
            console.log('loadConfig: loaded users:', Object.keys(authState.config.users || {}));
        } else {
            console.log('loadConfig: config file not found, creating default with muzakkir');
            authState.config = { 
                users: {
                    muzakkir: {
                        passwordHash: null,
                        isAdmin: true,
                        createdAt: new Date().toISOString()
                    }
                }, 
                version: '1.0.0', 
                lastUpdated: new Date().toISOString() 
            };
            saveConfig();
            console.log('loadConfig: default config created');
        }
        return authState.config;
    } catch (e) {
        console.error('Error loading config:', e);
        return null;
    }
}
function saveConfig() {
    try {
        if (authState.configPath && authState.config) {
            authState.config.lastUpdated = new Date().toISOString();
            fs.writeFileSync(authState.configPath, JSON.stringify(authState.config, null, 2));
            
            // Create activity files for all users
            createActivityFilesForAllUsers();
        }
    } catch (e) {
        console.error('Error saving config:', e);
    }
}
function createActivityFilesForAllUsers() {
    try {
        if (!state.tasksFolder) {
            console.log('createActivityFilesForAllUsers: tasksFolder not set');
            return;
        }
        
        console.log('Creating activity folder and files...');
        
        // Create activity folder if not exists
        const activityFolder = path.join(state.tasksFolder, 'activity');
        if (!fs.existsSync(activityFolder)) {
            fs.mkdirSync(activityFolder, { recursive: true });
            console.log(`Created activity folder: ${activityFolder}`);
        } else {
            console.log(`Activity folder already exists: ${activityFolder}`);
        }
        
        // Create empty activity file for each user
        const users = getUsers();
        console.log(`Creating activity files for ${Object.keys(users).length} users`);
        
        Object.keys(users).forEach(username => {
            const activityFile = path.join(activityFolder, `activity-${username}.json`);
            if (!fs.existsSync(activityFile)) {
                fs.writeFileSync(activityFile, JSON.stringify({ logs: [] }, null, 2));
                console.log(`Created activity file for ${username}: ${activityFile}`);
            } else {
                console.log(`Activity file already exists for ${username}`);
            }
        });
        
        console.log('Activity files setup complete');
    } catch (e) {
        console.error('Error creating activity files:', e);
    }
}
function getUsers() {
    if (!authState.config) loadConfig();
    return authState.config ? authState.config.users : {};
}
function userExists(username) {
    const users = getUsers();
    return users.hasOwnProperty(username.toLowerCase());
}
function getUser(username) {
    const users = getUsers();
    return users[username.toLowerCase()] || null;
}
function addUser(username, password, isAdmin = false) {
    try {
        if (!authState.config) loadConfig();
        const lowerUsername = username.toLowerCase();
        authState.config.users[lowerUsername] = {
            passwordHash: hashPassword(password),
            isAdmin: isAdmin,
            createdAt: new Date().toISOString()
        };
        saveConfig();
        return true;
    } catch (e) {
        console.error('Error adding user:', e);
        return false;
    }
}
function resetUserPassword(username, newPassword) {
    try {
        if (!authState.config) loadConfig();
        const lowerUsername = username.toLowerCase();
        // Super-admin protection: only muzakkir can modify muzakkir
        if (lowerUsername === 'muzakkir' && authState.currentUser !== 'muzakkir') {
            showToast('Only Muzakkir can modify the Muzakkir account', 'error');
            return false;
        }
        if (authState.config.users[lowerUsername]) {
            authState.config.users[lowerUsername].passwordHash = hashPassword(newPassword);
            saveConfig();
            return true;
        }
        return false;
    } catch (e) {
        console.error('Error resetting password:', e);
        return false;
    }
}
function verifyPassword(username, password) {
    const user = getUser(username);
    if (!user) return false;
    return user.passwordHash === hashPassword(password);
}
function changeOwnPassword(newPassword) {
    if (!authState.currentUser) return false;
    return resetUserPassword(authState.currentUser, newPassword);
}
function showLoginModal(preselectedUser = null) {
    const modal = document.getElementById('loginModal');
    const userSelect = document.getElementById('loginUserSelect');
    
    // Show the modal
    modal.classList.remove('hidden');
    const passwordGroup = document.getElementById('passwordGroup');
    const setPasswordGroup = document.getElementById('setPasswordGroup');
    const loginTitle = document.getElementById('loginTitle');
    const welcomeMsg = document.getElementById('welcomeBackMsg');
    const userSelectGroup = document.getElementById('userSelectGroup');
    const switchUserLink = document.getElementById('switchUserLink');
    
    // Ensure config is loaded
    if (!authState.config) {
        loadConfig();
    }
    
    // If still no users, create default muzakkir user
    const users = getUsers();
    if (!users || Object.keys(users).length === 0) {
        console.log('No users found, creating default muzakkir user');
        authState.config = { 
            users: {
                muzakkir: {
                    passwordHash: null,
                    isAdmin: true,
                    createdAt: new Date().toISOString()
                }
            }, 
            version: '1.0.0', 
            lastUpdated: new Date().toISOString() 
        };
        saveConfig();
    }
    
    userSelect.innerHTML = '<option value="">Select User...</option>';
    const finalUsers = getUsers();
    console.log('Populating login dropdown with users:', Object.keys(finalUsers));
    Object.keys(finalUsers).sort().forEach(username => {
        const option = document.createElement('option');
        option.value = username;
        option.textContent = username.charAt(0).toUpperCase() + username.slice(1);
        userSelect.appendChild(option);
    });
    
    // Pre-select user if provided
    if (preselectedUser && finalUsers[preselectedUser]) {
        userSelect.value = preselectedUser;
        // Trigger change event to show correct password fields
        userSelect.dispatchEvent(new Event('change'));
        
        // Show welcome back UI
        if (loginTitle) loginTitle.textContent = 'Welcome Back';
        if (welcomeMsg) {
            welcomeMsg.textContent = `Hello, ${preselectedUser.charAt(0).toUpperCase() + preselectedUser.slice(1)}!`;
            welcomeMsg.classList.remove('hidden');
        }
        if (userSelectGroup) userSelectGroup.classList.add('hidden');
        if (switchUserLink) switchUserLink.classList.remove('hidden');
        
        // Focus password field after a short delay for UI to update
        setTimeout(() => {
            const passwordInput = document.getElementById('loginPassword');
            const newPasswordInput = document.getElementById('newPassword');
            
            // Focus the appropriate field
            if (!setPasswordGroup.classList.contains('hidden') && newPasswordInput) {
                newPasswordInput.focus();
            } else if (passwordInput) {
                passwordInput.focus();
            }
        }, 100);
    } else {
        // Show full login UI
        if (loginTitle) loginTitle.textContent = 'Login';
        if (welcomeMsg) welcomeMsg.classList.add('hidden');
        if (userSelectGroup) userSelectGroup.classList.remove('hidden');
        if (switchUserLink) switchUserLink.classList.add('hidden');
    }
    document.getElementById('loginPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    passwordGroup.classList.remove('hidden');
    setPasswordGroup.classList.add('hidden');
    modal.classList.remove('hidden');
    userSelect.onchange = function() {
        const selectedUser = this.value;
        if (!selectedUser) return;
        const user = getUser(selectedUser);
        if (user && user.passwordHash) {
            passwordGroup.classList.remove('hidden');
            setPasswordGroup.classList.add('hidden');
        } else {
            passwordGroup.classList.add('hidden');
            setPasswordGroup.classList.remove('hidden');
        }
    };
}
function hideLoginModal() {
    document.getElementById('loginModal').classList.add('hidden');
}
function handleLogin() {
    const username = document.getElementById('loginUserSelect').value;
    const password = document.getElementById('loginPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (!username) {
        showToast('Please select a user', 'error');
        return;
    }
    const user = getUser(username);
    if (user && user.passwordHash) {
        if (!password) {
            showToast('Please enter password', 'error');
            return;
        }
        if (!verifyPassword(username, password)) {
            showToast('Incorrect password', 'error');
            return;
        }
    } else {
        if (!newPassword) {
            showToast('Please set a password', 'error');
            return;
        }
        if (newPassword !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }
        if (!user) {
            addUser(username, newPassword, false);
        } else {
            resetUserPassword(username, newPassword);
        }
    }
    authState.currentUser = username;
    authState.isAdmin = getUser(username)?.isAdmin || false;
    state.currentUser = username;
    state.rememberMe = document.getElementById('rememberMe')?.checked ?? true;
    saveSettings();
    hideLoginModal();
    updateCurrentUserDisplay();
    document.getElementById('mainPanel').classList.remove('hidden');
    document.getElementById('tabNavigation').classList.remove('hidden');
    document.getElementById('globalUserHeader').classList.remove('hidden');
    document.getElementById('appContainer').classList.remove('no-header');
    initializeAfterLogin();
    showRandomQuote();
    const displayName = username ? username.charAt(0).toUpperCase() + username.slice(1) : username;
    showToast(`Welcome, ${displayName}!`, 'success');
    refreshStats();
}
function handleForgotPassword() {
    const select = document.getElementById('forgotPasswordUserSelect');
    const loginUser = document.getElementById('loginUserSelect').value;
    select.innerHTML = '<option value="">Select User...</option>';
    const users = getUsers();
    Object.keys(users).sort().forEach(username => {
        const option = document.createElement('option');
        option.value = username;
        option.textContent = username.charAt(0).toUpperCase() + username.slice(1);
        select.appendChild(option);
    });
    if (loginUser && users[loginUser]) {
        select.value = loginUser;
    }
    document.getElementById('forgotPasswordConfirm').value = '';
    document.getElementById('forgotPasswordNew').value = '';
    document.getElementById('forgotPasswordConfirmNew').value = '';
    document.getElementById('forgotPasswordModal').classList.remove('hidden');
}
function hideForgotPasswordModal() {
    document.getElementById('forgotPasswordModal').classList.add('hidden');
}
function handleForgotPasswordSubmit() {
    const username = document.getElementById('forgotPasswordUserSelect').value;
    const confirmText = document.getElementById('forgotPasswordConfirm').value.trim();
    const newPassword = document.getElementById('forgotPasswordNew').value;
    const confirmPassword = document.getElementById('forgotPasswordConfirmNew').value;
    
    if (!username) {
        showToast('Please select a user', 'error');
        return;
    }
    if (confirmText !== 'YES') {
        showToast('Please type YES in caps to confirm', 'error');
        return;
    }
    if (!newPassword) {
        showToast('Please enter a new password', 'error');
        return;
    }
    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    if (resetUserPassword(username, newPassword)) {
        showToast(`Password reset for ${username}. You can now log in.`, 'success');
        hideForgotPasswordModal();
    } else {
        showToast('Failed to reset password', 'error');
    }
}
function updateCurrentUserDisplay() {
    const display = document.getElementById('currentUserDisplay');
    if (display && authState.currentUser) {
        display.textContent = authState.currentUser.toUpperCase();
    }
    const headerName = document.getElementById('headerUserName');
    if (headerName && authState.currentUser) {
        headerName.textContent = authState.currentUser.charAt(0).toUpperCase() + authState.currentUser.slice(1);
    }
    loadUserAvatar();
    const settingsUserSelect = document.getElementById('settingsUserSelect');
    if (settingsUserSelect) {
        settingsUserSelect.value = authState.currentUser || '';
    }
    const adminSections = document.querySelectorAll('.admin-only');
    adminSections.forEach(el => {
        el.classList.toggle('hidden', !authState.isAdmin);
    });
    const exportBtn = document.getElementById('exportStatsBtn');
    if (exportBtn) {
        exportBtn.classList.toggle('hidden', !authState.isAdmin);
    }
    const adminSettingsSection = document.getElementById('adminSettingsSection');
    if (adminSettingsSection) {
        adminSettingsSection.classList.toggle('hidden', !authState.isAdmin);
    }
    updateQuoteFlagIcon();
    updateComplaintsBadge();
}
function loadUserAvatar() {
    try {
        const avatarEl = document.getElementById('headerAvatar');
        if (!avatarEl || !authState.currentUser) return;
        const user = getUser(authState.currentUser);
        if (user && user.avatar) {
            avatarEl.style.backgroundImage = `url('${user.avatar}')`;
            avatarEl.style.backgroundColor = 'transparent';
        } else {
            avatarEl.style.backgroundImage = '';
            avatarEl.style.backgroundColor = 'var(--bg-tertiary)';
        }
    } catch (e) {
        console.error('Error loading avatar:', e);
    }
}
function saveUserAvatar(dataUrl) {
    try {
        if (!authState.currentUser || !authState.config) return;
        const lowerName = authState.currentUser.toLowerCase();
        if (!authState.config.users[lowerName]) return;
        authState.config.users[lowerName].avatar = dataUrl;
        saveConfig();
        loadUserAvatar();
        showToast('Profile picture updated', 'success');
    } catch (e) {
        console.error('Error saving avatar:', e);
        showToast('Failed to save profile picture', 'error');
    }
}
function setupAvatarUpload() {
    const avatarWrap = document.querySelector('.user-avatar-wrap');
    const fileInput = document.getElementById('avatarUploadInput');
    if (!avatarWrap || !fileInput) return;
    
    avatarWrap.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(evt) {
            const img = new Image();
            img.onload = function() {
                // Resize to max 120x120 to keep config small
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const maxSize = 120;
                let w = img.width;
                let h = img.height;
                if (w > h && w > maxSize) {
                    h = Math.round(h * maxSize / w);
                    w = maxSize;
                } else if (h > maxSize) {
                    w = Math.round(w * maxSize / h);
                    h = maxSize;
                }
                canvas.width = w;
                canvas.height = h;
                ctx.drawImage(img, 0, 0, w, h);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
                saveUserAvatar(dataUrl);
            };
            img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
        fileInput.value = '';
    });
}
