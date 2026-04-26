# Mushaf Task Manager - Workflow Documentation

> **Version**: 1.0  
> **Last Updated**: April 2026  
> **Project**: Quran (Mushaf) Digital Publishing Workflow

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Folder Structure](#folder-structure)
4. [CEP Extension Workflow](#cep-extension-workflow)
5. [Web Viewer Workflow](#web-viewer-workflow)
6. [Google Apps Script Integration](#google-apps-script-integration)
7. [Data Flow](#data-flow)
8. [Task Lifecycle](#task-lifecycle)
9. [File Naming Conventions](#file-naming-conventions)
10. [User Roles & Assignments](#user-roles--assignments)

---

## Overview

The Mushaf Task Manager is a comprehensive workflow system for managing the digital production of Quran (Mushaf) pages across multiple Riwayahs (recitation methods). It consists of three main components:

1. **CEP Extension** - Adobe Illustrator plugin for designers
2. **Web Viewer** - Browser-based preview and task submission
3. **Google Apps Script** - Automated reporting and Drive management

### Supported Riwayahs

| Riwayah | Color Code | Pages |
|---------|-----------|-------|
| Hafs | `#62d579` | 604 |
| Qalun | `#F06292` | 604 |
| Warsh | `#EC407A` | 604 |
| Shuba | `#FF7043` | 604 |
| Hafs(Qasr) | `#00BCD4` | 604 |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           GOOGLE DRIVE                                  │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │ Mushaf Files    │  │ Activity     │  │ mushaftasks (JSON)       │   │
│  │ (AI Files)      │  │ Logs         │  │ - page-tasks/            │   │
│  │ - Hafs/         │  │ - activity-  │  │ - completed/             │   │
│  │ - Qalun/        │  │   *.json     │  │ - pt-completed/          │   │
│  │ - Warsh/        │  │              │  │ - riwayah-tasks/         │   │
│  └────────┬────────┘  └──────┬───────┘  │ - review-queue/          │   │
│           │                  │          └──────────────────────────┘   │
└───────────┼──────────────────┼──────────────────────────────────────────┘
            │                  │
            │                  │
            ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      CEP EXTENSION (Adobe Illustrator)                  │
│                           Modular Architecture                          │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │
│  │ config.js       │  │ state.js        │  │ utils.js                │ │
│  │ - Constants     │  │ - StateManager  │  │ - File utilities        │ │
│  │ - Page mappings │  │ - Central state │  │ - DOM helpers           │ │
│  │ - User configs  │  │ - Getters/Setters│  │ - Settings I/O          │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │
│  │ file-manager.js │  │ task-manager.js │  │ ui-manager.js           │ │
│  │ - File scanning │  │ - Task CRUD     │  │ - Render functions      │ │
│  │ - Open/Close    │  │ - Completion    │  │ - DOM updates           │ │
│  │ - Move files    │  │ - Submit tasks  │  │ - Progress bars         │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ main.js (Entry Point)                                               ││
│  │ - Initializes modules                                               ││
│  │ - Event handlers                                                    ││
│  │ - Application logic                                                 ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  Local Storage: ~/Documents/MushafTaskManager/settings.json            │
│                                                                         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                │ HTTP API
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      WEB SERVER (mushaf.linuxproguru.com)              │
│                                                                         │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ API Endpoints    │  │ File Viewer  │  │ Database (JSON files)    │  │
│  │ - get-files.php  │  │ - Mobile     │  │ - page-tasks/            │  │
│  │ - submit.php     │  │ - Desktop    │  │ - mushaftasks/           │  │
│  │ - serve-file.php │  │ - Tasks      │  │ - cache/                 │  │
│  └──────────────────┘  └──────────────┘  └──────────────────────────┘  │
│                                                                         │
│  WebP Image Serving: ai-files/{riwayah}/{page}-{riwayah}.webp          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                │ Triggers
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      GOOGLE APPS SCRIPT                                 │
│                                                                         │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Daily Reports    │  │ Drive Cleanup│  │ Email Notifications      │  │
│  │ - 11:59 PM       │  │ - Archived   │  │ - mmuzakkir2023@gmail    │  │
│  │ - Activity stats │  │   cleanup    │  │   .com                   │  │
│  │ - File counts    │  │              │  │                          │  │
│  └──────────────────┘  └──────────────┘  └──────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Extension Module Architecture

The CEP Extension has been refactored from a single 3500+ line `main.js` into a modular architecture:

### Module Overview

| Module | Purpose | Key Classes/Objects |
|--------|---------|---------------------|
| `config.js` | Centralized constants and configuration | `MushafConfig` |
| `state.js` | Application state management | `MushafState` (singleton) |
| `utils.js` | Common utility functions | `MushafUtils` |
| `auth-manager.js` | User authentication and management | `MushafAuth` (singleton) |
| `activity-manager.js` | Activity logging and statistics | `MushafActivity` (singleton) |
| `file-manager.js` | File operations and scanning | `MushafFileManager` (singleton) |
| `task-manager.js` | Task CRUD operations | `MushafTaskManager` (singleton) |
| `ui-manager.js` | UI rendering and updates | `MushafUI` (singleton) |
| `main.js` | Entry point and app logic | `MushafApp` (public API) |

### Module Dependencies

```
config.js (no dependencies)
    ↓
state.js (uses Config)
    ↓
utils.js (no dependencies)
    ↓
file-manager.js (uses State, Config, Utils)
task-manager.js (uses State, Config, Utils)
    ↓
ui-manager.js (uses State, Config, Utils)
    ↓
main.js (uses all modules)
```

### Global Exports

Each module exposes its functionality via the global `window` object:

```javascript
window.MushafConfig      // Configuration constants
window.MushafState       // State singleton instance
window.MushafUtils       // Utility functions
window.MushafFileManager // File manager singleton
window.MushafTaskManager // Task manager singleton
window.MushafUI          // UI manager singleton
window.MushafApp         // Application public API
```

---

## Folder Structure

### Local Project Folder (Designer Computer)

```
MushafProject/
├── Hafs/                       # Riwayah folder
│   ├── Ajza/                   # In-progress files (30 Juz folders)
│   │   ├── 01/                 # Juz 1
│   │   │   ├── 001-Hafs.ai
│   │   │   ├── 002-Hafs.ai
│   │   │   └── ...
│   │   ├── 02/                 # Juz 2
│   │   └── ... (up to 30)
│   ├── Review Task/            # Files needing review
│   │   ├── 015-Hafs.ai
│   │   └── ...
│   └── Completed/              # Completed files
│       └── Ajza/               # Same 30 Juz structure
│           ├── 01/
│           ├── 02/
│           └── ...
├── Qalun/                      # Another Riwayah
│   ├── Ajza/
│   ├── Review Task/
│   └── Completed/
├── Warsh/                      # Another Riwayah
│   └── ...
└── mushaftasks/                # Task data folder
    ├── page-tasks/             # Page-specific tasks
    │   ├── Hafs/
    │   │   ├── 001-tasks.json
    │   │   ├── 002-tasks.json
    │   │   └── ...
    │   ├── Qalun/
    │   └── ...
    ├── riwayah-tasks/          # Project-wide tasks per Riwayah
    │   ├── Hafs/
    │   │   └── riwayah-tasks.json
    │   └── ...
    ├── completed/              # Completion markers
    │   ├── Hafs/
    │   │   ├── 001-completed.json
    │   │   └── ...
    │   └── ...
    ├── pt-completed/           # Page tasks completion markers
    │   ├── Hafs/
    │   │   ├── 001-pt-completed.json
    │   │   └── ...
    │   └── ...
    ├── review-queue/           # Review status tracking
    │   └── ...
    └── user-assignments.json   # User task assignments
```

### CEP Extension JavaScript Files

```
extension/
├── js/
│   ├── config.js           # Configuration constants and mappings
│   │   └── PAGE_TO_JUZ, USER_ASSIGNMENTS, DEFAULT_RIWAYAH_COLORS
│   ├── state.js            # StateManager class - centralized state
│   │   └── currentPage, currentRiwayah, tasks, filters, etc.
│   ├── utils.js            # Utility functions
│   │   └── file I/O, DOM helpers, date formatting
│   ├── file-manager.js     # FileManager class - file operations
│   │   └── scanReviewFiles, scanInProgressFiles, openInIllustrator
│   ├── task-manager.js     # TaskManager class - task operations
│   │   └── loadPageTasks, savePageTasks, submitPageTasks
│   ├── ui-manager.js       # UIManager class - UI rendering
│   │   └── renderProjectTasks, renderReviewQueue, updateProgress
│   └── main.js             # Application entry point
│       └── initApplication, event handlers, public API
```

### Server Folder Structure (mushaf.linuxproguru.com)

```
mushaf.linuxproguru.com/
├── api/                        # PHP API endpoints
│   ├── get-files.php          # List files by Riwayah
│   ├── get-page-tasks.php     # Get tasks for a page
│   ├── submit.php             # Submit new tasks
│   ├── serve-file.php         # Serve WebP images
│   ├── mark-page-tasks-done.php
│   ├── list-archived.php
│   ├── save-location.php
│   └── get-riwayahs.php
├── public/                     # Web assets
│   ├── file-viewer.html       # Main web viewer
│   ├── index.html
│   ├── app.js
│   ├── sw.js                  # Service Worker
│   └── styles.css
├── mushaftasks/               # Server-side task storage
│   ├── page-tasks/            # Mirrors local structure
│   ├── completed/
│   └── pt-completed/
├── ai-files/                  # WebP images (not present yet)
│   ├── Hafs/
│   │   ├── 001-Hafs.webp
│   │   └── ...
│   ├── Qalun/
│   └── ...
├── data/                      # Surah/page statistics
├── cache/                     # Temporary cache
└── logs/                      # Error logs
```

---

## CEP Extension Workflow

### 1. Initial Setup

```
User opens Illustrator → CEP Extension loads
    ↓
First-time setup modal appears
    ↓
User selects: Mushaf Tasks Folder (mushaftasks/)
    ↓
Login modal → Select user → Enter password
    ↓
Main panel appears
```

### 2. Opening a File

#### Option A: By Page Number
```
User selects Riwayah from dropdown
    ↓
Enter page number in "Page" field
    ↓
Click "Go" or press Enter
    ↓
File opens in Illustrator
```

#### Option B: By Surah + Ayah (Improved)
```
Type Surah number (1-114)
    ↓
Press Tab or Enter → Focus moves to Ayah field
    ↓
Type Ayah number
    ↓
Press Enter → Automatically finds and opens page
    ↓
System looks up page from Surah+Ayah mapping
    ↓
File opens in Illustrator
```

#### File Priority Order
System finds file in this order:
    1. Review Task/ (highest priority)
    2. Ajza/{juz}/
    3. Completed/Ajza/{juz}/

#### After Opening
```
Tasks load for current page:
    - Project tasks (riwayah-tasks.json)
    - Page-specific tasks ({page}-tasks.json)
    ↓
Progress bar updates based on completed tasks
```

### 3. Task Completion Flow

```
Designer works on page
    ↓
Checks off project tasks (applies to this page only)
    ↓
Optionally adds page-specific tasks
    ↓
When all tasks done → "Submit Page Tasks" button appears
    ↓
Click Submit → Creates {page}-pt-completed.json
    ↓
File moves to "Review Task/" or stays in "Ajza/"
```

### 4. Move to Completed

```
Designer clicks "✓ Move to Completed"
    ↓
Document saves automatically
    ↓
File moves: Ajza/{juz}/ → Completed/Ajza/{juz}/
         OR: Review Task/ → Completed/Ajza/{juz}/
    ↓
Document closes
    ↓
Activity logged to Google Drive (activity-{date}.json)
    ↓
Review queue refreshes
```

### 5. Review Queue Management

```
Review Queue Section shows:
    - Files in "Review Task/" folders
    - Files with pending page-tasks in Ajza/
    - Excludes files with pt-completed.json
    ↓
Designer clicks file in Review Queue
    ↓
File opens, designer reviews/completes tasks
    ↓
Submit Page Tasks → pt-completed.json created
    ↓
File ready to move to Completed
```

### 6. Multi-Select (Bulk Operations)

```
Enable Multi-Select mode
    ↓
Select multiple pages (checkboxes)
    ↓
Options:
    - Select Range (start-end)
    - Select All in Riwayah
    - Clear Selection
    ↓
Bulk "Move to Completed" moves all selected files
```

---

## Module APIs

### StateManager API (`MushafState`)

```javascript
// Core state properties
MushafState.currentRiwayah        // Currently selected riwayah
MushafState.currentPage           // Currently open page (3-digit string)
MushafState.currentJuz            // Juz number (1-30)
MushafState.tasksFolder           // Path to mushaftasks folder
MushafState.projectFolder         // Path to project folder (AI files)

// Task arrays
MushafState.projectTasks          // Project-wide tasks for current riwayah
MushafState.pageTasks             // Page-specific tasks
MushafState.pageProjectCompletions // Array of completed project task IDs

// Computed getters
MushafState.hasFileOpen           // Boolean: is a file currently open
MushafState.completionPercentage  // Number: 0-100 completion percentage

// Methods
MushafState.setCurrentFile(riwayah, page)
MushafState.clearCurrentFile()
MushafState.invalidateCache()
MushafState.togglePageSelection(page, mode)
MushafState.toSettings()          // Serialize for settings file
MushafState.fromSettings(data)    // Load from settings file
```

### FileManager API (`MushafFileManager`)

```javascript
// File finding
MushafFileManager.findFile(riwayah, page) → { path, status, label, display }
MushafFileManager.getCurrentFileLocation() → Location object

// Scanning
MushafFileManager.scanReviewFiles() → Array of file objects
MushafFileManager.scanInProgressFiles() → Array of file objects

// File operations
MushafFileManager.openInIllustrator(filePath) → Promise<{ success, result }>
MushafFileManager.closeDocument(save) → Promise<{ success, result }>
MushafFileManager.saveDocument() → Promise<{ success, result }>
MushafFileManager.moveToCompleted(riwayah, page, sourceLocation) → Promise
```

### TaskManager API (`MushafTaskManager`)

```javascript
// Project (Riwayah) tasks
MushafTaskManager.loadRiwayahTasks(riwayah) → Array of tasks
MushafTaskManager.saveRiwayahTasks(riwayah, tasks) → Boolean

// Page tasks
MushafTaskManager.loadPageTasks(riwayah, page) → { tasks, completedProjectTasks, isCompleted }
MushafTaskManager.savePageTasks(riwayah, page, tasks, completions) → Boolean

// Completion status
MushafTaskManager.isPageCompleted(riwayah, page) → Boolean
MushafTaskManager.isPageTasksSubmitted(riwayah, page) → Boolean

// Actions
MushafTaskManager.submitPageTasks(riwayah, page) → { success, error, file }
MushafTaskManager.completePage(riwayah, page) → { success, error, file }

// Task operations
MushafTaskManager.createTask(title, options) → Task object
MushafTaskManager.toggleTask(taskId, isPageTask) → Boolean
MushafTaskManager.toggleAllProjectTasks(complete) → Boolean
```

### UIManager API (`MushafUI`)

```javascript
// Task lists
MushafUI.renderProjectTasks()
MushafUI.renderPageTasks()
MushafUI.renderReviewQueue(files)
MushafUI.renderInProgressQueue(files)

// Progress and status
MushafUI.updateProgress()
MushafUI.updateLocationDisplay(location)
MushafUI.updateMoveButton()
MushafUI.updateSubmitButton()

// Riwayah colors
MushafUI.getRiwayahColor(riwayah) → Color string
MushafUI.loadRiwayahColors()
MushafUI.saveRiwayahColors()

// Modals
MushafUI.showModal(modalId)
MushafUI.hideModal(modalId)
MushafUI.showLoading(show)
```

### Public Application API (`MushafApp`)

```javascript
// Core
MushafApp.init()                    // Initialize application
MushafApp.refreshUI()               // Refresh all UI components
MushafApp.refreshQueues(force)      // Refresh queue lists

// Navigation
MushafApp.openFile(riwayah, page)
MushafApp.closePage(save)
MushafApp.goToPreviousPage()
MushafApp.goToNextPage()

// Tasks
MushafApp.handleTaskToggle(index, isPageTask, taskId, checked, element)
MushafApp.toggleCompleteAll()
MushafApp.addPageTask()
MushafApp.submitPageTasks()
MushafApp.moveToCompleted()

// Queues
MushafApp.openQueueFile(file)
MushafApp.togglePageSelection(page, mode)
```

---

## Web Viewer Workflow

### 1. Accessing the Viewer

```
Browser → mushaf.linuxproguru.com
    ↓
Redirects to public/file-viewer.html
    ↓
Mobile: Drawer menu | Desktop: Sidebar
```

### 2. Viewing Files

```
Select Riwayah from dropdown
    ↓
API call: get-files.php?riwayah={name}
    ↓
File list loads with status indicators:
    🟡 Ajza (In Progress)
    🔵 Review (Needs Review)
    🟢 Completed
    ↓
Select a file → Load WebP image
    ↓
IndexedDB caches image for offline viewing
```

### 3. Navigation

```
Mobile:
    - Swipe left/right: Next/Previous page
    - Pinch: Zoom in/out
    - Double-tap: Reset zoom

Desktop:
    - Arrow keys: Navigate
    - Page input: Jump to specific page
    - First/Last buttons: Jump to ends
```

### 4. Submitting Tasks (Web)

```
Click ➕ FAB (mobile) or view task panel (desktop)
    ↓
Auto-filled: Page, Riwayah, Current Status
    ↓
Add task cards:
    - Title (required)
    - Description (optional)
    ↓
Click "Submit Tasks"
    ↓
API: POST /api/submit.php
    ↓
Server saves to: mushaftasks/page-tasks/{riwayah}/{page}-tasks.json
    ↓
Success notification
    ↓
Task count badge updates
```

### 5. Viewing Existing Tasks

```
Click task count badge
    ↓
Modal shows all existing tasks for current page
    ↓
Shows: Title, Description, Reporter, Timestamp
```

### 6. Auto-Refresh

```
After 4 page changes
    ↓
Automatic cache clear
    ↓
Reload current image fresh from server
```

---

## Google Apps Script Integration

### 1. Daily Report (11:59 PM)

```
Trigger: Daily at 23:59 (Asia/Dubai timezone)
    ↓
Scan Activity Folder:
    - Read all activity-*.json files
    - Parse "move_to_completed" actions
    ↓
Calculate Statistics:
    - Today's completions
    - Yesterday's completions
    - 7-day trend
    - Top user of the day
    - All-time totals
    ↓
Scan Mushaf Files Folder:
    - Count files per Riwayah
    - Calculate completion percentages
    ↓
Generate HTML Report:
    - Modern dashboard design
    - Circular progress indicators
    - Bar charts
    - User cards
    ↓
Save to Drive: Mushaf Reports/Mushaf_Report_{date}.html
    ↓
Send Email Summary to mmuzakkir2023@gmail.com
```

### 2. Drive Cleanup (Weekly/Monthly)

```
Fetch archived list from server: list-archived.php
    ↓
For each archived file:
    - Delete from pt-completed/
    - Delete from page-tasks/
    ↓
Log cleanup operations
```

### 3. Activity Log Format

```json
// activity-2026-04-11.json
{
  "logs": [
    {
      "timestamp": "2026-04-11T10:30:00Z",
      "user": "muzakkir",
      "action": "move_to_completed",
      "file": "001-Hafs.ai",
      "riwayah": "Hafs",
      "page": "001"
    }
  ]
}
```

---

## Data Flow

### Local-to-Server Sync

```
CEP Extension (Designer)
    ↓
Saves tasks to: local/mushaftasks/page-tasks/
    ↓
NOT automatically synced to server
    ↓
Web viewer reads from: server/mushaftasks/page-tasks/
    ↓
CURRENTLY SEPARATE: Tasks submitted via web go to server
                    Tasks in CEP stay local
```

### Activity Logging

```
Designer completes file in CEP
    ↓
Extension creates activity entry
    ↓
Saved to: local/activity/ (if configured)
    ↓
Manually uploaded to Google Drive OR
    ↓
Future: Direct Drive API integration
```

### Image Serving Flow

```
Web Viewer requests: Page 5, Hafs
    ↓
API: serve-file.php?riwayah=Hafs&page=5&status=ajza
    ↓
Server checks: ai-files/Hafs/005-Hafs.webp
    ↓
If exists: Serve WebP with caching headers
    ↓
If missing: Return 404 (placeholder shown)
    ↓
Browser caches in IndexedDB
```

---

## Task Lifecycle

### Project Tasks (Per Riwayah)

```
Created: Admin creates Riwayah with task list
    ↓
Applied: Each page inherits these tasks
    ↓
Completed: Designer checks off per-page
    ↓
Tracked: Stored in page-tasks/{riwayah}/{page}-tasks.json
    ↓
         "completedProjectTasks": ["task_id_1", "task_id_2"]
```

### Page Tasks (Per Page)

```
Created: Designer or Web user adds specific tasks
    ↓
Stored: page-tasks/{riwayah}/{page}-tasks.json
    ↓
Format:
{
  "page": "005",
  "riwayah": "Hafs",
  "juz": 1,
  "tasks": [
    {
      "id": "ptask_abc123",
      "title": "Fix kashida in verse 3",
      "description": "The kashida is too long",
      "completed": false,
      "source": "web_form",
      "created": "2026-04-11T10:00:00Z"
    }
  ]
}
    ↓
Submitted: All tasks marked completed
    ↓
Marker created: pt-completed/{riwayah}/{page}-pt-completed.json
```

### Completion Markers

| Marker | Purpose | Created When |
|--------|---------|--------------|
| `{page}-tasks.json` | Stores page task data | Task added |
| `{page}-pt-completed.json` | Page tasks submitted | All page tasks done |
| `{page}-completed.json` | File fully completed | Moved to Completed/ |

---

## File Naming Conventions

### AI Files

```
Format: {page}-{riwayah}.ai

Examples:
    001-Hafs.ai
    042-Qalun.ai
    604-Warsh.ai

Page: 3 digits, zero-padded (001-604)
Riwayah: Alphabetic, no spaces
```

### JSON Files

```
Page tasks:     {page}-tasks.json          (001-tasks.json)
PT Completed:   {page}-pt-completed.json   (001-pt-completed.json)
Completed:      {page}-completed.json      (001-completed.json)
Riwayah tasks:  riwayah-tasks.json
Activity:       activity-{date}.json       (activity-2026-04-11.json)
```

### WebP Files

```
Format: {page}-{riwayah}.webp

Examples:
    ai-files/Hafs/001-Hafs.webp
    ai-files/Qalun/042-Qalun.webp
```

---

## User Roles & Assignments

### Current Users

| User | Surah Range | Riwayah | Name Display |
|------|-------------|---------|--------------|
| saad | 1-9 | Warsh | Saad |
| muzakkir | 10-28 | Warsh | Muzakkir |
| umar | 29-114 | Warsh | Umar |

### Assignment Logic

```
Page 5 (Juz 1, Surah 2)
    ↓
Check: Which user has Surah 2 in their range?
    ↓
Result: Muzakkir (Surah 10-28? No... actually Saad: 1-9)
    ↓
In Progress filter shows assignment badge
```

### Admin Controls

```
User: muzakkir (hardcoded admin)
    ↓
Settings → Admin Controls:
    - Add New User
    - Reset User Password
```

---

## Update Modes (CEP Extension)

| Mode | Icon | Refresh Interval | Use Case |
|------|------|------------------|----------|
| Quick | 🐇 | 30 seconds | Active work |
| Normal | 🐢 | 5 minutes | Standard |
| Performance | 🚀 | 10 minutes | Large projects |

---

## Keyboard Shortcuts

### CEP Extension

| Shortcut | Action | Notes |
|----------|--------|-------|
| Ctrl+Shift+← | Previous Page | Click in panel first |
| Ctrl+Shift+→ | Next Page | Click in panel first |
| Ctrl+Shift+R | Refresh UI | Click in panel first |
| Tab | Navigate form fields | Surah → Ayah → Page |

### Surah/Ayah Navigation

| Action | Result |
|--------|--------|
| Type Surah number + Tab/Enter | Moves focus to Ayah field |
| Type Ayah number + Enter | Automatically searches and opens file |

### Web Viewer

| Key | Action |
|-----|--------|
| ← | Previous Page |
| → | Next Page |

---

## Configuration Files

### Local Settings

```json
// ~/Documents/MushafTaskManager/settings.json
{
  "tasksFolder": "C:\\MushafProject\\mushaftasks",
  "projectFolder": "C:\\MushafProject",
  "lastSelectedRiwayah": "Hafs",
  "lastSearchedSurah": 2,
  "lastSearchedAyah": 255,
  "updateMode": "normal",
  "inProgressUserFilter": "all",
  "inProgressRiwayahFilter": "all",
  "currentUser": "muzakkir",
  "rememberMe": true
}
```

### Riwayah Colors

```json
// mushaftasks/riwayah-colors.json
{
  "Hafs": "#62d579",
  "Qalun": "#F06292",
  "Warsh": "#EC407A",
  "Shuba": "#FF7043",
  "Hafs(Qasr)": "#00BCD4"
}
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| File not opening | Check if file exists in Ajza/, Review Task/, or Completed/ |
| Tasks not showing | Verify tasksFolder path in settings |
| Review queue empty | Check pt-completed/ markers (files with markers are hidden) |
| Web viewer 404 | WebP file doesn't exist in ai-files/ |
| Sync issues | Currently local and server tasks are separate systems |

---

## Future Improvements

1. **AI to WebP Automation**: Script to convert Illustrator files to WebP
2. **Real-time Sync**: WebSocket or polling for task synchronization
3. **Version Control**: Git-like versioning for AI files
4. **Offline Mode**: Full offline support with background sync
5. **Mobile App**: Native iOS/Android apps
6. **AI Verification**: Automated quality checks

---

*Document maintained by the Mushaf Task Manager project team.*
