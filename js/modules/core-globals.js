/**
 * Mushaf Task Manager - Core Globals
 * Must load first. Defines shared state and Node.js module references.
 */

var CSInterface;
try {
    if (typeof window !== 'undefined' && typeof window.CSInterface !== 'undefined') {
        CSInterface = window.CSInterface;
    } else if (typeof window !== 'undefined' && window.cep && window.cep.CSInterface) {
        CSInterface = window.cep.CSInterface;
    }
} catch (e) {
    console.log('CSInterface not available');
}

const state = {
    tasksFolder: null,
    projectFolder: null,
    currentRiwayah: null,
    currentPage: null,
    currentJuz: null,
    currentUser: null,
    rememberMe: true,
    projectTasks: [],
    pageTasks: [],
    pageProjectCompletions: [],
    isSetupComplete: false,
    completedJsonCreated: false,
    allReviewFiles: [],
    lastDocName: '',
    lastSelectedRiwayah: null,
    isToggling: false,
    lastToggleTime: 0,
    _lastPtCompletedJsonTime: 0,
    _lastPtCompletedJsonKey: null,
    _lastCompletedJsonTime: 0,
    _lastCompletedJsonKey: null,
    isHoveringReview: false,
    forceRefresh: false,
    updateMode: 'normal', // 'quick', 'normal', 'performance'
    autoOpenNextPage: false,
    fileSource: null, // 'review', 'inProgress', 'direct'
    mushafData: {
        surahStatistics: [],
        pageStatistics: []
    },
    // New state properties
    riwayahColors: {}, // Store colors for each riwayah
    multiSelectMode: false,
    inProgressMultiSelectMode: false,
    selectedPages: new Set(),
    selectedInProgressPages: new Set(),
    isExporting: false,
    // User assignment for In Progress
    inProgressUserFilter: 'all', // 'all', 'saad', 'muzakkir', 'umar'
    inProgressRiwayahFilter: 'all', // 'all' or specific riwayah name
    // Cache for queue data to avoid repeated disk scans
    cachedReviewFiles: null,
    cachedInProgressFiles: null
};

let USER_ASSIGNMENTS = {};

let QUOTES = [];

let authState = {
    currentUser: null,
    isAdmin: false,
    config: null,
    configPath: null
};

let fs, path, os;

try {
    if (typeof require !== 'undefined') {
        fs = require('fs');
        path = require('path');
        os = require('os');
    }
} catch (e) {
    console.log('Node.js modules not available in this context');
}
