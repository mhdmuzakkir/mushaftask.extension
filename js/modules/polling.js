function getRefreshInterval() {
    switch (state.updateMode) {
        case 'quick': return 30000;      // 30 seconds
        case 'normal': return 300000;    // 5 minutes
        case 'performance': return 600000; // 10 minutes
        default: return 300000;
    }
}
function getModeIcon() {
    switch (state.updateMode) {
        case 'quick': return '🐇';
        case 'normal': return '🐢';
        case 'performance': return '🚀';
        default: return '🐢';
    }
}
function getModeLabel() {
    switch (state.updateMode) {
        case 'quick': return 'Quick';
        case 'normal': return 'Normal';
        case 'performance': return 'Performance';
        default: return 'Normal';
    }
}
function setUpdateMode(mode) {
    const modes = ['quick', 'normal', 'performance'];
    if (!modes.includes(mode)) return;
    state.updateMode = mode;
    
    applyUpdateMode();
    saveSettings();
    updateModeButton();
    
    // Restart polling with new interval
    setupReviewQueuePolling();
    
    console.log(`Update mode changed to: ${getModeLabel()}`);
}
function cycleUpdateMode() {
    const modes = ['quick', 'normal', 'performance'];
    const currentIndex = modes.indexOf(state.updateMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setUpdateMode(modes[nextIndex]);
}
function applyUpdateMode() {
    // Apply CSS optimizations for performance mode
    if (state.updateMode === 'performance') {
        document.body.classList.add('performance-mode');
    } else {
        document.body.classList.remove('performance-mode');
    }
}
function updateModeButton() {
    // Legacy single-button support (if element still exists elsewhere)
    const btn = document.getElementById('updateModeBtn');
    const icon = document.getElementById('updateModeIcon');
    const label = document.getElementById('updateModeLabel');
    
    if (btn) {
        btn.className = `btn-link update-mode-toggle mode-${state.updateMode}`;
    }
    if (icon) {
        icon.textContent = getModeIcon();
    }
    if (label) {
        label.textContent = getModeLabel();
    }
    
    // New mode-selector buttons
    document.querySelectorAll('.mode-btn').forEach(el => {
        el.classList.toggle('active', el.dataset.mode === state.updateMode);
    });
}
let reviewQueueInterval = null;

function setupReviewQueuePolling() {
    // Clear existing interval
    if (reviewQueueInterval) {
        clearInterval(reviewQueueInterval);
        reviewQueueInterval = null;
    }
    
    // Hover detection
    const container = document.getElementById('reviewFilesList');
    if (container) {
        container.addEventListener('mouseenter', () => {
            state.isHoveringReview = true;
        });
        container.addEventListener('mouseleave', () => {
            state.isHoveringReview = false;
            state.forceRefresh = true;
            refreshQueues();
        });
    }
    
    // Set up new interval based on current mode
    const interval = getRefreshInterval();
    console.log(`Setting up review queue polling with ${state.updateMode} mode (${interval}ms interval)`);
    
    reviewQueueInterval = setInterval(() => {
        if (document.hidden || state.isHoveringReview) return;
        
        if (state.projectFolder && document.getElementById('reviewFilesList')) {
            console.log(`Auto-refreshing review queue (${state.updateMode} mode)`);
            refreshQueues(true);
        }
    }, interval);
}
function setupAutoRefresh() {
    if (typeof CSInterface === 'undefined') return;
    
    var csInterface = new CSInterface();
    
    try {
        csInterface.addEventListener('com.adobe.csxs.events.DocumentActivate', function(event) {
            console.log('Document activated event');
            refreshCurrentFileUI();
        });
        
        csInterface.addEventListener('com.adobe.csxs.events.ApplicationActivate', function(event) {
            console.log('App activated');
            refreshCurrentFileUI();
        });
    } catch (e) {
        console.log('CEP events not supported');
    }
    
    setInterval(function() {
        if (typeof CSInterface !== 'undefined') {
            var csInterface = new CSInterface();
            csInterface.evalScript('getActiveDocumentName()', function(result) {
                const currentDoc = result && result !== 'null' && result !== 'undefined' ? result : '';
                
                if (currentDoc !== state.lastDocName) {
                    console.log('Tab changed detected:', state.lastDocName, '->', currentDoc);
                    refreshCurrentFileUI();
                }
            });
        }
    }, 5000);
}
