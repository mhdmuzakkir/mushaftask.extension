function toggleMultiSelectMode() {
    state.multiSelectMode = !state.multiSelectMode;
    state.selectedPages.clear();
    
    // Close In Progress multi-select if open
    if (state.multiSelectMode && state.inProgressMultiSelectMode) {
        toggleInProgressMultiSelectMode();
    }
    
    const controls = document.getElementById('multiSelectControls');
    const toggleBtn = document.getElementById('toggleMultiSelectBtn');
    const riwayahBtn = document.getElementById('selectAllInRiwayahBtn');
    
    if (state.multiSelectMode) {
        controls.classList.remove('hidden');
        if (toggleBtn) {
            toggleBtn.classList.add('active');
            toggleBtn.title = 'Exit Multi-Select';
        }
        // Show "Select All in Riwayah" only if exactly one riwayah is visible
        if (riwayahBtn) {
            const riwayahHeaders = document.querySelectorAll('#reviewFilesList .riwayah-header');
            riwayahBtn.classList.toggle('hidden', riwayahHeaders.length !== 1);
        }
    } else {
        controls.classList.add('hidden');
        if (toggleBtn) {
            toggleBtn.classList.remove('active');
            toggleBtn.title = 'Multi-Select';
        }
    }
    
    updateReviewQueueForMultiSelect();
}
function updateReviewQueueForMultiSelect() {
    const items = document.querySelectorAll('.review-file-item');
    items.forEach(item => {
        if (state.multiSelectMode) {
            item.classList.add('multi-select-mode');
            
            // Add checkbox if not exists
            if (!item.querySelector('.multi-select-checkbox')) {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'multi-select-checkbox';
                checkbox.dataset.filename = item.dataset.filename;
                checkbox.dataset.riwayah = item.dataset.riwayah;
                // Stop propagation so clicking checkbox doesn't trigger div click
                checkbox.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
                checkbox.addEventListener('change', (e) => {
                    togglePageSelection(e.target);
                });
                item.appendChild(checkbox);
            }
        } else {
            item.classList.remove('multi-select-mode', 'selected');
            const checkbox = item.querySelector('.multi-select-checkbox');
            if (checkbox) checkbox.remove();
        }
    });
    
    updateMultiSelectCount();
}
function togglePageSelection(checkbox) {
    const key = `${checkbox.dataset.riwayah}_${checkbox.dataset.filename}`;
    const item = checkbox.closest('.review-file-item');
    
    if (checkbox.checked) {
        state.selectedPages.add(key);
        item.classList.add('selected');
    } else {
        state.selectedPages.delete(key);
        item.classList.remove('selected');
    }
    
    updateMultiSelectCount();
}
function updateMultiSelectCount() {
    const countEl = document.getElementById('multiSelectCount');
    if (countEl) {
        countEl.textContent = `${state.selectedPages.size} page(s) selected`;
    }
}
function selectAllInRange() {
    // Select all pages in current riwayah review queue
    const checkboxes = document.querySelectorAll('.multi-select-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = true;
        togglePageSelection(cb);
    });
}
function clearSelection() {
    state.selectedPages.clear();
    const checkboxes = document.querySelectorAll('.multi-select-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = false;
        cb.closest('.review-file-item').classList.remove('selected');
    });
    updateMultiSelectCount();
}
async function bulkMoveToCompleted() {
    if (state.selectedPages.size === 0) {
        showToast('No pages selected', 'error');
        return;
    }
    
    showLoading(true);
    let moved = 0;
    let failed = 0;
    
    for (const key of state.selectedPages) {
        const [riwayah, fileName] = key.split('_');
        const pageMatch = fileName.match(/^(\d+)/);
        if (!pageMatch) continue;
        
        const page = pageMatch[1].padStart(3, '0');
        const pageNum = parseInt(page, 10);
        const juz = getJuzFromPage(pageNum).toString().padStart(2, '0');
        
        try {
            // Create pt-completed.json first
            if (!isPageTasksCompleted(riwayah, page)) {
                createPageTasksCompletedJson(riwayah, page);
            }
            
            // Move file
            const sourcePaths = [
                path.join(state.projectFolder, riwayah, 'Ajza', juz, fileName),
                path.join(state.projectFolder, riwayah, 'Review Task', fileName)
            ];
            
            let sourcePath = null;
            for (const sp of sourcePaths) {
                if (fs.existsSync(sp)) {
                    sourcePath = sp;
                    break;
                }
            }
            
            if (sourcePath) {
                const destFolder = path.join(state.projectFolder, riwayah, 'Completed', 'Ajza', juz);
                const destPath = path.join(destFolder, fileName);
                
                if (!fs.existsSync(destFolder)) {
                    fs.mkdirSync(destFolder, { recursive: true });
                }
                
                if (!fs.existsSync(destPath)) {
                    fs.renameSync(sourcePath, destPath);
                    moved++;
                }
            } else {
                failed++;
            }
        } catch (e) {
            console.error('Error moving file:', e);
            failed++;
        }
    }
    
    showLoading(false);
    showToast(`Moved ${moved} files to Completed (${failed} failed)`, moved > 0 ? 'success' : 'error');
    
    clearSelection();
    invalidateQueueCache();
    refreshUI();
}
function toggleInProgressMultiSelectMode() {
    state.inProgressMultiSelectMode = !state.inProgressMultiSelectMode;
    state.selectedInProgressPages.clear();
    
    // Close Review multi-select if open
    if (state.inProgressMultiSelectMode && state.multiSelectMode) {
        toggleMultiSelectMode();
    }
    
    const controls = document.getElementById('inProgressMultiSelectControls');
    const toggleBtn = document.getElementById('toggleInProgressMultiSelectBtn');
    const riwayahBtn = document.getElementById('selectAllInProgressRiwayahBtn');
    
    if (state.inProgressMultiSelectMode) {
        controls.classList.remove('hidden');
        if (toggleBtn) {
            toggleBtn.classList.add('active');
            toggleBtn.title = 'Exit Multi-Select';
        }
        // Show "Select All in Riwayah" only if exactly one riwayah is selected
        if (riwayahBtn) {
            const isSingleRiwayah = state.inProgressRiwayahFilter && state.inProgressRiwayahFilter !== 'all' && state.inProgressRiwayahFilter.split(',').length === 1;
            riwayahBtn.classList.toggle('hidden', !isSingleRiwayah);
        }
    } else {
        controls.classList.add('hidden');
        if (toggleBtn) {
            toggleBtn.classList.remove('active');
            toggleBtn.title = 'Multi-Select';
        }
    }
    
    updateInProgressQueueForMultiSelect();
}
function updateInProgressQueueForMultiSelect() {
    const items = document.querySelectorAll('.in-progress-file-item');
    items.forEach(item => {
        if (state.inProgressMultiSelectMode) {
            item.classList.add('multi-select-mode');
            
            // Add checkbox if not exists
            if (!item.querySelector('.multi-select-checkbox')) {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'multi-select-checkbox';
                checkbox.dataset.filename = item.dataset.filename;
                checkbox.dataset.riwayah = item.dataset.riwayah;
                // Stop propagation so clicking checkbox doesn't trigger div click
                checkbox.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
                checkbox.addEventListener('change', (e) => {
                    toggleInProgressPageSelection(e.target);
                });
                item.appendChild(checkbox);
            }
        } else {
            item.classList.remove('multi-select-mode', 'selected');
            const checkbox = item.querySelector('.multi-select-checkbox');
            if (checkbox) checkbox.remove();
        }
    });
    
    updateInProgressMultiSelectCount();
}
function toggleInProgressPageSelection(checkbox) {
    const key = `${checkbox.dataset.riwayah}_${checkbox.dataset.filename}`;
    const item = checkbox.closest('.in-progress-file-item');
    
    if (checkbox.checked) {
        state.selectedInProgressPages.add(key);
        item.classList.add('selected');
    } else {
        state.selectedInProgressPages.delete(key);
        item.classList.remove('selected');
    }
    
    updateInProgressMultiSelectCount();
}
function updateInProgressMultiSelectCount() {
    const countEl = document.getElementById('inProgressMultiSelectCount');
    if (countEl) {
        countEl.textContent = `${state.selectedInProgressPages.size} page(s) selected`;
    }
}
function selectAllInProgressInRange() {
    // Select all pages in in-progress queue
    const checkboxes = document.querySelectorAll('#inProgressFilesList .multi-select-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = true;
        toggleInProgressPageSelection(cb);
    });
}
function clearInProgressSelection() {
    state.selectedInProgressPages.clear();
    const checkboxes = document.querySelectorAll('#inProgressFilesList .multi-select-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = false;
        cb.closest('.in-progress-file-item').classList.remove('selected');
    });
    updateInProgressMultiSelectCount();
}
async function bulkMoveInProgressToCompleted() {
    if (state.selectedInProgressPages.size === 0) {
        showToast('No pages selected', 'error');
        return;
    }
    
    showLoading(true);
    let moved = 0;
    let failed = 0;
    
    for (const key of state.selectedInProgressPages) {
        const [riwayah, fileName] = key.split('_');
        const pageMatch = fileName.match(/^(\d+)/);
        if (!pageMatch) continue;
        
        const page = pageMatch[1].padStart(3, '0');
        const pageNum = parseInt(page, 10);
        const juz = getJuzFromPage(pageNum).toString().padStart(2, '0');
        
        try {
            // Create pt-completed.json first
            if (!isPageTasksCompleted(riwayah, page)) {
                createPageTasksCompletedJson(riwayah, page);
            }
            
            // Move file from Ajza to Completed
            const sourcePath = path.join(state.projectFolder, riwayah, 'Ajza', juz, fileName);
            
            if (fs.existsSync(sourcePath)) {
                const destFolder = path.join(state.projectFolder, riwayah, 'Completed', 'Ajza', juz);
                const destPath = path.join(destFolder, fileName);
                
                if (!fs.existsSync(destFolder)) {
                    fs.mkdirSync(destFolder, { recursive: true });
                }
                
                if (!fs.existsSync(destPath)) {
                    fs.renameSync(sourcePath, destPath);
                    moved++;
                }
            } else {
                failed++;
            }
        } catch (e) {
            console.error('Error moving file:', e);
            failed++;
        }
    }
    
    showLoading(false);
    showToast(`Moved ${moved} files to Completed (${failed} failed)`, moved > 0 ? 'success' : 'error');
    
    clearInProgressSelection();
    invalidateQueueCache();
    refreshUI();
}
