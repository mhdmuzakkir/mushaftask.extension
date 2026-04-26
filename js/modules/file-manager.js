function moveToCompleted() {
    if (!state.currentRiwayah || !state.currentPage) {
        console.log('No file open');
        return;
    }
    
    if (isPageCompleted(state.currentRiwayah, state.currentPage)) {
        console.log('Page is already completed - closing file');
        closePage(true);
        return;
    }
    
    if (!state.projectFolder) {
        console.log('Project folder not configured');
        return;
    }
    
    showLoading(true);
    
    if (typeof CSInterface !== 'undefined') {
        var csInterface = new CSInterface();
        
        csInterface.evalScript('saveActiveDocument()', function(saveResult) {
            console.log('Save result:', saveResult);
            
            if (saveResult === 'saved' || saveResult === 'null') {
                proceedWithMove();
            } else {
                console.log('Error saving document: ' + saveResult);
                showLoading(false);
            }
        });
    } else {
        proceedWithMove();
    }
    
    function proceedWithMove() {
        // FIX: Always create pt-completed.json before moving so file clears from review queue
        if (!isPageTasksCompleted(state.currentRiwayah, state.currentPage)) {
            createPageTasksCompletedJson(state.currentRiwayah, state.currentPage);
        }
        
        try {
            const juz = state.currentJuz.toString().padStart(2, '0');
            const riwayah = state.currentRiwayah;
            const page = state.currentPage;
            
            const ajzaSourceFile = path.join(state.projectFolder, riwayah, 'Ajza', juz, `${page}-${riwayah}.ai`);
            const reviewSourceFile = path.join(state.projectFolder, riwayah, 'Review Task', `${page}-${riwayah}.ai`);
            const completedSourceFile = path.join(state.projectFolder, riwayah, 'Completed', 'Ajza', juz, `${page}-${riwayah}.ai`);
            
            const destFolder = path.join(state.projectFolder, riwayah, 'Completed', 'Ajza', juz);
            const destFile = path.join(destFolder, `${page}-${riwayah}.ai`);
            
            let sourceFile = null;
            let sourceLocation = '';
            
            if (fs.existsSync(ajzaSourceFile)) {
                sourceFile = ajzaSourceFile;
                sourceLocation = 'Ajza';
            } else if (fs.existsSync(reviewSourceFile)) {
                sourceFile = reviewSourceFile;
                sourceLocation = 'Review Task';
            } else if (fs.existsSync(completedSourceFile)) {
                console.log('File already in Completed folder - closing');
                closeDocumentAndReset('Completed');
                return;
            }
            
            // FIX: File existence validation
            if (!sourceFile || !fs.existsSync(sourceFile)) {
                console.error('Source file not found:', sourceFile);
                refreshUI();
                showLoading(false);
                return;
            }
            
            if (!fs.existsSync(destFolder)) {
                fs.mkdirSync(destFolder, { recursive: true });
            }
            
            if (fs.existsSync(destFile)) {
                console.log('File already exists in Completed - closing');
                closeDocumentAndReset('Completed');
                return;
            }
            
            fs.renameSync(sourceFile, destFile);
            closeDocumentAndReset(sourceLocation);
            
        } catch (e) {
            console.error('Error moving file:', e);
            console.log('Failed to move file: ' + e.message);
            showLoading(false);
        }
    }
    
    function closeDocumentAndReset(sourceLocation) {
        if (typeof CSInterface !== 'undefined') {
            var csInterface = new CSInterface();
            csInterface.evalScript('closeActiveDocumentNoSave()', function(result) {
                if (sourceLocation) {
                    console.log(`Closed page ${state.currentPage} (${sourceLocation})`);
                }
                resetState();
            });
        } else {
            if (sourceLocation) {
                console.log(`Closed page ${state.currentPage}`);
            }
            resetState();
        }
    }
    
    function resetState() {
        const source = state.fileSource;
        const movedPage = state.currentPage;
        const movedRiwayah = state.currentRiwayah;
        state.currentRiwayah = null;
        state.currentPage = null;
        state.currentJuz = null;
        state.projectTasks = [];
        state.pageTasks = [];
        state.pageProjectCompletions = [];
        state.completedJsonCreated = false;
        state.fileSource = null;
        updateNavButtonsState();
        invalidateQueueCache();
        // Log activity for completed page
        if (movedPage && movedRiwayah && authState.currentUser) {
            logActivity('move_to_completed', {
                file: `${movedPage}-${movedRiwayah}.ai`,
                riwayah: movedRiwayah,
                pageNumber: parseInt(movedPage, 10)
            });
        }
        refreshUI();
        showLoading(false);
        
        // Auto-open next file from queue if setting is enabled
        if (state.autoOpenNextPage && source) {
            setTimeout(() => maybeAutoOpenNextFile(source), 500);
        }
    }
}
function maybeAutoOpenNextFile(source) {
    try {
        if (source === 'review') {
            // Refresh review queue and open the first file
            const container = document.getElementById('reviewFilesList');
            if (!container) return;
            const firstItem = container.querySelector('.review-file-item');
            if (firstItem) {
                firstItem.click();
                showToast('Opened next file from Review queue', 'success');
            } else {
                showToast('No more files in Review queue', 'info');
            }
        } else if (source === 'inProgress') {
            // Refresh in-progress queue and open the first file
            const container = document.getElementById('inProgressFilesList');
            if (!container) return;
            const firstItem = container.querySelector('.in-progress-file-item');
            if (firstItem) {
                firstItem.click();
                showToast('Opened next file from In Progress', 'success');
            } else {
                showToast('No more files in In Progress', 'info');
            }
        }
    } catch (e) {
        console.error('Error auto-opening next file:', e);
    }
}
function closePage(saveFirst = false) {
    if (!state.currentRiwayah || !state.currentPage) {
        console.log('No file is currently open');
        return;
    }

    if (typeof CSInterface === 'undefined') {
        console.log('Extension not ready');
        return;
    }

    const csInterface = new CSInterface();

    if (saveFirst) {
        showLoading(true);
        csInterface.evalScript('saveActiveDocument()', function(saveResult) {
            showLoading(false);
            if (saveResult === 'saved' || saveResult === 'null') {
                proceedToClose();
            } else {
                console.log('Error saving document: ' + saveResult);
            }
        });
    } else {
        proceedToClose();
    }

    function proceedToClose() {
        csInterface.evalScript('closeActiveDocumentNoSave()', function(result) {
            if (result === 'success' || result === 'null') {
                console.log(`Closed page ${state.currentPage}`);
                resetStateAfterClose();
            } else {
                console.log('Error closing document: ' + result);
            }
        });
    }
}
function resetStateAfterClose() {
    state.currentRiwayah = null;
    state.currentPage = null;
    state.currentJuz = null;
    state.projectTasks = [];
    state.pageTasks = [];
    state.pageProjectCompletions = [];
    state.completedJsonCreated = false;
    state.lastDocName = '';
    state.fileSource = null;
    updateNavButtonsState();
    refreshUI();
}
function updateCloseButtonsState() {
    const closeBtn = document.getElementById('closePageBtn');
    const saveCloseBtn = document.getElementById('saveClosePageBtn');

    const hasFileOpen = !!state.currentPage;

    if (closeBtn) closeBtn.disabled = !hasFileOpen;
    if (saveCloseBtn) saveCloseBtn.disabled = !hasFileOpen;
}
function createRiwayah(name, tasks, duplicateFrom = null, color = '#9b59b6') {
    try {
        showLoading(true);
    
        // Save riwayah info (new object format)
        state.riwayahColors[name] = { color: color, arabicName: '' };
        saveRiwayahColors();
        
        fs.mkdirSync(path.join(state.tasksFolder, 'riwayah-tasks', name), { recursive: true });
        fs.mkdirSync(path.join(state.tasksFolder, 'page-tasks', name), { recursive: true });
        fs.mkdirSync(path.join(state.tasksFolder, 'completed', name), { recursive: true });
        fs.mkdirSync(path.join(state.tasksFolder, 'pt-completed', name), { recursive: true });
        fs.mkdirSync(path.join(state.tasksFolder, 'review-queue', name), { recursive: true });
        
        let taskList = [];
        if (duplicateFrom) {
            taskList = loadRiwayahTasks(duplicateFrom);
        } else if (tasks && tasks.length > 0) {
            taskList = tasks.map((title, index) => ({
                id: generateId('task'),
                title: title,
                completed: false,
                assigned: '',
                description: ''
            }));
        }
        
        saveRiwayahTasks(name, taskList);
        
        if (state.projectFolder) {
            const riwayahProjectPath = path.join(state.projectFolder, name);
            
            const ajzaPath = path.join(riwayahProjectPath, 'Ajza');
            for (let i = 1; i <= 30; i++) {
                const folderName = i.toString().padStart(2, '0');
                fs.mkdirSync(path.join(ajzaPath, folderName), { recursive: true });
            }
            
            fs.mkdirSync(path.join(riwayahProjectPath, 'Review Task'), { recursive: true });
            
            const completedAjzaPath = path.join(riwayahProjectPath, 'Completed', 'Ajza');
            for (let i = 1; i <= 30; i++) {
                const folderName = i.toString().padStart(2, '0');
                fs.mkdirSync(path.join(completedAjzaPath, folderName), { recursive: true });
            }
        }
        
        console.log(`Successfully created riwayah "${name}"`);
        showLoading(false);
        return true;
    } catch (e) {
        console.error('Error creating riwayah:', e);
        console.log('Failed to create riwayah: ' + e.message);
        showLoading(false);
        return false;
    }
}
function findAndOpenFile(riwayah, pageNum) {
    if (!state.projectFolder) {
        console.log('Project folder not configured');
        return;
    }
    
    const juz = getJuzFromPage(pageNum);
    const paddedPage = pageNum.toString().padStart(3, '0');
    const fileName = `${paddedPage}-${riwayah}.ai`;
    const juzFolder = juz.toString().padStart(2, '0');
    
    const locations = [
        {
            path: path.join(state.projectFolder, riwayah, 'Review Task', fileName),
            label: 'Review Task',
            status: 'review',
            display: 'Review Task'
        },
        {
            path: path.join(state.projectFolder, riwayah, 'Ajza', juzFolder, fileName),
            label: `Ajza/${juzFolder}`,
            status: 'in-progress',
            display: `Ajza/${juzFolder}`
        },
        {
            path: path.join(state.projectFolder, riwayah, 'Completed', 'Ajza', juzFolder, fileName),
            label: `Completed/Ajza/${juzFolder}`,
            status: 'completed',
            display: `Completed/Ajza/${juzFolder}`
        }
    ];
    
    const found = locations.find(loc => fs.existsSync(loc.path));
    
    if (!found) {
        console.log(`File ${fileName} not found in any location`);
        return;
    }
    
    state.currentRiwayah = riwayah;
    state.currentPage = paddedPage;
    state.currentJuz = juz;
    state.lastDocName = fileName;
    
    updateLocationDisplay(found.label, found.status, found.display);
    
    if (typeof CSInterface !== 'undefined') {
        console.log(`Opening ${fileName}...`);
        const csInterface = new CSInterface();
        const escapedPath = found.path.replace(/\\/g, '\\\\');
        
        csInterface.evalScript('openDocument("' + escapedPath + '")', function(result) {
            if (result === 'success') {
                console.log(`Opened from ${found.label}`);
                updateNavButtonsState();
                setTimeout(() => {
                    loadPageTasksForCurrent();
                }, 500);
            } else {
                console.log('Failed to open file');
                showToast('Failed to open file', 'error');
            }
        });
    } else {
        console.log('Extension not ready');
    }
}
