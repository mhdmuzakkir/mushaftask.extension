function scanInProgressFiles() {
    console.log('scanInProgressFiles called');
    if (!state.projectFolder) {
        return [];
    }
    
    const allFiles = [];
    
    try {
        const riwayahFolders = fs.readdirSync(state.projectFolder, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        for (const riwayah of riwayahFolders) {
            // Scan Ajza (normal in-progress)
            const ajzaPath = path.join(state.projectFolder, riwayah, 'Ajza');
            if (fs.existsSync(ajzaPath)) {
                for (let juz = 1; juz <= 30; juz++) {
                    const juzFolder = path.join(ajzaPath, juz.toString().padStart(2, '0'));
                    if (!fs.existsSync(juzFolder)) continue;
                    
                    const files = fs.readdirSync(juzFolder)
                        .filter(f => f.endsWith('.ai'))
                        .map(f => {
                            const pageMatch = f.match(/^(\d+)/);
                            const pageFormatted = pageMatch ? pageMatch[1].padStart(3, '0') : '000';
                            const pageNum = pageMatch ? parseInt(pageMatch[1]) : 0;
                            const surahInfo = getSurahInfoFromPage(pageNum);
                            const assignedUser = getAssignedUserForPage(pageNum, riwayah);
                            
                            return {
                                fileName: f,
                                page: pageNum,
                                pageFormatted: pageFormatted,
                                riwayah: riwayah,
                                fullPath: path.join(juzFolder, f),
                                displayName: pageMatch ? `Page ${pageMatch[1]}` : f.replace('.ai', ''),
                                location: `Ajza/${juz.toString().padStart(2, '0')}`,
                                juz: juz,
                                surahInfo: surahInfo,
                                assignedUser: assignedUser,
                                isRecheck: false
                            };
                        });
                    
                    allFiles.push(...files);
                }
            }
            
            // Scan Recheck (second-pass in-progress)
            const recheckPath = path.join(state.projectFolder, riwayah, 'Recheck', 'Ajza');
            if (fs.existsSync(recheckPath)) {
                for (let juz = 1; juz <= 30; juz++) {
                    const juzFolder = path.join(recheckPath, juz.toString().padStart(2, '0'));
                    if (!fs.existsSync(juzFolder)) continue;
                    
                    const files = fs.readdirSync(juzFolder)
                        .filter(f => f.endsWith('.ai'))
                        .map(f => {
                            const pageMatch = f.match(/^(\d+)/);
                            const pageFormatted = pageMatch ? pageMatch[1].padStart(3, '0') : '000';
                            const pageNum = pageMatch ? parseInt(pageMatch[1]) : 0;
                            const surahInfo = getSurahInfoFromPage(pageNum);
                            const assignedUser = getAssignedUserForPage(pageNum, riwayah);
                            
                            return {
                                fileName: f,
                                page: pageNum,
                                pageFormatted: pageFormatted,
                                riwayah: riwayah,
                                fullPath: path.join(juzFolder, f),
                                displayName: pageMatch ? `Page ${pageMatch[1]}` : f.replace('.ai', ''),
                                location: `Recheck/${juz.toString().padStart(2, '0')}`,
                                juz: juz,
                                surahInfo: surahInfo,
                                assignedUser: assignedUser,
                                isRecheck: true
                            };
                        });
                    
                    allFiles.push(...files);
                }
            }
        }
        
        allFiles.sort((a, b) => a.page - b.page);
        console.log(`scanInProgressFiles total: ${allFiles.length} files`);
        return allFiles;
        
    } catch (e) {
        console.error('Error scanning in-progress files:', e);
    }
    
    return [];
}
function loadInProgressFiles(forceScan = false) {
    console.log('loadInProgressFiles called, forceScan:', forceScan);
    const container = document.getElementById('inProgressFilesList');
    const countEl = document.getElementById('inProgressCount');
    if (!container) return;

    if (!state.projectFolder) {
        container.innerHTML = '<p class="empty-state">Configure project folder to see in-progress files</p>';
        if (countEl) countEl.textContent = '';
        return;
    }

    let files;
    if (!forceScan && state.cachedInProgressFiles) {
        console.log('Using cached in-progress files:', state.cachedInProgressFiles.length);
        files = state.cachedInProgressFiles;
    } else {
        files = scanInProgressFiles();
        state.cachedInProgressFiles = files;
    }
    
    // Apply riwayah filter
    if (state.inProgressRiwayahFilter !== 'all') {
        const selectedRis = new Set(state.inProgressRiwayahFilter.split(',').filter(r => r));
        files = files.filter(f => selectedRis.has(f.riwayah));
    }
    
    // Apply user filter (case-insensitive)
    if (state.inProgressUserFilter !== 'all') {
        const filterUser = state.inProgressUserFilter.toLowerCase();
        const userData = USER_ASSIGNMENTS[filterUser] || USER_ASSIGNMENTS[state.inProgressUserFilter];
        if (userData) {
            const userAssignments = userData.assignments || {};
            files = files.filter(f => {
                // Only filter if this riwayah is one the user has an assignment for
                const riwayahKey = Object.keys(userAssignments).find(
                    r => r.toLowerCase() === f.riwayah.toLowerCase()
                );
                if (!riwayahKey) {
                    return true; // Show other riwayahs
                }
                // Check if this file is assigned to the selected user
                return f.assignedUser && f.assignedUser.toLowerCase() === filterUser;
            });
        }
    }
    
    if (countEl) {
        countEl.textContent = files.length > 0 ? `(${files.length})` : '';
    }
    
    container.innerHTML = '';
    
    if (files.length === 0) {
        const userFilterText = state.inProgressUserFilter !== 'all' ? ` for ${USER_ASSIGNMENTS[state.inProgressUserFilter]?.name || state.inProgressUserFilter}` : '';
        const riwayahFilterText = state.inProgressRiwayahFilter !== 'all' ? ` in ${state.inProgressRiwayahFilter}` : '';
        container.innerHTML = `<p class="empty-state">No in-progress files${userFilterText}${riwayahFilterText}</p>`;
        return;
    }

    // Group by riwayah
    const grouped = {};
    files.forEach(file => {
        if (!grouped[file.riwayah]) grouped[file.riwayah] = [];
        grouped[file.riwayah].push(file);
    });

    Object.keys(grouped).sort().forEach(riwayah => {
        const riwayahFiles = grouped[riwayah];
        const isCollapsed = state.collapsedRiwayahs && state.collapsedRiwayahs[riwayah];
        const riwayahColor = getRiwayahColor(riwayah);
        
        const header = document.createElement('div');
        header.className = `riwayah-header ${isCollapsed ? 'collapsed' : ''}`;
        header.dataset.riwayahHeader = `inprogress-${riwayah}`;
        header.style.borderLeft = `4px solid ${riwayahColor}`;
        header.innerHTML = `
            <span class="riwayah-toggle-icon">${isCollapsed ? '&#9656;' : '&#9662;'}</span>
            <span class="riwayah-name" style="color: ${riwayahColor};">${getRiwayahDisplayName(riwayah)}</span>
            <span class="riwayah-count-badge">${riwayahFiles.length} file${riwayahFiles.length !== 1 ? 's' : ''}</span>
        `;
        header.onclick = () => toggleInProgressRiwayahGroup(riwayah, header);
        container.appendChild(header);
        
        const filesContainer = document.createElement('div');
        filesContainer.id = `inprogress-group-${riwayah}`;
        filesContainer.className = 'riwayah-files-container';
        if (isCollapsed) {
            filesContainer.setAttribute('hidden', '');
        }
        
        riwayahFiles.forEach(file => {
            const div = createInProgressFileElement(file);
            filesContainer.appendChild(div);
        });
        
        container.appendChild(filesContainer);
    });
    
    // Re-apply multi-select mode if active
    if (state.inProgressMultiSelectMode) {
        updateInProgressQueueForMultiSelect();
    }
}
function toggleInProgressRiwayahGroup(riwayah, header) {
    const group = document.getElementById(`inprogress-group-${riwayah}`);
    if (!group || !header) return;
    
    const isCollapsed = !group.hasAttribute('hidden');
    
    if (isCollapsed) {
        group.setAttribute('hidden', '');
        header.classList.add('collapsed');
        header.querySelector('.riwayah-toggle-icon').innerHTML = '&#9656;';
    } else {
        group.removeAttribute('hidden');
        header.classList.remove('collapsed');
        header.querySelector('.riwayah-toggle-icon').innerHTML = '&#9662;';
    }
    
    // Save collapsed state (same as review queue)
    state.collapsedRiwayahs = state.collapsedRiwayahs || {};
    state.collapsedRiwayahs[riwayah] = isCollapsed;
}
function populateInProgressRiwayahCheckboxes() {
    const container = document.getElementById('inProgressRiwayahCheckboxes');
    const header = document.getElementById('riwayahFilterHeader');
    if (!container || !state.tasksFolder) return;
    
    // Setup collapsible header
    if (header) {
        header.onclick = toggleRiwayahFilterCollapse;
    }
    
    // Clear existing checkboxes
    container.innerHTML = '';
    
    try {
        const riwayahTasksPath = path.join(state.tasksFolder, 'riwayah-tasks');
        if (!fs.existsSync(riwayahTasksPath)) return;
        
        const riwayahs = fs.readdirSync(riwayahTasksPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name)
            .sort();
        
        // Parse saved riwayah filter (could be 'all' or comma-separated list)
        const savedSelected = state.inProgressRiwayahFilter === 'all' 
            ? new Set() 
            : new Set(state.inProgressRiwayahFilter.split(',').filter(r => r));
        
        // Add "All Riwayahs" checkbox
        const allLabel = document.createElement('label');
        allLabel.className = 'riwayah-checkbox-label';
        const allChecked = state.inProgressRiwayahFilter === 'all' || savedSelected.size === 0;
        allLabel.innerHTML = `<input type="checkbox" value="all" ${allChecked ? 'checked' : ''}> All Riwayahs`;
        allLabel.querySelector('input').addEventListener('change', handleRiwayahCheckboxChange);
        container.appendChild(allLabel);
        
        // Add checkbox for each riwayah
        riwayahs.forEach(riwayah => {
            const label = document.createElement('label');
            label.className = 'riwayah-checkbox-label';
            const isChecked = savedSelected.has(riwayah) || allChecked;
            label.innerHTML = `<input type="checkbox" value="${riwayah}" ${isChecked ? 'checked' : ''}> ${getRiwayahDisplayName(riwayah)}`;
            label.querySelector('input').addEventListener('change', handleRiwayahCheckboxChange);
            container.appendChild(label);
        });
        
        // If any specific riwayah is selected, collapse the filter
        if (state.inProgressRiwayahFilter !== 'all') {
            collapseRiwayahFilter();
        }
        
    } catch (e) {
        console.error('Error populating riwayah checkboxes:', e);
    }
}
function toggleRiwayahFilterCollapse() {
    const container = document.getElementById('inProgressRiwayahCheckboxes');
    const header = document.getElementById('riwayahFilterHeader');
    if (!container || !header) return;
    
    container.classList.toggle('collapsed');
    header.classList.toggle('collapsed');
}
function collapseRiwayahFilter() {
    const container = document.getElementById('inProgressRiwayahCheckboxes');
    const header = document.getElementById('riwayahFilterHeader');
    if (!container || !header) return;
    
    container.classList.add('collapsed');
    header.classList.add('collapsed');
}

function showAllRiwayahs() {
    const container = document.getElementById('inProgressRiwayahCheckboxes');
    const header = document.getElementById('riwayahFilterHeader');
    if (!container || !header) return;
    
    container.classList.remove('collapsed');
    header.classList.remove('collapsed');
}
function handleRiwayahCheckboxChange(e) {
    const container = document.getElementById('inProgressRiwayahCheckboxes');
    if (!container) return;
    
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    const allCheckbox = container.querySelector('input[value="all"]');
    
    if (e.target.value === 'all') {
        // If "All" is checked, uncheck all others
        if (e.target.checked) {
            checkboxes.forEach(cb => {
                if (cb.value !== 'all') cb.checked = false;
            });
            state.inProgressRiwayahFilter = 'all';
            // Expand filter when showing all
            showAllRiwayahs();
        }
    } else {
        // If a specific riwayah is checked, uncheck "All"
        if (e.target.checked) {
            allCheckbox.checked = false;
            // Collapse filter when specific riwayah selected
            collapseRiwayahFilter();
        }
        
        // Collect all checked riwayahs
        const checkedRis = Array.from(checkboxes)
            .filter(cb => cb.checked && cb.value !== 'all')
            .map(cb => cb.value);
        
        if (checkedRis.length === 0) {
            // If nothing selected, check "All"
            allCheckbox.checked = true;
            state.inProgressRiwayahFilter = 'all';
            showAllRiwayahs();
        } else {
            state.inProgressRiwayahFilter = checkedRis.join(',');
        }
    }
    
    saveInProgressFilters();
    loadInProgressFiles();
}
function saveInProgressFilters() {
    // Save to main settings file
    saveSettings();
}
function loadInProgressFilters() {
    // Filters are loaded in loadSettings()
    // Just update the UI here
    const trigger = document.getElementById('userFilterTrigger');
    const options = document.getElementById('userFilterOptions');
    
    if (trigger && options) {
        const value = state.inProgressUserFilter || 'all';
        const option = options.querySelector(`[data-value="${value}"]`);
        if (option) {
            trigger.textContent = option.textContent;
            options.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
        }
    }
    // Riwayah checkboxes are populated by populateInProgressRiwayahCheckboxes()
}
function createInProgressFileElement(file) {
    const div = document.createElement('div');
    div.className = 'in-progress-file-item';
    div.dataset.filename = file.fileName;
    div.dataset.riwayah = file.riwayah;
    
    const isCurrentFile = state.currentRiwayah === file.riwayah && 
                          state.currentPage === file.pageFormatted;
    
    if (isCurrentFile) {
        div.classList.add('current-file');
    }
    
    let surahHtml = '';
    if (file.surahInfo) {
        if (file.surahInfo.isMultiSurah) {
            surahHtml = `
                <div class="surah-names">
                    <span class="surah-name primary">${file.surahInfo.primarySurah}</span>
                    <span class="surah-name secondary">${file.surahInfo.secondarySurah}</span>
                </div>
            `;
        } else {
            surahHtml = `<div class="surah-name primary">${file.surahInfo.primarySurah}</div>`;
        }
    } else {
        surahHtml = `<div class="surah-name unknown">Unknown</div>`;
    }
    
    // Show user badge for assigned files
    let userBadgeHtml = '';
    const assignedUserLower = file.assignedUser ? file.assignedUser.toLowerCase() : null;
    if (assignedUserLower && USER_ASSIGNMENTS[assignedUserLower]) {
        const userName = USER_ASSIGNMENTS[assignedUserLower]?.name || file.assignedUser;
        // Generate color class based on user key
        const userColorClass = `user-${assignedUserLower}`;
        userBadgeHtml = `<span class="user-badge ${userColorClass}">${userName}</span>`;
    }
    
    const statusBadge = file.isRecheck
        ? '<span class="recheck-badge">RECHECK</span>'
        : '<span class="progress-badge">IN PROGRESS</span>';
    
    div.innerHTML = `
        <span class="ai-icon">Ai</span>
        <div class="file-info">
            ${surahHtml}
            <div class="page-number-small">${file.pageFormatted}</div>
        </div>
        <div class="file-badges">
            ${userBadgeHtml}
            ${statusBadge}
        </div>
    `;
    
    // Click handler - only open file if NOT in multi-select mode
    div.addEventListener('click', function(e) {
        // If in multi-select mode, don't open file
        if (state.inProgressMultiSelectMode) {
            // Toggle checkbox instead
            const checkbox = div.querySelector('.multi-select-checkbox');
            if (checkbox && e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                toggleInProgressPageSelection(checkbox);
            }
            return;
        }
        // Normal mode - open file
        openInProgressFile(file);
    });
    
    return div;
}
function openInProgressFile(file) {
    if (typeof CSInterface === 'undefined') return;
    
    console.log(`Opening in-progress file ${file.displayName}...`);
    state.fileSource = 'inProgress';
    const csInterface = new CSInterface();
    const escapedPath = file.fullPath.replace(/\\/g, '\\\\');
    
    csInterface.evalScript('openDocument("' + escapedPath + '")', function(result) {
        if (result === 'success') {
            setTimeout(() => {
                refreshUI();
                scrollToHeader();
            }, 1000);
        }
    });
}
function scanAllReviewFiles() {
    console.log('scanAllReviewFiles called. projectFolder:', state.projectFolder);
    if (!state.projectFolder) {
        console.log('No project folder configured');
        return [];
    }
    
    const allFiles = [];
    
    try {
        if (!fs.existsSync(state.projectFolder)) {
            console.log('Project folder does not exist:', state.projectFolder);
            return [];
        }
        
        const riwayahFolders = fs.readdirSync(state.projectFolder, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        console.log('Found riwayah folders:', riwayahFolders);
        
        for (const riwayah of riwayahFolders) {
            // 1. Always include files in Review Task
            const reviewFolder = path.join(state.projectFolder, riwayah, 'Review Task');
            if (fs.existsSync(reviewFolder)) {
                const files = fs.readdirSync(reviewFolder).filter(f => f.endsWith('.ai'));
                files.forEach(f => {
                    const pageMatch = f.match(/^(\d+)/);
                    const pageFormatted = pageMatch ? pageMatch[1].padStart(3, '0') : '000';
                    const pageNum = pageMatch ? parseInt(pageMatch[1]) : 0;
                    const surahInfo = getSurahInfoFromPage(pageNum);
                    
                    allFiles.push({
                        fileName: f,
                        page: pageNum,
                        pageFormatted: pageFormatted,
                        riwayah: riwayah,
                        fullPath: path.join(reviewFolder, f),
                        displayName: pageMatch ? `Page ${pageMatch[1]}` : f.replace('.ai', ''),
                        location: 'Review Task',
                        needsReview: true,
                        taskCount: 0,
                        isAjzaFile: false,
                        surahInfo: surahInfo
                    });
                });
            }
            
            // 2. Scan page-tasks to find files with pending tasks in Ajza/Completed
            const pageTasksDir = path.join(state.tasksFolder, 'page-tasks', riwayah);
            if (fs.existsSync(pageTasksDir)) {
                const taskFiles = fs.readdirSync(pageTasksDir).filter(f => f.endsWith('-tasks.json'));
                
                for (const taskFile of taskFiles) {
                    const pageMatch = taskFile.match(/^(\d+)-tasks\.json$/);
                    if (!pageMatch) continue;
                    
                    const pageFormatted = pageMatch[1].padStart(3, '0');
                    const pageNum = parseInt(pageMatch[1], 10);
                    
                    // Skip if already added from Review Task
                    if (allFiles.some(f => f.riwayah === riwayah && f.pageFormatted === pageFormatted)) continue;
                    
                    // Skip if pt-completed exists
                    const ptCompletedFile = path.join(state.tasksFolder, 'pt-completed', riwayah, `${pageFormatted}-pt-completed.json`);
                    if (fs.existsSync(ptCompletedFile)) continue;
                    
                    // Check if task file actually has tasks
                    let taskCount = 0;
                    try {
                        const pageData = JSON.parse(fs.readFileSync(path.join(pageTasksDir, taskFile), 'utf8'));
                        if (pageData.tasks && pageData.tasks.length > 0) {
                            taskCount = pageData.tasks.length;
                        } else {
                            continue;
                        }
                    } catch (e) {
                        continue;
                    }
                    
                    const juz = getJuzFromPage(pageNum).toString().padStart(2, '0');
                    const fileName = `${pageFormatted}-${riwayah}.ai`;
                    const surahInfo = getSurahInfoFromPage(pageNum);
                    
                    // Check Ajza first
                    const ajzaPath = path.join(state.projectFolder, riwayah, 'Ajza', juz, fileName);
                    if (fs.existsSync(ajzaPath)) {
                        allFiles.push({
                            fileName: fileName,
                            page: pageNum,
                            pageFormatted: pageFormatted,
                            riwayah: riwayah,
                            fullPath: ajzaPath,
                            displayName: `Page ${pageMatch[1]}`,
                            location: `Ajza/${juz}`,
                            needsReview: true,
                            taskCount: taskCount,
                            isAjzaFile: true,
                            surahInfo: surahInfo
                        });
                        continue;
                    }
                    
                    // Check Completed
                    const completedPath = path.join(state.projectFolder, riwayah, 'Completed', 'Ajza', juz, fileName);
                    if (fs.existsSync(completedPath)) {
                        allFiles.push({
                            fileName: fileName,
                            page: pageNum,
                            pageFormatted: pageFormatted,
                            riwayah: riwayah,
                            fullPath: completedPath,
                            displayName: `Page ${pageMatch[1]}`,
                            location: 'Completed',
                            needsReview: true,
                            taskCount: taskCount,
                            isAjzaFile: false,
                            surahInfo: surahInfo
                        });
                    }
                }
            }
        }
        
        // Final filter for pt-completed (safety net for Review Task files)
        const filteredFiles = allFiles.filter(file => {
            const ptCompletedFile = path.join(state.tasksFolder, 'pt-completed', file.riwayah, `${file.pageFormatted}-pt-completed.json`);
            return !fs.existsSync(ptCompletedFile);
        });
        
        filteredFiles.sort((a, b) => a.page - b.page);
        console.log(`scanAllReviewFiles total: ${filteredFiles.length} files in review queue`);
        
        return filteredFiles;
        
    } catch (e) {
        console.error('Error scanning review files:', e);
    }
    
    return [];
}
function loadReviewFiles(forceScan = false) {
    console.log('loadReviewFiles called, forceScan:', forceScan);
    const container = document.getElementById('reviewFilesList');
    const countEl = document.getElementById('reviewQueueCount');
    if (!container) return;

    if (!state.projectFolder) {
        container.innerHTML = '<p class="empty-state">Configure project folder to see review queue</p>';
        if (countEl) countEl.textContent = '';
        const reviewTabBtn = document.querySelector('.bottom-tab-btn[data-tab="review"]');
        if (reviewTabBtn) reviewTabBtn.classList.add('hidden');
        return;
    }

    let currentFiles;
    if (!forceScan && state.cachedReviewFiles) {
        console.log('Using cached review files:', state.cachedReviewFiles.length);
        currentFiles = state.cachedReviewFiles;
    } else {
        currentFiles = scanAllReviewFiles();
        state.cachedReviewFiles = currentFiles;
    }
    
    // Update count badge
    if (countEl) {
        countEl.textContent = currentFiles.length > 0 ? `(${currentFiles.length})` : '';
    }
    
    // Show/hide Review tab in bottom nav based on queue contents
    const reviewTabBtn = document.querySelector('.bottom-tab-btn[data-tab="review"]');
    if (reviewTabBtn) {
        reviewTabBtn.classList.toggle('hidden', currentFiles.length === 0);
        // If currently on review tab and it becomes hidden, switch to home
        if (currentFiles.length === 0 && reviewTabBtn.classList.contains('active')) {
            if (typeof switchTab === 'function') switchTab('home');
        }
    }
    const newDataHash = JSON.stringify(currentFiles.map(f => 
        `${f.fullPath}|${f.taskCount}|${f.needsReview}`
    ));
    
    if (container.dataset.lastHash === newDataHash && !state.forceRefresh) {
        console.log('Data unchanged, skipping DOM update');
        return;
    }
    
    container.dataset.lastHash = newDataHash;
    state.forceRefresh = false;

    const currentItems = container.querySelectorAll('.review-file-item').length;
    if (currentItems !== currentFiles.length || currentFiles.length === 0) {
        container.innerHTML = '';
    } else {
        updateExistingReviewItems(container, currentFiles);
        return;
    }

    state.allReviewFiles = currentFiles;
    
    if (currentFiles.length === 0) {
        container.innerHTML = '<p class="empty-state">No files in review queue</p>';
        return;
    }

    const countByRiwayah = {};
    const tasksByRiwayah = {};
    currentFiles.forEach(f => {
        countByRiwayah[f.riwayah] = (countByRiwayah[f.riwayah] || 0) + 1;
        tasksByRiwayah[f.riwayah] = (tasksByRiwayah[f.riwayah] || 0) + f.taskCount;
    });

    if (!container.querySelector('.review-count')) {
        const countDiv = document.createElement('div');
        countDiv.className = 'review-count';
        const riwayahSummary = Object.entries(countByRiwayah)
            .map(([r, c]) => `${getRiwayahDisplayName(r)}: ${c} file${c !== 1 ? 's' : ''}${tasksByRiwayah[r] > 0 ? ` (${tasksByRiwayah[r]} tasks)` : ''}`)
            .join(' | ');
        countDiv.innerHTML = `<strong>${currentFiles.length} file(s) in review</strong><br><span style="font-size: 10px; opacity: 0.8;">${riwayahSummary}</span>`;
        container.appendChild(countDiv);
    }

    const grouped = {};
    currentFiles.forEach(file => {
        if (!grouped[file.riwayah]) grouped[file.riwayah] = [];
        grouped[file.riwayah].push(file);
    });

    Object.keys(grouped).sort().forEach(riwayah => {
        const files = grouped[riwayah];
        const isCollapsed = state.collapsedRiwayahs && state.collapsedRiwayahs[riwayah];
        const riwayahColor = getRiwayahColor(riwayah);
        
        const header = document.createElement('div');
        header.className = `riwayah-header ${isCollapsed ? 'collapsed' : ''}`;
        header.dataset.riwayahHeader = riwayah;
        header.style.borderLeft = `4px solid ${riwayahColor}`;
        header.innerHTML = `
            <span class="riwayah-toggle-icon">${isCollapsed ? '▶' : '▼'}</span>
            <span class="riwayah-name" style="color: ${riwayahColor};">${getRiwayahDisplayName(riwayah)}</span>
            <span class="riwayah-count-badge">${files.length} file${files.length !== 1 ? 's' : ''}${tasksByRiwayah[riwayah] > 0 ? ` (${tasksByRiwayah[riwayah]} tasks)` : ''}</span>
        `;
        header.onclick = () => toggleRiwayahGroup(riwayah);
        container.appendChild(header);
        
        const filesContainer = document.createElement('div');
        filesContainer.id = `riwayah-group-${riwayah}`;
        filesContainer.className = 'riwayah-files-container';
        if (isCollapsed) {
            filesContainer.setAttribute('hidden', '');
            filesContainer.classList.add('collapsed');
        }
        
        files.forEach(file => {
            const div = createReviewFileElement(file);
            filesContainer.appendChild(div);
        });
        
        container.appendChild(filesContainer);
    });
}
function createReviewFileElement(file) {
    const div = document.createElement('div');
    div.className = 'review-file-item';
    div.dataset.filename = file.fileName;
    div.dataset.riwayah = file.riwayah;
    
    const isCurrentFile = state.currentRiwayah === file.riwayah && 
                          state.currentPage === file.pageFormatted;
    
    if (isCurrentFile) {
        div.classList.add('current-file');
    }
    
    if (file.location === 'Completed') {
        div.style.borderLeft = '3px solid var(--accent-orange)';
    } else if (file.location.startsWith('Ajza')) {
        div.style.borderLeft = '3px solid var(--accent-blue)';
    }
    
    let surahHtml = '';
    if (file.surahInfo) {
        if (file.surahInfo.isMultiSurah) {
            surahHtml = `
                <div class="surah-names">
                    <span class="surah-name primary">${file.surahInfo.primarySurah}</span>
                    <span class="surah-name secondary">${file.surahInfo.secondarySurah}</span>
                </div>
            `;
        } else {
            surahHtml = `<div class="surah-name primary">${file.surahInfo.primarySurah}</div>`;
        }
    } else {
        surahHtml = `<div class="surah-name unknown">Unknown</div>`;
    }
    
    div.innerHTML = `
        <span class="ai-icon">Ai</span>
        <div class="file-info">
            ${surahHtml}
            <div class="page-number-small">${file.pageFormatted}</div>
        </div>
        ${file.isAjzaFile ? `<span class="task-count-badge">${file.taskCount} task${file.taskCount !== 1 ? 's' : ''}</span>` : ''}
        ${file.location === 'Completed' ? '<span class="review-badge-text">REVIEW</span>' : ''}
    `;
    
    // Click handler - only open file if NOT in multi-select mode
    div.addEventListener('click', function(e) {
        // If in multi-select mode, don't open file
        if (state.multiSelectMode) {
            // Toggle checkbox instead
            const checkbox = div.querySelector('.multi-select-checkbox');
            if (checkbox && e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                togglePageSelection(checkbox);
            }
            return;
        }
        // Normal mode - open file
        openReviewFile(file);
    });
    
    return div;
}
function scrollToHeader() {
    const header = document.querySelector('.header');
    const mainPanel = document.getElementById('mainPanel');
    
    if (header) {
        header.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
    } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    if (header) {
        header.style.transition = 'box-shadow 0.3s';
        header.style.boxShadow = '0 0 20px rgba(74, 158, 255, 0.5)';
        setTimeout(() => {
            header.style.boxShadow = '';
        }, 1500);
    }
}
function openReviewFile(file) {
    if (typeof CSInterface === 'undefined') return;
    
    console.log(`Opening ${file.displayName}...`);
    state.fileSource = 'review';
    const csInterface = new CSInterface();
    const escapedPath = file.fullPath.replace(/\\/g, '\\\\');
    
    csInterface.evalScript('openDocument("' + escapedPath + '")', function(result) {
        if (result === 'success') {
            setTimeout(() => {
                refreshUI();
                scrollToHeader();
            }, 1000);
        }
    });
}
function updateExistingReviewItems(container, currentFiles) {
    const existingItems = Array.from(container.querySelectorAll('.review-file-item'));
    
    currentFiles.forEach(file => {
        let item = existingItems.find(el => 
            el.dataset.filename === file.fileName && 
            el.dataset.riwayah === file.riwayah
        );
        
        if (item) {
            const isCurrentFile = state.currentRiwayah === file.riwayah && 
                                  state.currentPage === file.pageFormatted;
            
            if (isCurrentFile && !item.classList.contains('current-file')) {
                item.classList.add('current-file');
            } else if (!isCurrentFile && item.classList.contains('current-file')) {
                item.classList.remove('current-file');
            }
        } else {
            container.appendChild(createReviewFileElement(file));
        }
    });
    
    existingItems.forEach(item => {
        const stillExists = currentFiles.some(f => 
            f.fileName === item.dataset.filename && 
            f.riwayah === item.dataset.riwayah
        );
        if (!stillExists) {
            item.remove();
        }
    });
    
    state.allReviewFiles = currentFiles;
}
function invalidateQueueCache() {
    state.cachedReviewFiles = null;
    state.cachedInProgressFiles = null;
}
