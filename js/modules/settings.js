function saveSettings() {
    try {
        const documentsPath = path.join(os.homedir(), 'Documents');
        const settingsDir = path.join(documentsPath, 'MushafTaskManager');
        
        if (!fs.existsSync(settingsDir)) {
            fs.mkdirSync(settingsDir, { recursive: true });
        }
        
        const settingsPath = path.join(settingsDir, 'settings.json');
        const settings = {
            tasksFolder: state.tasksFolder,
            projectFolder: state.projectFolder,
            lastSelectedRiwayah: state.lastSelectedRiwayah,
            lastSearchedSurah: state.lastSearchedSurah || null,
            lastSearchedAyah: state.lastSearchedAyah || null,
            lastSeenVersion: state.lastSeenVersion || null,
            updateMode: state.updateMode || 'normal',
            autoOpenNextPage: state.autoOpenNextPage || false,
            inProgressUserFilter: state.inProgressUserFilter || 'all',
            inProgressRiwayahFilter: state.inProgressRiwayahFilter || 'all',
            currentUser: state.currentUser || null,
            rememberMe: state.rememberMe ?? true,
            lastReadChatCount: state.lastReadChatCount || 0
        };
        
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        return true;
    } catch (e) {
        console.error('Error saving settings:', e);
        return false;
    }
}

function loadSettings() {
    try {
        const documentsPath = path.join(os.homedir(), 'Documents');
        const settingsPath = path.join(documentsPath, 'MushafTaskManager', 'settings.json');
        
        if (fs.existsSync(settingsPath)) {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            state.tasksFolder = settings.tasksFolder;
            state.projectFolder = settings.projectFolder;
            state.lastSelectedRiwayah = settings.lastSelectedRiwayah || null;
            state.lastSearchedSurah = settings.lastSearchedSurah || null;
            state.lastSearchedAyah = settings.lastSearchedAyah || null;
            state.lastSeenVersion = settings.lastSeenVersion || null;
            state.updateMode = settings.updateMode || 'normal';
            state.autoOpenNextPage = settings.autoOpenNextPage || false;
            state.inProgressUserFilter = settings.inProgressUserFilter || 'all';
            state.inProgressRiwayahFilter = settings.inProgressRiwayahFilter || 'all';
            state.currentUser = settings.currentUser || null;
            state.rememberMe = settings.rememberMe ?? true;
            state.lastReadChatCount = settings.lastReadChatCount || 0;
            state.isSetupComplete = !!settings.tasksFolder;
            return settings;
        }
    } catch (e) {
        console.error('Error loading settings:', e);
    }
    return null;
}
