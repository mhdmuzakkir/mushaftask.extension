/**
 * Mushaf Task Manager - Main JavaScript (Orchestrator)
 * CEP Extension for Adobe Illustrator
 * 
 * This file initializes all modules and wires up the application.
 * All functionality lives in js/modules/.
 */

function init() {
    console.log('init() called');
    try {
        setupEventListeners();
        setupKeyboardShortcuts();
        
        const settings = loadSettings();
        console.log('Settings loaded:', settings);
    
    // Load riwayah colors after tasks folder is set
    if (settings && settings.tasksFolder) {
        loadRiwayahColors();
    }
    
    // Ensure quotes folder structure exists in project folder
    ensureQuotesFolder();
    
    // Load and display a random quote
    loadQuotes();
    showRandomQuote();
    
    // Apply update mode on startup
    applyUpdateMode();
    updateModeButton();
    
    var versionChanged = false;
    var currentVersion = window.Updater ? window.Updater.CURRENT_VERSION : '2.1.0';

    if (!settings || !settings.tasksFolder) {
        console.log('No settings or tasksFolder, showing setup modal');
        document.getElementById('setupModal').classList.remove('hidden');
        document.getElementById('tabNavigation').classList.add('hidden');
    } else {
        console.log('Setup complete');

        // Check if extension was updated — force re-login for security
        if (state.lastSeenVersion && state.lastSeenVersion !== currentVersion) {
            console.log('Version changed from', state.lastSeenVersion, 'to', currentVersion, '- forcing re-login');
            versionChanged = true;
            state.currentUser = null;
            authState.currentUser = null;
            authState.isAdmin = false;
            state.rememberMe = false;
        }
        state.lastSeenVersion = currentVersion;
        saveSettings();

        if (loadMushafData()) {
            setupSurahControls();
        }
        initAuth();
        
        // Check if we should auto-login
        if (!versionChanged && state.rememberMe && state.currentUser && userExists(state.currentUser)) {
            console.log('Auto-logging in as:', state.currentUser);
            authState.currentUser = state.currentUser;
            authState.isAdmin = getUser(state.currentUser)?.isAdmin || false;
            
            // Hide login modal if it's showing
            hideLoginModal();
            
            document.getElementById('mainPanel').classList.remove('hidden');
            document.getElementById('tabNavigation').classList.remove('hidden');
            document.getElementById('globalUserHeader').classList.remove('hidden');
            document.getElementById('appContainer').classList.remove('no-header');
            updateCurrentUserDisplay();
            initializeAfterLogin(versionChanged);
            const displayUser = state.currentUser ? state.currentUser.charAt(0).toUpperCase() + state.currentUser.slice(1) : state.currentUser;
            showToast('Welcome back, ' + displayUser + '!', 'success');
        } else {
            showLoginModal(state.currentUser); // Pre-select last user if exists
        }
    }
    
    setupAutoRefresh();
    console.log('init() completed');
    
    // Silent update check after a short delay
    setTimeout(function() {
        if (window.Updater && typeof window.Updater.checkForUpdates === 'function') {
            window.Updater.checkForUpdates().then(function(result) {
                if (result.hasUpdate && result.isUserInstall) {
                    console.log('Update available:', result.remoteVersion);
                    // Show a subtle badge on the settings tab if update available
                    var settingsTabBtn = document.querySelector('.bottom-tab-btn[data-tab="settings"]');
                    if (settingsTabBtn && !settingsTabBtn.querySelector('.update-badge')) {
                        var badge = document.createElement('span');
                        badge.className = 'update-badge';
                        badge.style.cssText = 'position:absolute;top:2px;right:2px;width:8px;height:8px;background:var(--accent-green);border-radius:50%;';
                        settingsTabBtn.style.position = 'relative';
                        settingsTabBtn.appendChild(badge);
                    }
                }
            }).catch(function(e) {
                console.log('Silent update check failed:', e);
            });
        }
    }, 10000);
    
    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) refreshCurrentFileUI();
        });
    }
    } catch (e) {
        console.error('Error in init():', e);
    }
}

function initializeAfterLogin(versionChanged) {
    populateRiwayahDropdown();
    try {
        loadUserAssignments();
        populateInProgressRiwayahCheckboxes();
        setupUserFilterDropdown();
    } catch (e) {
        console.error('Error initializing user filters:', e);
    }
    // Show changelog if this is a new version
    if (versionChanged && typeof showChangelog === 'function') {
        var currentVersion = window.Updater ? window.Updater.CURRENT_VERSION : '2.1.0';
        setTimeout(function() {
            showChangelog(currentVersion);
        }, 800);
    }
    setupReviewQueuePolling();
    document.getElementById('reviewFilesList').innerHTML = '<p class="empty-state">Loading review queue...</p>';
    document.getElementById('inProgressFilesList').innerHTML = '<p class="empty-state">Loading in-progress files...</p>';
    refreshCurrentFileUI();
    setTimeout(() => refreshQueues(true), 0);
}

