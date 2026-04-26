function setupEventListeners() {
    // Load riwayah colors
    loadRiwayahColors();
    
    // Setup collapsible sections
    setupCollapsibleSections();
    
    // In Progress refresh button
    document.getElementById('refreshInProgressBtn')?.addEventListener('click', () => {
        loadInProgressFiles();
        showToast('In Progress queue refreshed', 'info');
    });
    
    // In Progress filters
    loadUserAssignments();
    populateInProgressRiwayahCheckboxes();
    setupUserFilterDropdown();
    
    // Riwayah checkboxes event handlers are set up in populateInProgressRiwayahCheckboxes
    
    // Load saved filters
    loadInProgressFilters();
    
    // Navigation buttons
    document.getElementById('prevPageBtn')?.addEventListener('click', goToPreviousPage);
    document.getElementById('nextPageBtn')?.addEventListener('click', goToNextPage);
    
    // Batch Export
    document.getElementById('batchExportBtn')?.addEventListener('click', () => {
        populateExportRiwayahDropdown();
        document.getElementById('batchExportModal').classList.remove('hidden');
    });
    
    document.getElementById('cancelExportBtn')?.addEventListener('click', () => {
        document.getElementById('batchExportModal').classList.add('hidden');
        state.isExporting = false;
    });
    
    document.getElementById('startExportBtn')?.addEventListener('click', startBatchExport);
    
    document.getElementById('exportBrowseBtn')?.addEventListener('click', () => {
        browseFolder((folder) => {
            document.getElementById('exportLocation').value = folder;
        });
    });
    
    // Multi-Select (Review Queue)
    document.getElementById('toggleMultiSelectBtn')?.addEventListener('click', toggleMultiSelectMode);
    document.getElementById('closeMultiSelectBtn')?.addEventListener('click', toggleMultiSelectMode);
    document.getElementById('selectRangeBtn')?.addEventListener('click', selectAllInRange);
    document.getElementById('clearSelectionBtn')?.addEventListener('click', clearSelection);
    document.getElementById('bulkMoveCompletedBtn')?.addEventListener('click', bulkMoveToCompleted);
    document.getElementById('selectAllInRiwayahBtn')?.addEventListener('click', selectAllInRange);
    
    // Multi-Select (In Progress)
    document.getElementById('toggleInProgressMultiSelectBtn')?.addEventListener('click', toggleInProgressMultiSelectMode);
    document.getElementById('closeInProgressMultiSelectBtn')?.addEventListener('click', toggleInProgressMultiSelectMode);
    document.getElementById('selectInProgressRangeBtn')?.addEventListener('click', selectAllInProgressInRange);
    document.getElementById('clearInProgressSelectionBtn')?.addEventListener('click', clearInProgressSelection);
    document.getElementById('bulkMoveInProgressCompletedBtn')?.addEventListener('click', bulkMoveInProgressToCompleted);
    document.getElementById('selectAllInProgressRiwayahBtn')?.addEventListener('click', selectAllInProgressInRange);
    
    // Color picker preview
    document.getElementById('newRiwayahColor')?.addEventListener('input', (e) => {
        document.getElementById('colorPreview').style.backgroundColor = e.target.value;
    });
    
    document.getElementById('browseBtn')?.addEventListener('click', () => {
        browseFolder((folder) => {
            document.getElementById('folderPath').value = folder;
        });
    });
    
    document.getElementById('setupProjectBrowseBtn')?.addEventListener('click', () => {
        browseFolder((folder) => {
            document.getElementById('setupProjectPath').value = folder;
        });
    });
    
    document.getElementById('saveSetupBtn')?.addEventListener('click', () => {
        const folder = document.getElementById('folderPath').value;
        const projectFolder = document.getElementById('setupProjectPath').value;
        if (!folder) {
            showToast('Please select a tasks folder', 'error');
            return;
        }
        if (!projectFolder) {
            showToast('Please select a project folder (Mushaf Files)', 'error');
            return;
        }
        state.tasksFolder = folder;
        state.projectFolder = projectFolder;
        saveSettings();
        loadRiwayahColors(); // Load colors after folder is set
        ensureQuotesFolder(); // Create quotes folder structure on first run
        document.getElementById('setupModal').classList.add('hidden');
        console.log('Setup saved. Tasks:', folder, 'Project:', projectFolder);
        
        // Initialize auth and show login (pre-select last user if any)
        if (loadMushafData()) {
            setupSurahControls();
        }
        initAuth();
        showLoginModal(state.currentUser);
    });
    
    document.getElementById('settingsBrowseBtn')?.addEventListener('click', () => {
        console.log('settingsBrowseBtn clicked');
        browseFolder((folder) => {
            console.log('settingsBrowseFolder selected:', folder);
            document.getElementById('settingsFolderPath').value = folder;
        });
    });
    
    document.getElementById('projectBrowseBtn')?.addEventListener('click', () => {
        console.log('projectBrowseBtn clicked');
        browseFolder((folder) => {
            console.log('projectBrowseFolder selected:', folder);
            document.getElementById('settingsProjectPath').value = folder;
        });
    });
    
    document.getElementById('closeSettings')?.addEventListener('click', () => {
        switchTab('home');
    });
    
    document.getElementById('saveSettings')?.addEventListener('click', () => {
        const newTasksFolder = document.getElementById('settingsFolderPath').value;
        const newProjectFolder = document.getElementById('settingsProjectPath').value;
        
        // Check if tasks folder changed
        const folderChanged = newTasksFolder !== state.tasksFolder;
        
        state.tasksFolder = newTasksFolder;
        state.projectFolder = newProjectFolder;
        saveSettings();
        ensureQuotesFolder(); // Create quotes folder structure if needed
        loadQuotes(); // Reload quotes from new project folder path
        loadRiwayahColors(); // Reload colors
        console.log('Settings saved');
        
        populateRiwayahDropdown();
        
        // Initialize In Progress filters
        loadUserAssignments();
        populateInProgressRiwayahCheckboxes();
        setupUserFilterDropdown()
        
        // If folder changed, reload config
        if (folderChanged) {
            loadConfig();
            populateSettingsUserSelect();
        }
        
        setupReviewQueuePolling();
        
        // Show loading placeholders for queues and paint UI immediately
        document.getElementById('reviewFilesList').innerHTML = '<p class="empty-state">Loading review queue...</p>';
        document.getElementById('inProgressFilesList').innerHTML = '<p class="empty-state">Loading in-progress files...</p>';
        
        refreshCurrentFileUI();
        setTimeout(() => refreshQueues(true), 0);
    });
    
    document.getElementById('submitPageTasksBtn')?.addEventListener('click', submitPageTasks);
    
    document.getElementById('newRiwayahBtn')?.addEventListener('click', () => {
        const select = document.getElementById('sourceRiwayah');
        select.innerHTML = '';
        
        try {
            if (state.tasksFolder && fs.existsSync(state.tasksFolder)) {
                const riwayahTasksPath = path.join(state.tasksFolder, 'riwayah-tasks');
                if (!fs.existsSync(riwayahTasksPath)) return;
                const riwayahs = fs.readdirSync(riwayahTasksPath, { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => dirent.name);

                riwayahs.forEach(r => {
                    const option = document.createElement('option');
                    option.value = r;
                    option.textContent = r;
                    select.appendChild(option);
                });
            }
        } catch (e) {
            console.error('Error loading riwayahs:', e);
        }
        
        document.getElementById('newRiwayahModal').classList.remove('hidden');
    });
    
    document.getElementById('duplicateFromExisting')?.addEventListener('change', (e) => {
        document.getElementById('sourceRiwayahGroup').classList.toggle('hidden', !e.target.checked);
        document.getElementById('newRiwayahTasks').disabled = e.target.checked;
    });
    
    document.getElementById('cancelNewRiwayah')?.addEventListener('click', () => {
        document.getElementById('newRiwayahModal').classList.add('hidden');
        document.getElementById('newRiwayahName').value = '';
        document.getElementById('newRiwayahTasks').value = '';
        document.getElementById('duplicateFromExisting').checked = false;
        document.getElementById('sourceRiwayahGroup').classList.add('hidden');
        document.getElementById('newRiwayahColor').value = '#9b59b6';
        document.getElementById('colorPreview').style.backgroundColor = '#9b59b6';
    });
    
    document.getElementById('createRiwayahBtn')?.addEventListener('click', () => {
        const name = document.getElementById('newRiwayahName').value.trim();
        if (!name) {
            console.log('Please enter a riwayah name');
            return;
        }
        
        const duplicateFrom = document.getElementById('duplicateFromExisting').checked 
            ? document.getElementById('sourceRiwayah').value 
            : null;
        
        const color = document.getElementById('newRiwayahColor').value;
        
        const tasksText = document.getElementById('newRiwayahTasks').value;
        const tasks = tasksText.split('\n').filter(t => t.trim());
        
        if (createRiwayah(name, tasks, duplicateFrom, color)) {
            document.getElementById('newRiwayahModal').classList.add('hidden');
            document.getElementById('newRiwayahName').value = '';
            document.getElementById('newRiwayahTasks').value = '';
            document.getElementById('newRiwayahColor').value = '#9b59b6';
            document.getElementById('colorPreview').style.backgroundColor = '#9b59b6';
            populateRiwayahDropdown();
        }
    });
    
    // Edit Riwayah Modal
    document.getElementById('editRiwayahBtn')?.addEventListener('click', () => {
        showEditRiwayahModal();
    });
    document.getElementById('cancelEditRiwayah')?.addEventListener('click', hideEditRiwayahModal);
    document.getElementById('saveEditRiwayahBtn')?.addEventListener('click', handleEditRiwayahSave);
    document.getElementById('editRiwayahSelect')?.addEventListener('change', (e) => {
        const riwayah = e.target.value;
        if (riwayah) {
            const info = getRiwayahInfo(riwayah);
            document.getElementById('editRiwayahArabicName').value = info.arabicName;
            document.getElementById('editRiwayahColor').value = info.color;
            document.getElementById('editColorPreview').style.backgroundColor = info.color;
        }
    });
    document.getElementById('editRiwayahColor')?.addEventListener('input', (e) => {
        document.getElementById('editColorPreview').style.backgroundColor = e.target.value;
    });
    
    document.getElementById('addTaskBtn')?.addEventListener('click', () => {
        if (!state.currentRiwayah || !state.currentPage) {
            console.log('Open a Mushaf file first');
            return;
        }
        if (isPageCompleted(state.currentRiwayah, state.currentPage)) {
            console.log('Cannot add tasks to completed page');
            return;
        }
        document.getElementById('addTaskModal').classList.remove('hidden');
    });
    
    document.getElementById('cancelAddTask')?.addEventListener('click', () => {
        document.getElementById('addTaskModal').classList.add('hidden');
        document.getElementById('newTaskTitle').value = '';
        document.getElementById('newTaskDescription').value = '';
        document.getElementById('newTaskAssigned').value = '';
    });
    
    document.getElementById('saveTaskBtn')?.addEventListener('click', () => {
        const title = document.getElementById('newTaskTitle').value.trim();
        if (!title) {
            console.log('Enter task title');
            return;
        }
        
        const newTask = {
            id: generateId('ptask'),
            title: title,
            description: document.getElementById('newTaskDescription').value.trim(),
            completed: false,
            assigned: document.getElementById('newTaskAssigned').value.trim(),
            source: 'panel',
            created: new Date().toISOString()
        };
        
        state.pageTasks.push(newTask);
        savePageData(state.currentRiwayah, state.currentPage, state.pageTasks, state.pageProjectCompletions);
        invalidateQueueCache();
        
        renderTaskList('pageTasks', state.pageTasks, true, false);
        updateProgress();
        
        document.getElementById('addTaskModal').classList.add('hidden');
        document.getElementById('newTaskTitle').value = '';
        document.getElementById('newTaskDescription').value = '';
        document.getElementById('newTaskAssigned').value = '';
        
        console.log('Task added successfully');
    });
    
    document.getElementById('refreshBtn')?.addEventListener('click', () => {
        refreshUI();
        showRandomQuote();
        console.log('Updated');
    });
    document.getElementById('headerRefreshBtn')?.addEventListener('click', () => {
        refreshUI();
        showRandomQuote();
        console.log('Updated');
    });
    
    function doLogout() {
        // Clear session
        authState.currentUser = null;
        authState.isAdmin = false;
        state.currentUser = null;
        state.rememberMe = false; // Don't auto-login next time
        saveSettings();
        
        // Randomize quote on logout
        showRandomQuote();
        
        // Hide main UI
        document.getElementById('mainPanel').classList.add('hidden');
        document.getElementById('tabNavigation').classList.add('hidden');
        document.getElementById('globalUserHeader').classList.add('hidden');
        document.getElementById('appContainer').classList.add('no-header');
        
        // Show login
        showLoginModal();
    }
    
    document.getElementById('logoutBtn')?.addEventListener('click', doLogout);
    document.getElementById('headerLogoutBtn')?.addEventListener('click', doLogout);
    
    // 3-Mode Update System Toggle
    document.getElementById('updateModeBtn')?.addEventListener('click', cycleUpdateMode);
    
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            if (mode) setUpdateMode(mode);
        });
    });
    
    document.getElementById('closePageBtn')?.addEventListener('click', () => closePage(false));
    document.getElementById('saveClosePageBtn')?.addEventListener('click', () => closePage(true));

    const riwayahSelect = document.getElementById('riwayahSelect');
    if (riwayahSelect) {
        riwayahSelect.addEventListener('change', handleRiwayahChange);
    }
    
    const goBtn = document.getElementById('goPageBtn');
    if (goBtn) {
        goBtn.addEventListener('click', handlePageSubmit);
    }
    
    const goToInput = document.getElementById('goToPageInput');
    if (goToInput) {
        goToInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handlePageSubmit();
            }
        });
        goToInput.addEventListener('input', (e) => {
            if (e.target.value) {
                const surahInput = document.getElementById('goToSurahInput');
                const surahSelect = document.getElementById('goToSurahSelect');
                
                if (surahInput) surahInput.value = '';
                if (surahSelect) surahSelect.value = '';
                populateAyahDropdown(null);
            }
        });
    }
    
    const surahSelect = document.getElementById('goToSurahSelect');
    const ayahSelect = document.getElementById('goToAyahSelect');
    const surahInput = document.getElementById('goToSurahInput');
    const ayahInput = document.getElementById('goToAyahInput');
    
    if (surahSelect) {
        surahSelect.addEventListener('change', (e) => {
            const surahNumber = e.target.value;
            populateAyahDropdown(surahNumber);
            
            if (surahNumber) {
                document.getElementById('goToPageInput').value = '';
            }
        });
    }
    
    // Enter key on Surah input -> focus Ayah input
    if (surahInput) {
        surahInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (ayahInput) {
                    ayahInput.focus();
                    ayahInput.select();
                }
            }
        });
    }
    
    // Enter key on Ayah input -> submit/go to page
    if (ayahInput) {
        ayahInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handlePageSubmit();
            }
        });
    }
    
    setupAvatarUpload();
    setupUpdaterEvents();
}

