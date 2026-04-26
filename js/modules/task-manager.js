function loadRiwayahTasks(riwayah) {
    try {
        const tasksFile = path.join(state.tasksFolder, 'riwayah-tasks', riwayah, 'riwayah-tasks.json');
        if (fs.existsSync(tasksFile)) {
            const data = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
            return data.tasks || [];
        }
    } catch (e) {
        console.error('Error loading riwayah tasks:', e);
    }
    return [];
}
function saveRiwayahTasks(riwayah, tasks) {
    try {
        const riwayahPath = path.join(state.tasksFolder, 'riwayah-tasks', riwayah);
        if (!fs.existsSync(riwayahPath)) {
            fs.mkdirSync(riwayahPath, { recursive: true });
        }
        
        const tasksFile = path.join(riwayahPath, 'riwayah-tasks.json');
        const data = {
            riwayah: riwayah,
            created: formatDate(),
            tasks: tasks
        };
        fs.writeFileSync(tasksFile, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error('Error saving riwayah tasks:', e);
        return false;
    }
}
function isPageTasksCompleted(riwayah, page) {
    if (!riwayah || !page) return false;
    try {
        const ptCompletedFile = path.join(state.tasksFolder, 'pt-completed', riwayah, `${page}-pt-completed.json`);
        return fs.existsSync(ptCompletedFile);
    } catch (e) {
        return false;
    }
}
function createPageTasksCompletedJson(riwayah, page) {
    const key = `${riwayah}_${page}_pt`;
    const now = Date.now();
    
    if (state._lastPtCompletedJsonTime && state._lastPtCompletedJsonKey === key && (now - state._lastPtCompletedJsonTime) < 5000) {
        console.log('Throttling pt-completed.json creation for', key);
        return true;
    }
    state._lastPtCompletedJsonTime = now;
    state._lastPtCompletedJsonKey = key;
    
    try {
        const ptCompletedDir = path.join(state.tasksFolder, 'pt-completed', riwayah);
        
        if (!fs.existsSync(ptCompletedDir)) {
            fs.mkdirSync(ptCompletedDir, { recursive: true });
        }
        
        const ptCompletedFile = path.join(ptCompletedDir, `${page}-pt-completed.json`);
        
        const completionData = {
            page: parseInt(page, 10),
            pageFormatted: page,
            riwayah: riwayah,
            juz: state.currentJuz,
            completedAt: new Date().toISOString(),
            completedDate: formatDate(),
            status: 'page_tasks_completed',
            type: 'page_tasks_only',
            source: 'mushaf_task_manager',
            tasksTotal: state.pageTasks.length + state.projectTasks.length,
            pageTasksTotal: state.pageTasks.length,
            projectTasksTotal: state.projectTasks.length,
            pageTasksCompleted: state.pageTasks.filter(t => t.completed).length,
            projectTasksCompleted: state.pageProjectCompletions.length,
            completionCount: 1
        };
        
        let dataToSave;
        
        if (fs.existsSync(ptCompletedFile)) {
            try {
                const existingData = JSON.parse(fs.readFileSync(ptCompletedFile, 'utf8'));
                
                if (Array.isArray(existingData)) {
                    completionData.completionCount = existingData.length + 1;
                    existingData.push(completionData);
                    dataToSave = existingData;
                    console.log(`Appending page task completion #${completionData.completionCount} to existing file`);
                } else if (typeof existingData === 'object' && existingData !== null) {
                    existingData.completionCount = 1;
                    completionData.completionCount = 2;
                    dataToSave = [existingData, completionData];
                    console.log(`Converting to array and adding re-submission`);
                } else {
                    dataToSave = [completionData];
                }
            } catch (parseError) {
                console.error('Error parsing existing pt-completed.json:', parseError);
                dataToSave = [completionData];
            }
        } else {
            dataToSave = [completionData];
            console.log(`Created page tasks completion marker: ${ptCompletedFile}`);
        }
        
        fs.writeFileSync(ptCompletedFile, JSON.stringify(dataToSave, null, 2));
        return true;
        
    } catch (e) {
        console.error('Error creating pt-completed.json:', e);
        return false;
    }
}
function submitPageTasks() {
    if (!state.currentRiwayah || !state.currentPage) {
        console.log('No file open');
        return;
    }
    
    if (isPageCompleted(state.currentRiwayah, state.currentPage)) {
        console.log('Page is already fully completed');
        return;
    }
    
    if (state.pageTasks.length === 0) {
        console.log('No page tasks to submit');
        return;
    }
    
    const incompleteTasks = state.pageTasks.filter(t => !t.completed);
    if (incompleteTasks.length > 0) {
        console.log('Cannot submit: not all page tasks are completed');
        return;
    }
    
    showLoading(true);
    const success = createPageTasksCompletedJson(state.currentRiwayah, state.currentPage);
    showLoading(false);
    
    if (success) {
        console.log('Page tasks submitted successfully - pt-completed.json created');
        updatePageTasksSubmitButton();
        invalidateQueueCache();
        refreshUI();
    } else {
        console.log('Failed to submit page tasks');
    }
}
function updatePageTasksSubmitButton() {
    const submitBtn = document.getElementById('submitPageTasksBtn');
    if (!submitBtn) return;
    
    if (!state.currentPage || isPageCompleted(state.currentRiwayah, state.currentPage)) {
        submitBtn.classList.add('hidden');
        return;
    }
    
    const hasPageTasks = state.pageTasks.length > 0;
    const allPageTasksDone = hasPageTasks && state.pageTasks.every(t => t.completed);
    const alreadySubmitted = isPageTasksCompleted(state.currentRiwayah, state.currentPage);
    
    if (allPageTasksDone && !alreadySubmitted) {
        submitBtn.classList.remove('hidden');
        submitBtn.textContent = 'Submit Page Tasks';
        submitBtn.disabled = false;
    } else if (alreadySubmitted) {
        submitBtn.classList.remove('hidden');
        submitBtn.textContent = 'Page Tasks Submitted ✓';
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.6';
    } else {
        submitBtn.classList.add('hidden');
    }
}
function isPageCompleted(riwayah, page) {
    if (!riwayah || !page) return false;
    try {
        const completedFile = path.join(state.tasksFolder, 'completed', riwayah, `${page}-completed.json`);
        return fs.existsSync(completedFile);
    } catch (e) {
        return false;
    }
}
function loadPageData(riwayah, page) {
    const completedExists = isPageCompleted(riwayah, page);
    const pageTasksSubmitted = isPageTasksCompleted(riwayah, page);
    
    if (completedExists) {
        const allProjectTasks = loadRiwayahTasks(riwayah);
        console.log(`Page ${page} is completed via completed.json - no page tasks shown`);
        return { 
            tasks: [],
            completedProjectTasks: allProjectTasks.map(t => t.id),
            isCompleted: true
        };
    }
    
    if (pageTasksSubmitted) {
        try {
            const pageFile = path.join(state.tasksFolder, 'page-tasks', riwayah, `${page}-tasks.json`);
            if (fs.existsSync(pageFile)) {
                const data = JSON.parse(fs.readFileSync(pageFile, 'utf8'));
                const submittedTasks = (data.tasks || []).map(t => ({...t, completed: true}));
                console.log(`Page ${page} has pt-completed.json - marking ${submittedTasks.length} tasks as completed`);
                return {
                    tasks: submittedTasks,
                    completedProjectTasks: data.completedProjectTasks || [],
                    isCompleted: false,
                    isPageTasksSubmitted: true
                };
            }
        } catch (e) {
            console.error('Error loading page data with pt-completed:', e);
        }
    }
    
    try {
        const pageFile = path.join(state.tasksFolder, 'page-tasks', riwayah, `${page}-tasks.json`);
        console.log('Looking for page tasks at:', pageFile);
        console.log('tasksFolder:', state.tasksFolder, 'riwayah:', riwayah, 'page:', page);
        if (fs.existsSync(pageFile)) {
            const data = JSON.parse(fs.readFileSync(pageFile, 'utf8'));
            console.log(`Found page tasks for ${page}:`, data.tasks ? data.tasks.length : 0, 'tasks');
            return {
                tasks: data.tasks || [],
                completedProjectTasks: data.completedProjectTasks || [],
                isCompleted: false
            };
        } else {
            console.log('Page tasks file not found:', pageFile);
        }
    } catch (e) {
        console.error('Error loading page data:', e);
    }
    return { tasks: [], completedProjectTasks: [], isCompleted: false };
}
function savePageData(riwayah, page, tasks, completedProjectTasks) {
    if (isPageCompleted(riwayah, page)) {
        console.log('Page is completed, skipping page-tasks.json save');
        return true;
    }
    
    try {
        const pagesPath = path.join(state.tasksFolder, 'page-tasks', riwayah);
        if (!fs.existsSync(pagesPath)) {
            fs.mkdirSync(pagesPath, { recursive: true });
        }
        
        const juz = getJuzFromPage(parseInt(page, 10));
        const pageFile = path.join(pagesPath, `${page}-tasks.json`);
        const data = {
            page: page,
            riwayah: riwayah,
            juz: juz,
            tasks: tasks,
            completedProjectTasks: completedProjectTasks
        };
        fs.writeFileSync(pageFile, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error('Error saving page data:', e);
        return false;
    }
}
function isFileCompleted(riwayah, page) {
    try {
        const juz = getJuzFromPage(parseInt(page, 10)).toString().padStart(2, '0');
        const completedFile = path.join(state.projectFolder, riwayah, 'Completed', 'Ajza', juz, `${page}-${riwayah}.ai`);
        return fs.existsSync(completedFile);
    } catch (e) {
        return false;
    }
}
function handleTaskToggle(index, isPageTask, taskId, isChecked, itemElement) {
    if (isPageCompleted(state.currentRiwayah, state.currentPage)) {
        console.log('This page is already completed');
        return;
    }
    
    if (isPageTask) {
        state.pageTasks[index].completed = isChecked;
        savePageData(state.currentRiwayah, state.currentPage, state.pageTasks, state.pageProjectCompletions);
    } else {
        if (isChecked) {
            if (!state.pageProjectCompletions.includes(taskId)) {
                state.pageProjectCompletions.push(taskId);
            }
        } else {
            state.pageProjectCompletions = state.pageProjectCompletions.filter(id => id !== taskId);
        }
        savePageData(state.currentRiwayah, state.currentPage, state.pageTasks, state.pageProjectCompletions);
        state.projectTasks[index].completed = isChecked;
    }
    
    itemElement.classList.toggle('completed', isChecked);
    updateProgress();
    updateCompleteAllButton(isPageTask);
}
function toggleCompleteAll(isPageTask) {
    if (isPageTask) return;
    
    const now = Date.now();
    if (state.isToggling && (now - state.lastToggleTime) < 1000) {
        console.log('Toggle blocked: too soon');
        return;
    }
    state.isToggling = true;
    state.lastToggleTime = now;
    
    if (isPageCompleted(state.currentRiwayah, state.currentPage)) {
        console.log('This page is already completed');
        state.isToggling = false;
        return;
    }
    
    try {
        const allCompleted = state.projectTasks.every(t => 
            state.pageProjectCompletions.includes(t.id)
        );
        
        if (allCompleted) {
            state.pageProjectCompletions = [];
            state.projectTasks.forEach(task => task.completed = false);
            console.log('All tasks unchecked');
        } else {
            state.pageProjectCompletions = state.projectTasks.map(t => t.id);
            state.projectTasks.forEach(task => task.completed = true);
            console.log('All tasks completed');
        }
        
        savePageData(state.currentRiwayah, state.currentPage, state.pageTasks, state.pageProjectCompletions);
        
        const displayProjectTasks = state.projectTasks.map(task => ({
            ...task,
            completed: state.pageProjectCompletions.includes(task.id)
        }));
        renderTaskList('projectTasks', displayProjectTasks, false, true);
        updateProgress();
        updateCompleteAllButton(false);
    } finally {
        setTimeout(() => {
            state.isToggling = false;
        }, 500);
    }
}
function updateCompleteAllButton(isPageTask) {
    const btn = document.getElementById('completeAllBtn');
    if (!btn || isPageTask) return;
    
    const allCompleted = state.projectTasks.every(t => 
        state.pageProjectCompletions.includes(t.id)
    );
    
    btn.textContent = allCompleted ? 'Uncheck All' : 'Complete All';
}
function loadPageTasksForCurrent() {
    if (!state.currentRiwayah || !state.currentPage) return;
    
    state.projectTasks = loadRiwayahTasks(state.currentRiwayah);
    const pageData = loadPageData(state.currentRiwayah, state.currentPage);
    state.pageTasks = pageData.tasks;
    state.pageProjectCompletions = pageData.completedProjectTasks;
    
    const displayProjectTasks = state.projectTasks.map(task => ({
        ...task,
        completed: state.pageProjectCompletions.includes(task.id)
    }));
    
    renderTaskList('projectTasks', displayProjectTasks, false, true);
    renderTaskList('pageTasks', state.pageTasks, true, false);
    updateProgress();
    
    if (pageData.isCompleted) {
        console.log('This page is already completed - all tasks marked as done');
    }
}
