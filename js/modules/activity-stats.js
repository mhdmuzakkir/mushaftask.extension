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
            userStats[log.user] = (userStats[log.user] || 0) + 1;
        }
    });
    const sortedUsers = Object.entries(userStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([user, count]) => user.charAt(0).toUpperCase() + user.slice(1) + ' (' + count + ')');
    const topUser = sortedUsers.length > 0 ? sortedUsers.join('  •  ') : '-';
    return {
        logs: filteredLogs,
        totalPages: totalPages,
        topUser: topUser,
        activeUsers: Object.keys(userStats).length,
        userStats: userStats
    };
}

let statsCalendarDate = new Date();
let activityCalendarControlsInitialized = false;

function formatDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getActivityDateMap() {
    const logs = loadAllActivityLogs();
    const map = {};
    logs.forEach(log => {
        if (log.timestamp && log.action === 'move_to_completed') {
            const d = new Date(log.timestamp);
            const key = formatDateKey(d);
            if (!map[key]) map[key] = {};
            const user = log.user || 'unknown';
            map[key][user] = (map[key][user] || 0) + 1;
        }
    });
    return map;
}

function getActivityDatesSet() {
    return new Set(Object.keys(getActivityDateMap()));
}

function getDateTooltipText(dateKey, dateMap) {
    const users = dateMap[dateKey];
    if (!users) return 'No activity';
    const entries = Object.entries(users).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    const lines = entries.map(([user, count]) => {
        const name = user.charAt(0).toUpperCase() + user.slice(1);
        return `• ${name}: ${count} page${count !== 1 ? 's' : ''}`;
    });
    lines.unshift(`Total: ${total} page${total !== 1 ? 's' : ''}`);
    return lines.join('\n');
}

function populateCalendarControls() {
    const monthSelect = document.getElementById('calendarMonthSelect');
    const yearSelect = document.getElementById('calendarYearSelect');
    if (!monthSelect || !yearSelect) return;

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];

    // Populate months only once
    if (!monthSelect.dataset.populated) {
        monthNames.forEach((name, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = name;
            monthSelect.appendChild(option);
        });
        monthSelect.dataset.populated = 'true';
    }

    // Populate years around current view
    const currentYear = statsCalendarDate.getFullYear();
    const startYear = currentYear - 5;
    const endYear = currentYear + 5;
    yearSelect.innerHTML = '';
    for (let y = startYear; y <= endYear; y++) {
        const option = document.createElement('option');
        option.value = y;
        option.textContent = y;
        yearSelect.appendChild(option);
    }

    monthSelect.value = statsCalendarDate.getMonth();
    yearSelect.value = statsCalendarDate.getFullYear();
}

function initCalendarControls() {
    if (activityCalendarControlsInitialized) return;

    const prevMonthBtn = document.getElementById('calendarPrevMonth');
    const nextMonthBtn = document.getElementById('calendarNextMonth');
    const prevYearBtn = document.getElementById('calendarPrevYear');
    const nextYearBtn = document.getElementById('calendarNextYear');
    const todayBtn = document.getElementById('calendarTodayBtn');
    const monthSelect = document.getElementById('calendarMonthSelect');
    const yearSelect = document.getElementById('calendarYearSelect');

    function changeMonth(delta) {
        statsCalendarDate.setMonth(statsCalendarDate.getMonth() + delta);
        renderActivityCalendar();
    }

    function changeYear(delta) {
        statsCalendarDate.setFullYear(statsCalendarDate.getFullYear() + delta);
        renderActivityCalendar();
    }

    if (prevMonthBtn) prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    if (nextMonthBtn) nextMonthBtn.addEventListener('click', () => changeMonth(1));
    if (prevYearBtn) prevYearBtn.addEventListener('click', () => changeYear(-1));
    if (nextYearBtn) nextYearBtn.addEventListener('click', () => changeYear(1));
    if (todayBtn) todayBtn.addEventListener('click', () => {
        statsCalendarDate = new Date();
        renderActivityCalendar();
    });
    if (monthSelect) monthSelect.addEventListener('change', (e) => {
        statsCalendarDate.setMonth(parseInt(e.target.value, 10));
        renderActivityCalendar();
    });
    if (yearSelect) yearSelect.addEventListener('change', (e) => {
        statsCalendarDate.setFullYear(parseInt(e.target.value, 10));
        renderActivityCalendar();
    });

    activityCalendarControlsInitialized = true;
}

function renderActivityCalendar() {
    const grid = document.getElementById('activityCalendarGrid');
    if (!grid) return;

    initCalendarControls();
    populateCalendarControls();

    const year = statsCalendarDate.getFullYear();
    const month = statsCalendarDate.getMonth();
    const today = new Date();
    const todayKey = formatDateKey(today);
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const dateMap = getActivityDateMap();
    const activityDates = new Set(Object.keys(dateMap));

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    let html = '';

    // Day headers
    dayNames.forEach(name => {
        html += `<div class="calendar-day-name">${name}</div>`;
    });

    // Previous month trailing days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        html += `<div class="calendar-day other-month">${day}</div>`;
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const classes = ['calendar-day'];
        if (isCurrentMonth && dateKey === todayKey) classes.push('today');
        if (activityDates.has(dateKey)) classes.push('has-activity');

        const tooltip = activityDates.has(dateKey)
            ? `<div class="calendar-day-tooltip">${escapeHtml(getDateTooltipText(dateKey, dateMap))}</div>`
            : '';

        html += `<div class="${classes.join(' ')}">${day}${tooltip}</div>`;
    }

    // Next month leading days to fill the grid
    const totalCells = firstDayOfMonth + daysInMonth;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let day = 1; day <= remainingCells; day++) {
        html += `<div class="calendar-day other-month">${day}</div>`;
    }

    grid.innerHTML = html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function refreshStats() {
    const period = document.getElementById('statsFilter')?.value || 'today';
    const stats = getStatsForPeriod(period);
    document.getElementById('totalPagesStat').textContent = stats.totalPages;
    document.getElementById('topUserStat').textContent = stats.topUser;
    document.getElementById('totalUsersStat').textContent = stats.activeUsers;
    const tooltipEl = document.getElementById('activeUsersTooltip');
    if (tooltipEl) {
        if (stats.activeUsers > 0) {
            const userList = Object.entries(stats.userStats)
                .sort((a, b) => b[1] - a[1])
                .map(([user, count]) => '• ' + user.charAt(0).toUpperCase() + user.slice(1) + ': ' + count + ' pages')
                .join('\n');
            tooltipEl.textContent = userList;
        } else {
            tooltipEl.textContent = 'No active users';
        }
    }
    const tbody = document.getElementById('statsTableBody');
    if (stats.logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-cell">No activity recorded for this period</td></tr>';
    } else {
        const sortedLogs = stats.logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        tbody.innerHTML = sortedLogs.map(log => {
            const date = new Date(log.timestamp);
            const dateStr = date.toLocaleDateString();
            const userName = log.user.charAt(0).toUpperCase() + log.user.slice(1);
            return `
                <tr>
                    <td>${dateStr}</td>
                    <td>${userName}</td>
                    <td style="text-align: right;">${log.file || '-'}</td>
                </tr>
            `;
        }).join('');
    }

    // Update the activity calendar so it reflects the latest logs
    renderActivityCalendar();
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
