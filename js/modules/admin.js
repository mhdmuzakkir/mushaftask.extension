function showAddUserModal() {
    document.getElementById('addUserModal').classList.remove('hidden');
    document.getElementById('newUsername').value = '';
    document.getElementById('newUserPassword').value = '';
    document.getElementById('newUserIsAdmin').checked = false;
}
function hideAddUserModal() {
    document.getElementById('addUserModal').classList.add('hidden');
}
function handleAddUser() {
    const username = document.getElementById('newUsername').value.trim().toLowerCase();
    const password = document.getElementById('newUserPassword').value;
    const isAdmin = document.getElementById('newUserIsAdmin').checked;
    if (!username) {
        showToast('Please enter a username', 'error');
        return;
    }
    if (!password) {
        showToast('Please enter a password', 'error');
        return;
    }
    if (userExists(username)) {
        showToast('User already exists', 'error');
        return;
    }
    if (addUser(username, password, isAdmin)) {
        showToast(`User ${username} added successfully`, 'success');
        hideAddUserModal();
        populateSettingsUserSelect();
    } else {
        showToast('Failed to add user', 'error');
    }
}
function showResetPasswordModal() {
    const select = document.getElementById('resetUserSelect');
    select.innerHTML = '';
    const users = getUsers();
    Object.keys(users).sort().forEach(username => {
        const option = document.createElement('option');
        option.value = username;
        option.textContent = username.charAt(0).toUpperCase() + username.slice(1);
        select.appendChild(option);
    });
    document.getElementById('resetNewPassword').value = '';
    document.getElementById('resetPasswordModal').classList.remove('hidden');
}
function hideResetPasswordModal() {
    document.getElementById('resetPasswordModal').classList.add('hidden');
}
function handleResetPassword() {
    const username = document.getElementById('resetUserSelect').value;
    const newPassword = document.getElementById('resetNewPassword').value;
    if (!username || !newPassword) {
        showToast('Please select a user and enter new password', 'error');
        return;
    }
    if (resetUserPassword(username, newPassword)) {
        showToast(`Password reset for ${username}`, 'success');
        hideResetPasswordModal();
    } else {
        showToast('Failed to reset password', 'error');
    }
}
function showEditRiwayahModal() {
    const select = document.getElementById('editRiwayahSelect');
    select.innerHTML = '<option value="">اختر الرواية</option>';
    try {
        if (state.tasksFolder && fs.existsSync(state.tasksFolder)) {
            const riwayahTasksPath = path.join(state.tasksFolder, 'riwayah-tasks');
            if (fs.existsSync(riwayahTasksPath)) {
                const riwayahs = fs.readdirSync(riwayahTasksPath, { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => dirent.name)
                    .sort();
                riwayahs.forEach(r => {
                    const option = document.createElement('option');
                    option.value = r;
                    option.textContent = r;
                    select.appendChild(option);
                });
            }
        }
    } catch (e) {
        console.error('Error loading riwayahs for edit:', e);
    }
    document.getElementById('editRiwayahArabicName').value = '';
    document.getElementById('editRiwayahColor').value = '#9b59b6';
    document.getElementById('editColorPreview').style.backgroundColor = '#9b59b6';
    document.getElementById('editRiwayahModal').classList.remove('hidden');
}
function hideEditRiwayahModal() {
    document.getElementById('editRiwayahModal').classList.add('hidden');
}
function handleEditRiwayahSave() {
    const riwayah = document.getElementById('editRiwayahSelect').value;
    const arabicName = document.getElementById('editRiwayahArabicName').value.trim();
    const color = document.getElementById('editRiwayahColor').value;
    const tasksText = document.getElementById('editRiwayahTasks').value;
    if (!riwayah) {
        showToast('Please select a riwayah', 'error');
        return;
    }
    // Build task list preserving IDs for existing titles
    const existingTasks = loadRiwayahTasks(riwayah);
    const titles = tasksText.split('\n').map(t => t.trim()).filter(t => t);
    const taskList = titles.map(function(title) {
        const existing = existingTasks.find(function(t) { return t.title === title; });
        if (existing) return existing;
        return {
            id: generateId('task'),
            title: title,
            completed: false,
            assigned: '',
            description: ''
        };
    });
    var tasksSaved = saveRiwayahTasks(riwayah, taskList);
    var infoSaved = updateRiwayahInfo(riwayah, { arabicName, color });
    if (tasksSaved && infoSaved) {
        showToast(`Riwayah ${riwayah} updated`, 'success');
        hideEditRiwayahModal();
        populateRiwayahDropdown();
        refreshUI();
    } else {
        showToast('Failed to update riwayah', 'error');
    }
}
function showUserSettingsModal() {
    populateUserSettingsTable();
    document.getElementById('userSettingsModal').classList.remove('hidden');
}
function hideUserSettingsModal() {
    document.getElementById('userSettingsModal').classList.add('hidden');
}
function populateUserSettingsTable() {
    const tbody = document.getElementById('userSettingsTableBody');
    if (!tbody) return;
    const users = getUsers();
    const currentUser = authState.currentUser?.toLowerCase();
    const isSuperAdmin = currentUser === 'muzakkir';
    
    if (!users || Object.keys(users).length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-cell">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = Object.entries(users).map(([username, user]) => {
        const isMuzakkir = username === 'muzakkir';
        const canEdit = !isMuzakkir && (isSuperAdmin || authState.isAdmin);
        const adminCheckbox = `<input type="checkbox" class="user-admin-toggle" data-user="${username}" ${user.isAdmin ? 'checked' : ''} ${!canEdit ? 'disabled' : ''}>`;
        const deleteBtn = canEdit && !isMuzakkir 
            ? `<button class="btn-link btn-small user-delete-btn" data-user="${username}">Delete</button>` 
            : '<span class="text-muted">-</span>';
        return `
            <tr>
                <td>${username.charAt(0).toUpperCase() + username.slice(1)}${isMuzakkir ? ' <span class="super-admin-badge">Super Admin</span>' : ''}</td>
                <td>${adminCheckbox}</td>
                <td>${deleteBtn}</td>
            </tr>
        `;
    }).join('');
    
    // Attach listeners
    tbody.querySelectorAll('.user-admin-toggle').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const targetUser = e.target.dataset.user;
            updateUserAdminStatus(targetUser, e.target.checked);
        });
    });
    tbody.querySelectorAll('.user-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetUser = e.target.dataset.user;
            deleteUser(targetUser);
        });
    });
}
function updateUserAdminStatus(username, isAdmin) {
    try {
        if (!authState.config) loadConfig();
        const lowerUsername = username.toLowerCase();
        // Super-admin protection
        if (lowerUsername === 'muzakkir') {
            showToast('Muzakkir cannot be removed from admin', 'error');
            populateUserSettingsTable(); // revert checkbox
            return false;
        }
        if (authState.config.users[lowerUsername]) {
            authState.config.users[lowerUsername].isAdmin = isAdmin;
            saveConfig();
            showToast(`User ${username} updated`, 'success');
            populateUserSettingsTable();
            return true;
        }
        return false;
    } catch (e) {
        console.error('Error updating user admin status:', e);
        showToast('Failed to update user', 'error');
        return false;
    }
}
function deleteUser(username) {
    try {
        if (!authState.config) loadConfig();
        const lowerUsername = username.toLowerCase();
        if (lowerUsername === 'muzakkir') {
            showToast('Cannot delete the super admin account', 'error');
            return false;
        }
        if (lowerUsername === authState.currentUser?.toLowerCase()) {
            showToast('Cannot delete your own account while logged in', 'error');
            return false;
        }
        showConfirm('Are you sure you want to delete user ' + username + '?', function() {
            delete authState.config.users[lowerUsername];
            saveConfig();
            showToast('User ' + username + ' deleted', 'success');
            populateUserSettingsTable();
            populateSettingsUserSelect();
        });
        return false;
    } catch (e) {
        console.error('Error deleting user:', e);
        showToast('Failed to delete user', 'error');
        return false;
    }
}
function populateSettingsUserSelect() {
    const select = document.getElementById('settingsUserSelect');
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '<option value="">Select User...</option>';
    const users = getUsers();
    Object.keys(users).sort().forEach(username => {
        const option = document.createElement('option');
        option.value = username;
        option.textContent = username.charAt(0).toUpperCase() + username.slice(1);
        select.appendChild(option);
    });
    if (currentValue) {
        select.value = currentValue;
    }
}

