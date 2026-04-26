function loadUserAssignments() {
    try {
        // Always create assignments from current config users (not from file)
        USER_ASSIGNMENTS = createDefaultUserAssignments();
        
        // Save to file for reference only
        try {
            const assignmentsPath = path.join(state.tasksFolder, 'user-assignments.json');
            fs.writeFileSync(assignmentsPath, JSON.stringify(USER_ASSIGNMENTS, null, 2));
        } catch (saveErr) {
            console.log('Could not save assignments file (non-critical)');
        }
        
        console.log('User assignments loaded from config:', Object.keys(USER_ASSIGNMENTS));
    } catch (e) {
        console.error('Error loading user assignments:', e);
        USER_ASSIGNMENTS = createDefaultUserAssignments();
    }
    populateUserFilterDropdown();
}

// Create default user assignments from config users
function createDefaultUserAssignments() {
    const users = getUsers();
    const assignments = {};
    
    // Specific surah assignments for main users
    const surahAssignments = {
        'saad': [1, 9],
        'muzakkir': [10, 28],
        'umar': [29, 114]
    };
    
    // Create assignments for all users in config (lowercase keys)
    Object.keys(users).forEach((username) => {
        const lowerName = username.toLowerCase();
        // Use specific assignment if exists, otherwise full range
        const surahRange = surahAssignments[lowerName] || [1, 114];
        
        assignments[lowerName] = { 
            name: lowerName.charAt(0).toUpperCase() + lowerName.slice(1), 
            riwayah: 'warsh', 
            surahRange: surahRange
        };
    });
    
    return assignments;
}

// Save user assignments to JSON file
function saveUserAssignments() {
    try {
        const assignmentsPath = path.join(state.tasksFolder, 'user-assignments.json');
        fs.writeFileSync(assignmentsPath, JSON.stringify(USER_ASSIGNMENTS, null, 2));
    } catch (e) {
        console.error('Error saving user assignments:', e);
    }
}

// Populate user filter dropdown
function populateUserFilterDropdown() {
    const optionsContainer = document.getElementById('userFilterOptions');
    const trigger = document.getElementById('userFilterTrigger');
    
    console.log('populateUserFilterDropdown called:', { optionsContainer: !!optionsContainer, trigger: !!trigger });
    
    if (!optionsContainer || !trigger) {
        console.error('User filter elements not found in populateUserFilterDropdown');
        return;
    }
    
    // Clear existing options except "All Users"
    optionsContainer.innerHTML = '<div class="custom-dropdown-option selected" data-value="all">ALL USERS</div>';
    
    Object.entries(USER_ASSIGNMENTS).forEach(([key, user]) => {
        const option = document.createElement('div');
        option.className = 'custom-dropdown-option';
        option.dataset.value = key.toLowerCase(); // Store as lowercase
        option.textContent = (user.name || key).toUpperCase(); // Display as uppercase
        optionsContainer.appendChild(option);
    });
    
    // Setup click handlers
    optionsContainer.querySelectorAll('.custom-dropdown-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            const value = opt.dataset.value;
            state.inProgressUserFilter = value;
            trigger.textContent = opt.textContent;
            
            // Update selected class
            optionsContainer.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            
            // Close dropdown
            optionsContainer.classList.add('hidden');
            
            saveInProgressFilters();
            loadInProgressFiles();
        });
    });
    
    // Restore saved selection
    if (state.inProgressUserFilter && state.inProgressUserFilter !== 'all') {
        const savedOption = optionsContainer.querySelector(`[data-value="${state.inProgressUserFilter}"]`);
        if (savedOption) {
            trigger.textContent = savedOption.textContent;
            optionsContainer.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('selected'));
            savedOption.classList.add('selected');
        }
    }
}

function setupUserFilterDropdown() {
    const trigger = document.getElementById('userFilterTrigger');
    const options = document.getElementById('userFilterOptions');
    const dropdown = document.getElementById('userFilterDropdown');
    
    console.log('setupUserFilterDropdown called:', { trigger: !!trigger, options: !!options, dropdown: !!dropdown });
    
    if (!trigger || !options || !dropdown) {
        console.error('User filter dropdown elements not found');
        return;
    }
    
    // Prevent duplicate listeners
    if (dropdown.dataset.wired === 'true') {
        console.log('User filter dropdown already wired, skipping');
        return;
    }
    dropdown.dataset.wired = 'true';
    
    trigger.addEventListener('click', (e) => {
        console.log('User filter trigger clicked');
        e.stopPropagation();
        options.classList.toggle('hidden');
        console.log('Dropdown hidden:', options.classList.contains('hidden'));
    });
    
    // Prevent clicks inside options from closing
    options.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    // Close when clicking outside the dropdown
    document.addEventListener('click', () => {
        options.classList.add('hidden');
    });
    
    console.log('User filter dropdown setup complete');
}

// Get assigned user for a page (based on riwayah-specific assignments)
function getAssignedUserForPage(pageNum, riwayah) {
    const surahInfo = getSurahInfoFromPage(pageNum);
    if (!surahInfo) return null;
    
    const fromSurah = surahInfo.fromSurah;
    
    // Check which user this page belongs to based on their assigned riwayah and surah range
    for (const [userKey, assignment] of Object.entries(USER_ASSIGNMENTS)) {
        // Check if this riwayah matches the user's assigned riwayah
        if (riwayah.toLowerCase() !== assignment.riwayah.toLowerCase()) {
            continue;
        }
        
        const [startSurah, endSurah] = assignment.surahRange;
        if (fromSurah >= startSurah && fromSurah <= endSurah) {
            return userKey.toLowerCase(); // Return lowercase for consistent comparison
        }
    }
    
    return null;
}