function setupUpdaterEvents() {
    var checkBtn = document.getElementById('checkUpdateBtn');
    var installBtn = document.getElementById('installUpdateBtn');
    var statusText = document.getElementById('updateStatusText');
    var versionDisplay = document.getElementById('currentVersionDisplay');
    var progressContainer = document.getElementById('updateProgressContainer');
    var progressFill = document.getElementById('updateProgressFill');
    var progressText = document.getElementById('updateProgressText');

    if (versionDisplay) {
        versionDisplay.textContent = window.Updater ? window.Updater.CURRENT_VERSION : '1.0.0';
    }

    if (checkBtn) {
        checkBtn.addEventListener('click', function() {
            if (!window.Updater) return;
            if (statusText) statusText.textContent = 'Checking for updates...';
            checkBtn.disabled = true;
            window.Updater.checkForUpdates().then(function(result) {
                checkBtn.disabled = false;
                if (result.error) {
                    if (statusText) {
                        var msg = result.error;
                        if (msg.indexOf('Firewall') !== -1 || msg.indexOf('manually') !== -1) {
                            statusText.innerHTML = '<span style="color: var(--accent-orange);">' + escapeHtml(msg) + '</span>';
                        } else {
                            statusText.textContent = 'Check failed: ' + msg;
                        }
                    }
                    return;
                }
                if (result.hasUpdate) {
                    var updateHtml = 'Update available: <strong>' + result.remoteVersion + '</strong> (current: ' + result.currentVersion + ')';
                    if (result.fromCache) {
                        updateHtml += '<br><span style="color: var(--accent-orange); font-size: 11px;">(Using cached result. Run check-update.bat manually for the freshest info.)</span>';
                    }
                    if (statusText) statusText.innerHTML = updateHtml;
                    if (!result.isUserInstall) {
                        if (statusText) {
                            statusText.innerHTML += '<br><span style="color: var(--accent-orange);">Extension is in Program Files. Use the installer batch file as Administrator.</span>';
                        }
                        installBtn.classList.add('hidden');
                    } else {
                        installBtn.classList.remove('hidden');
                    }
                } else {
                    var latestMsg = 'You are on the latest version (' + result.currentVersion + ').';
                    if (result.fromCache) {
                        latestMsg += ' (Cached result)';
                    }
                    if (statusText) statusText.textContent = latestMsg;
                    installBtn.classList.add('hidden');
                }
            });
        });
    }

    if (installBtn) {
        installBtn.addEventListener('click', function() {
            if (!window.Updater) return;
            if (confirm('This will download and install the latest update. Illustrator should be restarted afterwards. Continue?')) {
                installBtn.disabled = true;
                progressContainer.classList.remove('hidden');
                window.Updater.installUpdate(function(evt) {
                    if (progressFill) progressFill.style.width = evt.percent + '%';
                    if (progressText) progressText.textContent = evt.stage + ' ' + evt.percent + '%';
                }).then(function(result) {
                    if (statusText) {
                        statusText.innerHTML = '<span style="color: var(--accent-green);">Update installed successfully! Please restart Illustrator.</span>';
                    }
                    progressContainer.classList.add('hidden');
                    installBtn.classList.add('hidden');
                    showToast('Update installed. Restart Illustrator to apply.', 'success');
                }).catch(function(err) {
                    if (statusText) {
                        statusText.innerHTML = '<span style="color: var(--accent-red);">Update failed: ' + escapeHtml(err.message) + '</span>';
                    }
                    progressContainer.classList.add('hidden');
                    installBtn.disabled = false;
                    showToast('Update failed: ' + err.message, 'error');
                });
            }
        });
    }
}