function initAuth() {
    document.getElementById('loginBtn')?.addEventListener('click', handleLogin);
    document.getElementById('forgotPasswordBtn')?.addEventListener('click', handleForgotPassword);
    document.getElementById('cancelForgotPassword')?.addEventListener('click', hideForgotPasswordModal);
    document.getElementById('submitForgotPassword')?.addEventListener('click', handleForgotPasswordSubmit);
    document.getElementById('loginPassword')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('switchUserBtn')?.addEventListener('click', () => {
        // Show full login UI
        document.getElementById('loginTitle').textContent = 'Login';
        document.getElementById('welcomeBackMsg').classList.add('hidden');
        document.getElementById('userSelectGroup').classList.remove('hidden');
        document.getElementById('switchUserLink').classList.add('hidden');
        document.getElementById('loginUserSelect').value = '';
        document.getElementById('passwordGroup').classList.remove('hidden');
        document.getElementById('setPasswordGroup').classList.add('hidden');
    });
    
    // Allow Enter key on password fields to login
    document.getElementById('newPassword')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('confirmPassword')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('addUserBtn')?.addEventListener('click', () => {
        showAddUserModal();
    });
    document.getElementById('cancelAddUser')?.addEventListener('click', hideAddUserModal);
    document.getElementById('saveNewUserBtn')?.addEventListener('click', handleAddUser);
    document.getElementById('resetPasswordBtn')?.addEventListener('click', () => {
        showResetPasswordModal();
    });
    document.getElementById('cancelResetPassword')?.addEventListener('click', hideResetPasswordModal);
    document.getElementById('confirmResetPassword')?.addEventListener('click', handleResetPassword);
    document.getElementById('userSettingsBtn')?.addEventListener('click', () => {
        showUserSettingsModal();
    });
    document.getElementById('cancelUserSettings')?.addEventListener('click', hideUserSettingsModal);
    document.getElementById('changePasswordBtn')?.addEventListener('click', () => {
        const newPassword = document.getElementById('changePasswordInput').value;
        if (!newPassword) {
            showToast('Please enter a new password', 'error');
            return;
        }
        if (changeOwnPassword(newPassword)) {
            showToast('Password changed successfully', 'success');
            document.getElementById('changePasswordInput').value = '';
        } else {
            showToast('Failed to change password', 'error');
        }
    });
    document.getElementById('myQuotesBtn')?.addEventListener('click', () => {
        openMyQuotesModal();
    });
    document.getElementById('closeMyQuotes')?.addEventListener('click', closeMyQuotesModal);
    document.getElementById('saveQuoteBtn')?.addEventListener('click', handleSaveQuote);
    document.getElementById('cancelQuoteEdit')?.addEventListener('click', resetQuoteForm);
    document.getElementById('quotesUpdateBtn')?.addEventListener('click', () => {
        showConfirm('This will merge all member quotes into the master quotes.json in the project folder. Continue?', function() {
            mergeAllQuotes();
        });
    });
    document.getElementById('reviewComplaintsBtn')?.addEventListener('click', () => {
        openReviewComplaintsModal();
    });
    document.getElementById('closeReviewComplaints')?.addEventListener('click', closeReviewComplaintsModal);
    document.getElementById('reportQuoteBtn')?.addEventListener('click', openReportQuoteModal);
    document.getElementById('cancelReportQuote')?.addEventListener('click', closeReportQuoteModal);
    document.getElementById('submitReportQuote')?.addEventListener('click', handleSubmitReportQuote);
    document.getElementById('editQuoteBtn')?.addEventListener('click', openEditQuoteModal);
    document.getElementById('cancelEditQuote')?.addEventListener('click', closeEditQuoteModal);
    document.getElementById('saveEditQuote')?.addEventListener('click', handleSaveQuoteEdit);
    document.getElementById('settingsUserSelect')?.addEventListener('change', (e) => {
        if (e.target.value && e.target.value !== authState.currentUser) {
            const selectedUser = e.target.value; // Store selected user
            authState.currentUser = null;
            authState.isAdmin = false;
            state.currentUser = null;
            saveSettings();
            switchTab('home');
            document.getElementById('mainPanel').classList.add('hidden');
            document.getElementById('tabNavigation').classList.add('hidden');
            showLoginModal(selectedUser); // Pass selected user to pre-select
        }
    });
    setupTabNavigation();
    setupNavigatePopup();
    document.getElementById('refreshStatsBtn')?.addEventListener('click', refreshStats);
    document.getElementById('exportStatsBtn')?.addEventListener('click', exportStatsToCSV);
    document.getElementById('statsFilter')?.addEventListener('change', refreshStats);
    document.getElementById('autoOpenNextPageCheckbox')?.addEventListener('change', (e) => {
        state.autoOpenNextPage = e.target.checked;
        saveSettings();
        showToast(state.autoOpenNextPage ? 'Auto-open enabled' : 'Auto-open disabled', 'info');
    });
    loadConfig();
    populateSettingsUserSelect();
    
    // Ensure activity folder exists for all users
    createActivityFilesForAllUsers();
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

