function updateProgress() {
    const mergedProjectTasks = state.projectTasks.map(task => ({
        ...task,
        completed: state.pageProjectCompletions.includes(task.id)
    }));
    
    const allTasks = [...mergedProjectTasks, ...state.pageTasks];
    const total = allTasks.length;
    const completed = allTasks.filter(t => t.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    document.getElementById('progressFill').style.width = `${percentage}%`;
    document.getElementById('progressText').textContent = `${percentage}%`;
    
    updatePageTasksSubmitButton();
}
function renderTaskList(containerId, tasks, isPageTask = false, showCompleteAll = false) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    const isFileDone = isPageCompleted(state.currentRiwayah, state.currentPage);
    
    if (showCompleteAll && tasks.length > 0 && !isPageTask && !isFileDone) {
        const allCompleted = tasks.every(t => t.completed);
        const completeAllBtn = document.createElement('button');
        completeAllBtn.className = 'btn-complete-all';
        completeAllBtn.textContent = allCompleted ? 'Uncheck All' : 'Complete All';
        completeAllBtn.id = 'completeAllBtn';
        
        completeAllBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            toggleCompleteAll(false);
        });
        
        container.appendChild(completeAllBtn);
    }
    
    if (tasks.length === 0) {
        container.innerHTML += '<p class="empty-state">No tasks</p>';
        return;
    }
    
    tasks.forEach((task, index) => {
        const taskDiv = document.createElement('div');
        taskDiv.className = `task-item ${task.completed ? 'completed' : ''}`;
        taskDiv.dataset.index = index;
        taskDiv.dataset.ispage = isPageTask;
        taskDiv.dataset.taskid = task.id;
        
        const titleClass = containsArabic(task.title) ? 'task-title arabic-text' : 'task-title';
        const descClass = containsArabic(task.description) ? 'task-description arabic-text' : 'task-description';
        
        taskDiv.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} ${isFileDone ? 'disabled' : ''}>
            <div class="task-content">
                <div class="${titleClass}">${escapeHtml(task.title)}</div>
                ${task.assigned ? `<div class="task-meta">Assigned: ${escapeHtml(task.assigned)}</div>` : ''}
                ${task.description ? `<div class="${descClass}">${escapeHtml(task.description)}</div>` : ''}
            </div>
            ${task.description ? `<button class="task-toggle">&#9662;</button>` : ''}
        `;
        
        if (!isFileDone) {
            taskDiv.addEventListener('click', function(e) {
                if (e.target.classList.contains('task-checkbox') || 
                    e.target.classList.contains('task-toggle')) {
                    return;
                }
                
                const checkbox = this.querySelector('.task-checkbox');
                checkbox.checked = !checkbox.checked;
                handleTaskToggle(index, isPageTask, task.id, checkbox.checked, this);
            });
            
            const checkbox = taskDiv.querySelector('.task-checkbox');
            checkbox.addEventListener('change', function(e) {
                e.stopPropagation();
                handleTaskToggle(index, isPageTask, task.id, this.checked, taskDiv);
            });
            
            const toggleBtn = taskDiv.querySelector('.task-toggle');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    taskDiv.classList.toggle('expanded');
                    this.innerHTML = taskDiv.classList.contains('expanded') ? '&#9652;' : '&#9662;';
                });
            }
        }
        
        container.appendChild(taskDiv);
    });
}
function containsArabic(text) {
    if (!text) return false;
    return /[\u0600-\u06FF]/.test(text);
}
function populateRiwayahDropdown() {
    const selects = [document.getElementById('riwayahSelect'), document.getElementById('goToRiwayahSelect')];
    if (!state.tasksFolder) return;
    
    const currentSelection = selects[0] ? selects[0].value : '';
    
    selects.forEach(select => {
        if (!select) return;
        while (select.options.length > 1) {
            select.remove(1);
        }
    });
    
    try {
        if (fs.existsSync(state.tasksFolder)) {
           const riwayahTasksPath = path.join(state.tasksFolder, 'riwayah-tasks');
            if (!fs.existsSync(riwayahTasksPath)) return;
            const riwayahs = fs.readdirSync(riwayahTasksPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name)
            
            selects.forEach(select => {
                if (!select) return;
                riwayahs.forEach(riwayah => {
                    const option = document.createElement('option');
                    option.value = riwayah;
                    option.textContent = getRiwayahDisplayName(riwayah);
                    select.appendChild(option);
                });
            });
        }
    } catch (e) {
        console.error('Error loading riwayahs:', e);
    }
    
    if (state.lastSelectedRiwayah && !state.currentRiwayah) {
        selects.forEach(select => {
            if (select) select.value = state.lastSelectedRiwayah;
        });
        state.currentRiwayah = state.lastSelectedRiwayah;
    } else if (currentSelection) {
        selects.forEach(select => {
            if (select) select.value = currentSelection;
        });
    }
    
    updateRiwayahStatusBadge(state.currentRiwayah);
}
function handleRiwayahChange(e) {
    const selectedRiwayah = e.target.value;
    if (!selectedRiwayah) return;
    
    state.currentRiwayah = selectedRiwayah;
    state.lastSelectedRiwayah = selectedRiwayah;
    saveSettings();
    state.projectTasks = loadRiwayahTasks(selectedRiwayah);
    updateRiwayahStatusBadge(selectedRiwayah);
    
    console.log(`Selected ${selectedRiwayah}. Type a page number and click Go to open.`);
}

function updateRiwayahStatusBadge(riwayah) {
    const badge = document.getElementById('riwayahStatusBadge');
    if (!badge) return;
    if (!riwayah) {
        badge.classList.add('hidden');
        return;
    }
    const status = getRiwayahStatus(riwayah);
    badge.textContent = status;
    badge.className = 'riwayah-status-badge status-' + status;
    badge.classList.remove('hidden');
}
function handlePageSubmit() {
    const goToInput = document.getElementById('goToPageInput');
    const surahInput = document.getElementById('goToSurahInput');
    const ayahInput = document.getElementById('goToAyahInput');
    const ayahSelect = document.getElementById('goToAyahSelect');
    
    let page = null;
    let surah = null;
    let ayah = null;
    
    if (surahInput && surahInput.value) {
        surah = parseInt(surahInput.value);
        // Prefer input value, fall back to select
        ayah = ayahInput && ayahInput.value ? parseInt(ayahInput.value) : 
               (ayahSelect && ayahSelect.value ? parseInt(ayahSelect.value) : null);
        
        if (surah >= 1 && surah <= 114 && ayah) {
            state.lastSearchedSurah = surah;
            state.lastSearchedAyah = ayah;
            
            console.log(`Looking up Surah ${surah}, Ayah ${ayah}...`);
            page = findPageFromSurahAyah(surah, ayah);
            
            if (!page) {
                alert(`Could not find location for Surah ${surah}, Ayah ${ayah}`);
                return;
            }
        }
    }
    else if (goToInput.value.trim()) {
        const pageValue = parseInt(goToInput.value, 10);
        if (!isNaN(pageValue) && pageValue >= 1 && pageValue <= 604) {
            page = pageValue;
            state.lastSearchedSurah = null;
            state.lastSearchedAyah = null;
        }
    }
    
    if (!page) {
        alert('Please enter a page number or Surah and Ayah');
        return;
    }
    
    const popupRiwayahSelect = document.getElementById('goToRiwayahSelect');
    const mainRiwayahSelect = document.getElementById('riwayahSelect');
    let riwayah = (popupRiwayahSelect && popupRiwayahSelect.value) || (mainRiwayahSelect && mainRiwayahSelect.value) || state.lastSelectedRiwayah;
    
    if (!riwayah) {
        alert('Please select a Riwayah first');
        return;
    }
    
    state.lastSelectedRiwayah = riwayah;
    saveSettings();
    
    console.log(`Opening: Riwayah="${riwayah}", Page=${page}`);
    
    goToInput.value = '';
    
    const navigatePopup = document.getElementById('navigatePopup');
    if (navigatePopup) {
        navigatePopup.classList.add('hidden');
    }
    
    findAndOpenFile(riwayah, page);
}
function updateLocationDisplay(label, status, displayPath) {
    const fileLocation = document.getElementById('fileLocation');
    const fileStatus = document.getElementById('fileStatus');
    const juzInfo = document.getElementById('juzInfo');
    const currentPageDisplay = document.getElementById('currentPageDisplay');
    const currentRiwayahDisplay = document.getElementById('currentRiwayahDisplay');
    const pathBar = document.querySelector('.file-path-bar');
    
    if (currentPageDisplay) {
        currentPageDisplay.textContent = `Page ${state.currentPage}`;
        currentPageDisplay.classList.add('active');
    }
    
    if (currentRiwayahDisplay && state.currentRiwayah) {
        currentRiwayahDisplay.textContent = getRiwayahDisplayName(state.currentRiwayah);
        currentRiwayahDisplay.classList.add('active');
        // Apply riwayah color
        const color = getRiwayahColor(state.currentRiwayah);
        currentRiwayahDisplay.style.background = `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`;
        currentRiwayahDisplay.style.color = color;
        currentRiwayahDisplay.style.borderColor = color;
    } else if (currentRiwayahDisplay) {
        currentRiwayahDisplay.textContent = '-';
        currentRiwayahDisplay.classList.remove('active');
        currentRiwayahDisplay.style = '';
    }
    
    if (fileLocation) {
        fileLocation.textContent = displayPath || label;
        fileLocation.className = 'file-path ' + status;
    }
    
    if (fileStatus) {
        fileStatus.textContent = status.replace('-', ' ');
        fileStatus.className = 'status-indicator ' + status;
    }
    
    if (juzInfo) {
        juzInfo.textContent = `Juz ${state.currentJuz}`;
    }
    
    if (pathBar) {
        pathBar.classList.remove('has-review', 'has-progress', 'has-completed');
        pathBar.classList.add('has-' + status);
    }
}
async function refreshCurrentFileUI() {
    console.log('Refreshing current file UI at', new Date().toLocaleTimeString());
    
    const docInfo = await getActiveDocumentInfo();
    
    if (!docInfo && state.lastDocName) {
        console.log('Tab closed:', state.lastDocName);
        state.currentRiwayah = null;
        state.currentPage = null;
        state.currentJuz = null;
        state.lastDocName = '';
    }
    
    if (docInfo && state.lastDocName && docInfo.riwayah + '-' + docInfo.page !== state.lastDocName.replace('.ai', '')) {
        console.log('Tab changed from', state.lastDocName, 'to', docInfo.riwayah + '-' + docInfo.page);
    }
    
    if (docInfo && !state.lastDocName) {
        console.log('New file opened:', docInfo.riwayah + '-' + docInfo.page);
        // If file source wasn't set by queue click, mark as direct open
        if (!state.fileSource) {
            state.fileSource = 'direct';
        }
    }
    
    if (docInfo) {
        state.lastDocName = docInfo.page + '-' + docInfo.riwayah + '.ai';
    } else {
        state.lastDocName = '';
    }
    
    restoreCollapsedSections();
    
    if (docInfo && state.tasksFolder) {
        state.currentRiwayah = docInfo.riwayah;
        state.currentPage = docInfo.page.toString().padStart(3, '0');
        state.currentJuz = getJuzFromPage(docInfo.page);
        state.completedJsonCreated = false;
        
        const riwayahSelect = document.getElementById('riwayahSelect');
        if (riwayahSelect) riwayahSelect.value = state.currentRiwayah;
        
        const fileName = `${state.currentPage}-${state.currentRiwayah}.ai`;
        const juzFolder = state.currentJuz.toString().padStart(2, '0');
        let location = { label: 'Unknown', status: 'in-progress', display: 'Unknown' };
        
        if (fs.existsSync(path.join(state.projectFolder, state.currentRiwayah, 'Review Task', fileName))) {
            location = { label: 'Review Task', status: 'review', display: 'Review Task' };
        } else if (fs.existsSync(path.join(state.projectFolder, state.currentRiwayah, 'Completed', 'Ajza', juzFolder, fileName))) {
            location = { label: `Completed/Ajza/${juzFolder}`, status: 'completed', display: `Completed/Ajza/${juzFolder}` };
        } else if (fs.existsSync(path.join(state.projectFolder, state.currentRiwayah, 'Ajza', juzFolder, fileName))) {
            location = { label: `Ajza/${juzFolder}`, status: 'in-progress', display: `Ajza/${juzFolder}` };
        }
        
        updateLocationDisplay(location.label, location.status, location.display);
        
        state.projectTasks = loadRiwayahTasks(state.currentRiwayah);
        const pageData = loadPageData(state.currentRiwayah, state.currentPage);
        state.pageTasks = pageData.tasks;
        state.pageProjectCompletions = pageData.completedProjectTasks;
        
        if (pageData.isCompleted) {
            state.pageProjectCompletions = state.projectTasks.map(t => t.id);
        }
        
        document.getElementById('projectTasks').innerHTML = '';
        document.getElementById('pageTasks').innerHTML = '';
        
        const displayProjectTasks = state.projectTasks.map(task => ({
            ...task,
            completed: state.pageProjectCompletions.includes(task.id)
        }));
        
        renderTaskList('projectTasks', displayProjectTasks, false, true);
        renderTaskList('pageTasks', state.pageTasks, true, false);
        updateProgress();
        updatePageTasksSubmitButton();
        if (pageData.isCompleted) {
            console.log('This page is already completed');
        }
        
    } else {
        const riwayahSelect = document.getElementById('riwayahSelect');
        const currentPageDisplay = document.getElementById('currentPageDisplay');
        const fileLocation = document.getElementById('fileLocation');
        const fileStatus = document.getElementById('fileStatus');
        const juzInfo = document.getElementById('juzInfo');
        const pathBar = document.querySelector('.file-path-bar');
        
        if (riwayahSelect && state.lastSelectedRiwayah) {
            riwayahSelect.value = state.lastSelectedRiwayah;
            state.currentRiwayah = state.lastSelectedRiwayah;
        } else if (riwayahSelect) {
            riwayahSelect.value = '';
        }
        
        if (currentPageDisplay) {
            currentPageDisplay.textContent = 'Page -';
            currentPageDisplay.classList.remove('active');
        }
        if (fileLocation) {
            fileLocation.textContent = '-';
            fileLocation.className = 'file-path';
        }
        if (fileStatus) {
            fileStatus.textContent = '';
            fileStatus.className = 'status-indicator';
        }
        if (juzInfo) juzInfo.textContent = 'Juz -';
        if (pathBar) {
            pathBar.classList.remove('has-review', 'has-progress', 'has-completed');
        }
        
        document.getElementById('projectTasks').innerHTML = '<p class="empty-state">Open a Mushaf file to view tasks</p>';
        document.getElementById('pageTasks').innerHTML = '<p class="empty-state">No page-specific tasks</p>';
        document.getElementById('progressFill').style.width = '0%';
        document.getElementById('progressText').textContent = '0%';
        document.getElementById('submitPageTasksBtn')?.classList.add('hidden');
    }

    updateCloseButtonsState();
    updateNavButtonsState();
    
    // Show/hide complete FAB based on whether a file is open and not already completed
    const completeFab = document.getElementById('completeFab');
    if (completeFab) {
        const hasFileOpen = !!(docInfo && state.currentRiwayah && state.currentPage);
        const isCompleted = hasFileOpen && (isPageCompleted(state.currentRiwayah, state.currentPage) || isFileCompleted(state.currentRiwayah, state.currentPage));
        completeFab.classList.toggle('hidden', !hasFileOpen || isCompleted);
    }
}
async function refreshQueues(forceScan = false) {
    console.log('Refreshing queues, forceScan:', forceScan);
    loadReviewFiles(forceScan);
    loadInProgressFiles(forceScan);
    restoreCollapsedSections();
}
async function refreshUI() {
    await refreshCurrentFileUI();
    await refreshQueues();
}
function setupCollapsibleSections() {
    document.querySelectorAll('.section-header').forEach(header => {
        header.addEventListener('click', (e) => {
            // Don't collapse if clicking on buttons
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                return;
            }
            
            const section = header.dataset.section;
            const content = header.nextElementSibling;
            const icon = header.querySelector('.collapse-icon');
            
            header.classList.toggle('collapsed');
            content.classList.toggle('collapsed');
            
            // Save preference
            state.collapsedSections = state.collapsedSections || {};
            state.collapsedSections[section] = header.classList.contains('collapsed');
        });
    });
}
function restoreCollapsedSections() {
    if (!state.collapsedSections) return;
    
    Object.entries(state.collapsedSections).forEach(([section, isCollapsed]) => {
        const header = document.querySelector(`.section-header[data-section="${section}"]`);
        if (header && isCollapsed) {
            header.classList.add('collapsed');
            header.nextElementSibling.classList.add('collapsed');
        }
    });
}
function showLoading(show) {
    const loading = document.getElementById('loadingIndicator');
    if (loading) {
        loading.classList.toggle('hidden', !show);
    }
}
function loadRiwayahColors() {
    try {
        const colorsFile = path.join(state.tasksFolder, 'riwayah-colors.json');
        if (fs.existsSync(colorsFile)) {
            const raw = JSON.parse(fs.readFileSync(colorsFile, 'utf8'));
            // Backward compat: convert string values to object format
            state.riwayahColors = {};
            Object.entries(raw).forEach(([key, val]) => {
                if (typeof val === 'string') {
                    state.riwayahColors[key] = { color: val, arabicName: '' };
                } else if (val && typeof val === 'object') {
                    state.riwayahColors[key] = { color: val.color || '#9b59b6', arabicName: val.arabicName || '' };
                }
            });
        }
    } catch (e) {
        console.error('Error loading riwayah colors:', e);
    }
}
function saveRiwayahColors() {
    try {
        const colorsFile = path.join(state.tasksFolder, 'riwayah-colors.json');
        fs.writeFileSync(colorsFile, JSON.stringify(state.riwayahColors, null, 2));
    } catch (e) {
        console.error('Error saving riwayah colors:', e);
    }
}
function getRiwayahInfo(riwayah) {
    const info = state.riwayahColors[riwayah];
    if (info && typeof info === 'object') {
        return { color: info.color || '#9b59b6', arabicName: info.arabicName || '' };
    }
    // Backward compat for in-memory old format
    if (info && typeof info === 'string') {
        return { color: info, arabicName: '' };
    }
    return { color: '#9b59b6', arabicName: '' };
}
function getRiwayahColor(riwayah) {
    return getRiwayahInfo(riwayah).color;
}
function getRiwayahArabicName(riwayah) {
    return getRiwayahInfo(riwayah).arabicName;
}
function getRiwayahDisplayName(riwayah) {
    const arabic = getRiwayahArabicName(riwayah);
    return arabic || riwayah;
}
function updateRiwayahInfo(riwayah, info) {
    try {
        if (!state.riwayahColors[riwayah]) {
            state.riwayahColors[riwayah] = { color: '#9b59b6', arabicName: '' };
        }
        if (info.color !== undefined) {
            state.riwayahColors[riwayah].color = info.color;
        }
        if (info.arabicName !== undefined) {
            state.riwayahColors[riwayah].arabicName = info.arabicName;
        }
        saveRiwayahColors();
        return true;
    } catch (e) {
        console.error('Error updating riwayah info:', e);
        return false;
    }
}
function updateRiwayahBadgeColor() {
    const badge = document.getElementById('currentRiwayahDisplay');
    if (badge && state.currentRiwayah) {
        const color = getRiwayahColor(state.currentRiwayah);
        badge.style.background = `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`;
        badge.style.color = color;
        badge.style.borderColor = color;
    }
}
function goToNextPage() {
    if (!state.currentPage || !state.currentRiwayah) {
        console.log('No page currently open');
        showToast('Open a file first', 'error');
        return;
    }
    const currentPageNum = parseInt(state.currentPage, 10);
    if (currentPageNum >= 604) {
        console.log('Already at last page');
        showToast('Already at last page', 'info');
        return;
    }
    const nextPageNum = currentPageNum + 1;
    findAndOpenFile(state.currentRiwayah, nextPageNum);
}
function goToPreviousPage() {
    if (!state.currentPage || !state.currentRiwayah) {
        console.log('No page currently open');
        showToast('Open a file first', 'error');
        return;
    }
    const currentPageNum = parseInt(state.currentPage, 10);
    if (currentPageNum <= 1) {
        console.log('Already at first page');
        showToast('Already at first page', 'info');
        return;
    }
    const prevPageNum = currentPageNum - 1;
    findAndOpenFile(state.currentRiwayah, prevPageNum);
}
function updateNavButtonsState() {
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    
    if (!state.currentPage || !state.currentRiwayah) {
        if (prevBtn) {
            prevBtn.disabled = true;
            prevBtn.style.opacity = '0.3';
        }
        if (nextBtn) {
            nextBtn.disabled = true;
            nextBtn.style.opacity = '0.3';
        }
        return;
    }
    
    const currentPageNum = parseInt(state.currentPage, 10);
    
    if (prevBtn) {
        prevBtn.disabled = currentPageNum <= 1;
        prevBtn.style.opacity = currentPageNum <= 1 ? '0.3' : '1';
    }
    if (nextBtn) {
        nextBtn.disabled = currentPageNum >= 604;
        nextBtn.style.opacity = currentPageNum >= 604 ? '0.3' : '1';
    }
}
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
function scrollToPageTasks() {
    const pageTaskSection = document.getElementById('pageTaskSection');
    
    if (!pageTaskSection) {
        console.error('pageTaskSection not found!');
        return;
    }
    
    try {
        pageTaskSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        setTimeout(() => {
            window.scrollBy(0, -80);
        }, 100);
        
    } catch (e) {
        const offsetTop = pageTaskSection.offsetTop - 100;
        document.documentElement.scrollTop = offsetTop;
        document.body.scrollTop = offsetTop;
    }
    
    pageTaskSection.style.transition = 'all 0.3s';
    pageTaskSection.style.boxShadow = 'inset 0 0 20px rgba(74, 158, 255, 0.3)';
    pageTaskSection.style.borderLeft = '3px solid var(--accent-blue)';
    
    setTimeout(() => {
        pageTaskSection.style.boxShadow = '';
        pageTaskSection.style.borderLeft = '';
    }, 2000);
}
function toggleRiwayahGroup(riwayah) {
    const group = document.getElementById(`riwayah-group-${riwayah}`);
    const header = document.querySelector(`[data-riwayah-header="${riwayah}"]`);
    
    if (!group || !header) return;
    
    const isCurrentlyCollapsed = group.hasAttribute('hidden') || group.style.display === 'none';
    const shouldCollapse = !isCurrentlyCollapsed;
    
    if (shouldCollapse) {
        group.setAttribute('hidden', '');
        header.classList.add('collapsed');
        header.querySelector('.riwayah-toggle-icon').textContent = '▶';
    } else {
        group.removeAttribute('hidden');
        header.classList.remove('collapsed');
        header.querySelector('.riwayah-toggle-icon').textContent = '▼';
    }
    
    state.collapsedRiwayahs = state.collapsedRiwayahs || {};
    state.collapsedRiwayahs[riwayah] = shouldCollapse;
    
    event?.stopPropagation();
}
function switchTab(tabName) {
    console.log('switchTab called:', tabName);
    document.querySelectorAll('.bottom-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabName + 'Tab');
    });
    // Global header: visible on all tabs except settings
    const globalHeader = document.getElementById('globalUserHeader');
    const appContainer = document.getElementById('appContainer');
    if (globalHeader) {
        const hideHeader = tabName === 'settings';
        globalHeader.classList.toggle('hidden', hideHeader);
        if (appContainer) {
            appContainer.classList.toggle('no-header', hideHeader);
        }
    }
    if (tabName === 'stats') {
        refreshStats();
    }
    if (tabName === 'review') {
        loadReviewFiles(true);
    }
    if (tabName === 'inProgress') {
        loadInProgressFiles(true);
    }

    if (tabName === 'chat') {
        if (typeof startChatPolling === 'function') startChatPolling();
        if (typeof clearChatBadge === 'function') clearChatBadge();
    } else {
        if (typeof stopChatPolling === 'function') stopChatPolling();
    }
    const navigateFab = document.getElementById('navigateFab');
    if (navigateFab) {
        navigateFab.classList.toggle('hidden', tabName === 'chat');
    }
    const completeFab = document.getElementById('completeFab');
    if (completeFab && tabName === 'chat') {
        completeFab.classList.add('hidden');
    }
    if (tabName === 'settings') {
        document.getElementById('settingsFolderPath').value = state.tasksFolder || '';
        document.getElementById('settingsProjectPath').value = state.projectFolder || '';
        const autoOpenCheckbox = document.getElementById('autoOpenNextPageCheckbox');
        if (autoOpenCheckbox) autoOpenCheckbox.checked = !!state.autoOpenNextPage;
    }
}
function setupTabNavigation() {
    document.querySelectorAll('.bottom-tab-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            if (tab) switchTab(tab);
        });
    });
}
function setupNavigatePopup() {
    const fab = document.getElementById('navigateFab');
    const popup = document.getElementById('navigatePopup');
    const closeBtn = document.getElementById('closeNavigatePopup');
    
    if (fab) {
        fab.addEventListener('click', () => {
            popup.classList.remove('hidden');
            const surahInput = document.getElementById('goToSurahInput');
            if (surahInput) surahInput.focus();
        });
    }
    
    const completeFab = document.getElementById('completeFab');
    if (completeFab) {
        completeFab.addEventListener('click', () => {
            moveToCompleted();
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            popup.classList.add('hidden');
        });
    }
    
    if (popup) {
        popup.addEventListener('click', (e) => {
            if (e.target === popup) popup.classList.add('hidden');
        });
    }
}

window.refreshUI = refreshUI;
window.refreshCurrentFileUI = refreshCurrentFileUI;
window.refreshQueues = refreshQueues;
window.switchTab = switchTab;
