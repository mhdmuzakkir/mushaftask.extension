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
    select.innerHTML = '<option value="">Select Riwayah...</option>';
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
    if (!riwayah) {
        showToast('Please select a riwayah', 'error');
        return;
    }
    if (updateRiwayahInfo(riwayah, { arabicName, color })) {
        showToast(`Riwayah ${riwayah} updated`, 'success');
        hideEditRiwayahModal();
        // Refresh UI elements that show riwayah names/colors
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
        const canEdit = isSuperAdmin || (!isMuzakkir && authState.isAdmin);
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
        if (lowerUsername === 'muzakkir' && authState.currentUser !== 'muzakkir') {
            showToast('Only Muzakkir can modify the Muzakkir account', 'error');
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
        if (confirm(`Are you sure you want to delete user ${username}?`)) {
            delete authState.config.users[lowerUsername];
            saveConfig();
            showToast(`User ${username} deleted`, 'success');
            populateUserSettingsTable();
            populateSettingsUserSelect();
            return true;
        }
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
