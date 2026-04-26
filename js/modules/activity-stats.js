function getUserActivityPath(username) {
    if (!state.tasksFolder || !username) return null;
    return path.join(state.tasksFolder, 'activity', `activity-${username}.json`);
}
function loadActivityLog(username = null) {
    try {
        const user = username || authState.currentUser;
        if (!user) return [];
        
        const activityPath = getUserActivityPath(user);
        if (activityPath && fs.existsSync(activityPath)) {
            const data = JSON.parse(fs.readFileSync(activityPath, 'utf8'));
            return data.logs || [];
        }
    } catch (e) {
        console.error('Error loading activity log:', e);
    }
    return [];
}
function loadAllActivityLogs() {
    try {
        const users = getUsers();
        const allLogs = [];
        Object.keys(users).forEach(username => {
            const activityPath = getUserActivityPath(username);
            if (activityPath && fs.existsSync(activityPath)) {
                const data = JSON.parse(fs.readFileSync(activityPath, 'utf8'));
                const logs = data.logs || [];
                logs.forEach(log => {
                    allLogs.push(log);
                });
            }
        });
        return allLogs;
    } catch (e) {
        console.error('Error loading all activity logs:', e);
    }
    return [];
}
function saveActivityLog(logs, username = null) {
    try {
        const user = username || authState.currentUser;
        if (!user) return;
        
        const activityPath = getUserActivityPath(user);
        if (activityPath) {
            const data = { logs: logs };
            fs.writeFileSync(activityPath, JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error('Error saving activity log:', e);
    }
}
function getCurrentFileCounts() {
    try {
        if (!state.projectFolder || !fs.existsSync(state.projectFolder)) {
            return null;
        }
        
        const counts = {};
        const riwayahFolders = fs.readdirSync(state.projectFolder, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        for (const riwayah of riwayahFolders) {
            let completed = 0, inProgress = 0, review = 0;
            
            // Count completed files
            const completedPath = path.join(state.projectFolder, riwayah, 'Completed', 'Ajza');
            if (fs.existsSync(completedPath)) {
                for (let juz = 1; juz <= 30; juz++) {
                    const juzFolder = path.join(completedPath, juz.toString().padStart(2, '0'));
                    if (fs.existsSync(juzFolder)) {
                        completed += fs.readdirSync(juzFolder).filter(f => f.endsWith('.ai')).length;
                    }
                }
            }
            
            // Count in-progress files
            const ajzaPath = path.join(state.projectFolder, riwayah, 'Ajza');
            if (fs.existsSync(ajzaPath)) {
                for (let juz = 1; juz <= 30; juz++) {
                    const juzFolder = path.join(ajzaPath, juz.toString().padStart(2, '0'));
                    if (fs.existsSync(juzFolder)) {
                        inProgress += fs.readdirSync(juzFolder).filter(f => f.endsWith('.ai')).length;
                    }
                }
            }
            
            // Count review files
            const reviewPath = path.join(state.projectFolder, riwayah, 'Review Task');
            if (fs.existsSync(reviewPath)) {
                review += fs.readdirSync(reviewPath).filter(f => f.endsWith('.ai')).length;
            }
            
            counts[riwayah] = { completed, inProgress, review };
        }
        
        return counts;
    } catch (e) {
        console.error('Error getting file counts:', e);
        return null;
    }
}
function logActivity(action, details = {}) {
    try {
        if (!authState.currentUser) return;
        
        // Get current file counts
        const fileCounts = getCurrentFileCounts();
        
        const logs = loadActivityLog();
        const entry = {
            timestamp: new Date().toISOString(),
            user: authState.currentUser,
            action: action,
            file: details.file || null,
            riwayah: details.riwayah || null,
            pageNumber: details.pageNumber || null,
            fileCounts: fileCounts, // Record file counts at time of action
            details: details
        };
        logs.push(entry);
        if (logs.length > 10000) {
            logs.splice(0, logs.length - 10000);
        }
        saveActivityLog(logs);
    } catch (e) {
        console.error('Error logging activity:', e);
    }
}
function getStatsForPeriod(period) {
    const logs = loadAllActivityLogs();
    const now = new Date();
    let startDate;
    switch (period) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'week':
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 7);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        default:
            startDate = new Date(0);
    }
    const filteredLogs = logs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= startDate;
    });
    const userStats = {};
    let totalPages = 0;
    filteredLogs.forEach(log => {
        if (log.action === 'move_to_completed') {
            totalPages++;
            if (!userStats[log.user]) {
                userStats[log.user] = { count: 0 };
            }
            userStats[log.user].count++;
        }
    });
    let topUser = '-';
    let maxCount = 0;
    Object.entries(userStats).forEach(([user, stats]) => {
        if (stats.count > maxCount) {
            maxCount = stats.count;
            topUser = user.charAt(0).toUpperCase() + user.slice(1);
        }
    });
    return {
        logs: filteredLogs,
        totalPages: totalPages,
        topUser: maxCount > 0 ? `${topUser} (${maxCount})` : '-',
        activeUsers: Object.keys(userStats).length,
        userStats: userStats
    };
}
function refreshStats() {
    const period = document.getElementById('statsFilter')?.value || 'today';
    const stats = getStatsForPeriod(period);
    document.getElementById('totalPagesStat').textContent = stats.totalPages;
    document.getElementById('topUserStat').textContent = stats.topUser;
    document.getElementById('totalUsersStat').textContent = stats.activeUsers;
    const tbody = document.getElementById('statsTableBody');
    if (stats.logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-cell">No activity recorded for this period</td></tr>';
        return;
    }
    const sortedLogs = stats.logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    tbody.innerHTML = sortedLogs.map(log => {
        const date = new Date(log.timestamp);
        const dateStr = date.toLocaleDateString();
        const userName = log.user.charAt(0).toUpperCase() + log.user.slice(1);
        return `
            <tr>
                <td>${dateStr}</td>
                <td>${userName}</td>
                <td>${log.file || '-'}</td>
            </tr>
        `;
    }).join('');
}
function exportStatsToCSV() {
    const period = document.getElementById('statsFilter')?.value || 'today';
    const stats = getStatsForPeriod(period);
    if (stats.logs.length === 0) {
        showToast('No data to export', 'error');
        return;
    }
    let csv = 'Date,User,File\n';
    stats.logs.forEach(log => {
        const date = new Date(log.timestamp);
        const dateStr = date.toLocaleDateString();
        csv += `"${dateStr}","${log.user}","${log.file || ''}"\n`;
    });
    csv += `\n"Summary for ${period}"\n`;
    csv += `"Total Pages","${stats.totalPages}"\n`;
    csv += `"Active Users","${stats.activeUsers}"\n`;
    csv += `"Top User","${stats.topUser}"\n`;
    try {
        const exportPath = path.join(state.tasksFolder, `stats-export-${period}-${formatDate()}.csv`);
        fs.writeFileSync(exportPath, csv);
        showToast(`Exported to: ${exportPath}`, 'success');
    } catch (e) {
        console.error('Error exporting stats:', e);
        showToast('Failed to export stats', 'error');
    }
}