// ==================== MOVE TO RECHECK ====================
function showMoveToRecheckModal() {
    const select = document.getElementById('moveToRecheckSelect');
    if (!select) return;
    select.innerHTML = '<option value="">اختر الرواية</option>';
    try {
        if (state.tasksFolder && fs.existsSync(state.tasksFolder)) {
            const riwayahTasksPath = path.join(state.tasksFolder, 'riwayah-tasks');
            if (fs.existsSync(riwayahTasksPath)) {
                const riwayahs = fs.readdirSync(riwayahTasksPath, { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => dirent.name)
                    .sort();
                riwayahs.forEach(r => {
                    const option = document.createElement('option');
                    option.value = r;
                    option.textContent = r;
                    select.appendChild(option);
                });
            }
        }
    } catch (e) {
        console.error('Error loading riwayahs for recheck:', e);
    }
    document.getElementById('recheckStatusDisplay').textContent = '-';
    document.getElementById('moveToRecheckModal').classList.remove('hidden');
}

function hideMoveToRecheckModal() {
    document.getElementById('moveToRecheckModal').classList.add('hidden');
}

function updateRecheckModalStatus(e) {
    const riwayah = e.target.value;
    const display = document.getElementById('recheckStatusDisplay');
    if (!riwayah || !display) return;
    const status = getRiwayahStatus(riwayah);
    display.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    display.style.color = status === 'recheck' ? '#e67e22' : (status === 'completed' ? '#4a9eff' : '#2ecc71');
}

function handleMoveToRecheck() {
    const select = document.getElementById('moveToRecheckSelect');
    if (!select || !select.value) {
        showToast('Please select a riwayah', 'error');
        return;
    }
    const riwayah = select.value;
    const status = getRiwayahStatus(riwayah);
    if (status === 'recheck') {
        showToast('This riwayah is already in recheck', 'error');
        return;
    }
    showConfirm('Are you sure you want to move ALL completed pages of ' + riwayah + ' to Recheck?', function() {
        if (moveRiwayahToRecheck(riwayah)) {
            hideMoveToRecheckModal();
            refreshQueues(true);
        }
    });
}

// ==================== MANAGE ASSIGNMENTS ====================
function showManageAssignmentsModal() {
    populateAssignmentsTable();
    document.getElementById('manageAssignmentsModal').classList.remove('hidden');
}

function hideManageAssignmentsModal() {
    document.getElementById('manageAssignmentsModal').classList.add('hidden');
}

function getAvailableRiwayahs() {
    const riwayahs = [];
    try {
        if (state.tasksFolder && fs.existsSync(state.tasksFolder)) {
            const riwayahTasksPath = path.join(state.tasksFolder, 'riwayah-tasks');
            if (fs.existsSync(riwayahTasksPath)) {
                const items = fs.readdirSync(riwayahTasksPath, { withFileTypes: true });
                items.forEach(item => {
                    if (item.isDirectory()) riwayahs.push(item.name);
                });
            }
        }
    } catch (e) {
        console.error('Error reading riwayahs:', e);
    }
    return riwayahs.sort();
}

function buildRiwayahSelectHtml(selectedRiwayah, riwayahs) {
    const options = riwayahs.map(r => `<option value="${r}" ${r.toLowerCase() === (selectedRiwayah || '').toLowerCase() ? 'selected' : ''}>${r}</option>`).join('');
    return `<select class="assignment-riwayah" style="width: 100%; background: #1a1a1a; border: 1px solid #444; color: #fff; padding: 4px; font-size: 12px; border-radius: 3px; cursor: pointer;">
        <option value="">اختر الرواية</option>
        ${options}
    </select>`;
}

function populateAssignmentsTable() {
    const tbody = document.getElementById('assignmentsTableBody');
    if (!tbody) return;
    const users = getUsers();
    const assignments = USER_ASSIGNMENTS || {};
    const riwayahs = getAvailableRiwayahs();
    
    tbody.innerHTML = '';
    Object.keys(users).sort().forEach(username => {
        const lowerName = username.toLowerCase();
        const userData = assignments[lowerName] || { name: lowerName, assignments: { warsh: [1, 114] } };
        const userAssignments = userData.assignments || {};
        const riwayahEntries = Object.entries(userAssignments);
        
        // User header row
        const headerTr = document.createElement('tr');
        headerTr.className = 'assignment-user-header';
        headerTr.innerHTML = `<td colspan="3">${username.charAt(0).toUpperCase() + username.slice(1)}</td>`;
        tbody.appendChild(headerTr);
        
        // Assignment rows
        riwayahEntries.forEach(([riwayah, range]) => {
            const tr = document.createElement('tr');
            tr.className = 'assignment-row';
            tr.dataset.user = lowerName;
            tr.innerHTML = `
                <td>${buildRiwayahSelectHtml(riwayah, riwayahs)}</td>
                <td>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <input type="number" class="assignment-from" value="${range[0]}" min="1" max="114" style="width: 60px; background: #1a1a1a; border: 1px solid #444; color: #fff; padding: 4px; font-size: 12px; border-radius: 3px;">
                        <span style="color: var(--text-muted);">-</span>
                        <input type="number" class="assignment-to" value="${range[1]}" min="1" max="114" style="width: 60px; background: #1a1a1a; border: 1px solid #444; color: #fff; padding: 4px; font-size: 12px; border-radius: 3px;">
                    </div>
                </td>
                <td style="text-align: center;">
                    <button class="btn-remove-assignment" style="background: none; border: none; color: #e74c3c; cursor: pointer; font-size: 16px; padding: 2px 6px; line-height: 1;">×</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        // Add row
        const addTr = document.createElement('tr');
        addTr.className = 'assignment-add-row';
        addTr.innerHTML = `<td colspan="3" style="padding-bottom: 8px;">
            <button class="btn-add-riwayah" data-user="${lowerName}" style="background: rgba(74,158,255,0.1); border: 1px solid rgba(74,158,255,0.3); color: #4a9eff; padding: 4px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;">+ Add Riwayah</button>
        </td>`;
        tbody.appendChild(addTr);
    });
    
    if (tbody.innerHTML === '') {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-cell">No users found</td></tr>';
        return;
    }
    
    // Attach remove listeners
    tbody.querySelectorAll('.btn-remove-assignment').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const row = e.target.closest('.assignment-row');
            if (row) row.remove();
        });
    });
    
    // Attach add listeners
    tbody.querySelectorAll('.btn-add-riwayah').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const user = e.target.dataset.user;
            const addRow = e.target.closest('.assignment-add-row');
            const newTr = document.createElement('tr');
            newTr.className = 'assignment-row';
            newTr.dataset.user = user;
            newTr.innerHTML = `
                <td>${buildRiwayahSelectHtml('', riwayahs)}</td>
                <td>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <input type="number" class="assignment-from" value="1" min="1" max="114" style="width: 60px; background: #1a1a1a; border: 1px solid #444; color: #fff; padding: 4px; font-size: 12px; border-radius: 3px;">
                        <span style="color: var(--text-muted);">-</span>
                        <input type="number" class="assignment-to" value="114" min="1" max="114" style="width: 60px; background: #1a1a1a; border: 1px solid #444; color: #fff; padding: 4px; font-size: 12px; border-radius: 3px;">
                    </div>
                </td>
                <td style="text-align: center;">
                    <button class="btn-remove-assignment" style="background: none; border: none; color: #e74c3c; cursor: pointer; font-size: 16px; padding: 2px 6px; line-height: 1;">×</button>
                </td>
            `;
            newTr.querySelector('.btn-remove-assignment').addEventListener('click', (ev) => {
                newTr.remove();
            });
            addRow.parentNode.insertBefore(newTr, addRow);
        });
    });
}

function handleSaveAssignments() {
    const newAssignments = {};
    
    document.querySelectorAll('.assignment-row').forEach(row => {
        const user = row.dataset.user;
        if (!user) return;
        
        const riwayahInput = row.querySelector('.assignment-riwayah');
        const fromInput = row.querySelector('.assignment-from');
        const toInput = row.querySelector('.assignment-to');
        
        if (!riwayahInput || !fromInput || !toInput) return;
        
        const riwayah = riwayahInput.value.trim();
        if (!riwayah) return; // Skip empty riwayah rows
        
        const fromVal = parseInt(fromInput.value, 10) || 1;
        const toVal = parseInt(toInput.value, 10) || 114;
        
        if (!newAssignments[user]) {
            newAssignments[user] = {
                name: user.charAt(0).toUpperCase() + user.slice(1),
                assignments: {}
            };
        }
        
        newAssignments[user].assignments[riwayah] = [Math.min(fromVal, toVal), Math.max(fromVal, toVal)];
    });
    
    USER_ASSIGNMENTS = newAssignments;
    saveUserAssignments();
    populateUserFilterDropdown();
    showToast('Assignments saved', 'success');
    hideManageAssignmentsModal();
}
