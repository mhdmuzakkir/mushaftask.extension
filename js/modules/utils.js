/**
 * Mushaf Task Manager - Utils Module
 * Pure utility functions with no external dependencies
 */
(function(window) {
    'use strict';

    function generateId(prefix) {
        prefix = prefix || 'task';
        return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function formatDate(date) {
        date = date || new Date();
        return date.toISOString().split('T')[0];
    }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function detectRiwayahFromFilename(filename) {
        var match = filename.match(/^(\d+)-(.+)\.ai$/i);
        if (match) {
            return {
                page: parseInt(match[1], 10),
                riwayah: match[2].trim()
            };
        }
        return null;
    }

    function showConfirm(message, onConfirm, onCancel) {
        var modal = document.getElementById('confirmModal');
        var msgEl = document.getElementById('confirmMessage');
        var okBtn = document.getElementById('confirmOkBtn');
        var cancelBtn = document.getElementById('confirmCancelBtn');
        if (!modal || !msgEl || !okBtn || !cancelBtn) {
            // Fallback to native confirm if modal not found
            if (confirm(message)) {
                if (onConfirm) onConfirm();
            } else {
                if (onCancel) onCancel();
            }
            return;
        }
        msgEl.textContent = message || 'Are you sure?';
        modal.classList.remove('hidden');

        function handleOk() {
            modal.classList.add('hidden');
            cleanup();
            if (onConfirm) onConfirm();
        }
        function handleCancel() {
            modal.classList.add('hidden');
            cleanup();
            if (onCancel) onCancel();
        }
        function handleKey(e) {
            if (e.key === 'Escape') handleCancel();
            if (e.key === 'Enter') handleOk();
        }
        function cleanup() {
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            document.removeEventListener('keydown', handleKey);
        }
        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
        document.addEventListener('keydown', handleKey);
    }

    var CHANGELOG = {
        '2.4.0': {
            date: 'May 24, 2026',
            new: [
                'Per-riwayah user assignments — each user can have different surah ranges across multiple riwayahs',
                'Riwayah dropdown in Manage Assignments — picks from actual riwayah folders, no more typos',
                { text: 'Admin-only: Delete individual assignment rows with × button', adminOnly: true },
                'Removed CURRENT badge — blue highlight is enough to identify the active file',
                'Fixed surah name truncation in In Progress file items'
            ],
            fixed: [
                'Assignment table riwayah column widened so dropdown names are no longer cut off'
            ],
            improved: []
        },
        '2.3.0': {
            date: 'May 24, 2026',
            new: [
                'Recheck workflow — new Recheck/Ajza folders for second-pass review',
                { text: 'Admin-only: "Move to Recheck" button to bulk-move all completed pages back to Recheck', adminOnly: true },
                { text: 'Admin-only: Manage Assignments modal — assign users to surah ranges', adminOnly: true },
                'RECHECK badge shown on in-progress files in Recheck folders',
                'Riwayah status badge (completed/recheck) shown in riwayah dropdown',
                'Auto-revert riwayah status from recheck → completed when last recheck file is moved back',
                'User filter in In Progress queue — filter files by assigned user'
            ],
            fixed: [
                'Muzakkir protection — super admin checkbox is permanently disabled, cannot be demoted',
                'Badge overlap fixed — all badges wrapped in flex container, surah names truncate with ellipsis'
            ],
            improved: [
                'File discovery now searches Recheck/Ajza as a valid file location'
            ]
        },
        '2.1.10': {
            date: 'May 22, 2026',
            new: [
                'Google Drive branded "Drive Not Connected" modal with logo, Retry and Change Folder buttons',
                'Chat unread badge — red circle with white count on Chat tab, persists across restarts',
                'Live chat toast notification — "New message received" popup when not on Chat tab',
                'Review tab auto-hides from nav bar when queue is empty, shows when files exist',
                'Admin-only "Clear Chat" button in Settings > Moderation — deletes all messages with confirmation',
                'Stats tab now shows Top 2 users side by side instead of single top user',
                'Header refresh button now refreshes chat messages and badge even on other tabs'
            ],
            fixed: [
                'Fixed "Loading review queue..." getting stuck when review queue is empty',
                'Fixed Complete FAB still showing when no Illustrator file is open',
                'Fixed Complete FAB showing on Chat tab — now hidden correctly',
                'Fixed updater showing "you are on the latest" due to GitHub CDN caching — added cache-busting to check-update.bat and update.bat',
                'Robust folder accessibility check using fs.readdirSync to detect disconnected Google Drive folders'
            ],
            improved: [
                'Chat polling interval reduced from 5 seconds to 1 second for more responsive messaging',
                'Setup dialog pre-fills previous folder paths when opened from Drive Missing modal'
            ]
        },
        '2.1.8': {
            date: 'May 2026',
            new: [
                'Team Chat tab — each user has their own messages file (no write conflicts)',
                'Chat avatars — profile pictures shown next to messages'
            ],
            fixed: [
                'Navigate button hidden on Chat tab to prevent overlap with input'
            ],
            improved: []
        },
        '2.1.5': {
            date: 'May 2026',
            new: [
                'Team Chat tab — real-time messaging shared across all users via the tasks folder'
            ],
            fixed: [],
            improved: []
        },
        '2.1.4': {
            date: 'May 2026',
            new: [],
            fixed: [
                'First login and user switch no longer force password setup — users can log in directly'
            ],
            improved: []
        },
        '2.1.3': {
            date: 'May 2026',
            new: [
                'Move to Completed button now appears when opening files via Surah opener',
                'Auto-open next page from queue now opens the next page number after the one closed',
                'Drive missing detection: shows "Connect or open drive" instead of defaulting to muzakkir user'
            ],
            fixed: [
                'Move to Completed button is now hidden when a file is already in the Completed folder'
            ],
            improved: []
        },
        '2.1.2': {
            date: 'April 2026',
            new: [
                'Active Users stat card now shows a hover tooltip listing each user and their page count'
            ],
            fixed: [
                'Restart banner layout no longer crams text into narrow columns — clean vertical stack',
                'Export CSV button properly hidden from all users (was showing for admins)',
                'Activity log table columns resized: wider User column, right-aligned File names'
            ],
            improved: [
                'Stats UI polish for narrow panel readability'
            ]
        },
        '2.1.1': {
            date: 'April 2026',
            new: [
                'Manual "Restart Illustrator" button after update (more reliable than auto-restart)',
                'Prominent green success banner when update completes'
            ],
            fixed: [
                'Changelog now shows correctly after manual login',
                'Illustrator restart reliability improved with PowerShell path lookup',
                'No more forced re-login on every update — only on first install'
            ],
            improved: [
                'Update confirmation message is clearer about manual restart',
                'Restart button gives visual feedback when clicked'
            ]
        },
        '2.1.0': {
            date: 'April 2026',
            new: [
                'Auto-restart Illustrator after update installation',
                'Professional Admin Controls UI with grouped sections',
                'Custom confirmation dialogs (no more white browser popups)',
                '"What\'s New" changelog shown after each update',
                'Red badge on Review Complaints when complaints exist'
            ],
            fixed: [
                'Update buttons no longer overflow their container',
                'Admin buttons text no longer spills outside on hover',
                'Cleaner update.bat using robocopy instead of xcopy'
            ],
            improved: [
                'Admin section now grouped by User / Riwayah / Moderation',
                'Force re-login after extension update for security',
                'Better permission check before starting update'
            ]
        },
        '2.0.1': {
            date: 'April 2026',
            fixed: [
                'Updater batch files improved for reliability'
            ]
        }
    };

    function showChangelog(version) {
        var modal = document.getElementById('changelogModal');
        var versionEl = document.getElementById('changelogVersion');
        var bodyEl = document.getElementById('changelogBody');
        var closeBtn = document.getElementById('changelogCloseBtn');
        if (!modal || !bodyEl) return;

        var data = CHANGELOG[version];
        if (!data) return;

        var isAdmin = (typeof authState !== 'undefined' && authState.isAdmin);

        function renderItems(items) {
            if (!items || !items.length) return '';
            var out = '';
            items.forEach(function(item) {
                var text = item;
                var adminOnly = false;
                if (typeof item === 'object' && item.text) {
                    text = item.text;
                    adminOnly = !!item.adminOnly;
                }
                if (adminOnly && !isAdmin) return; // Skip admin-only items for non-admins
                var badge = adminOnly ? ' <span class="admin-badge-inline">ADMIN</span>' : '';
                out += '<li>' + escapeHtml(text) + badge + '</li>';
            });
            return out;
        }

        versionEl.textContent = 'v' + version;
        var html = '';
        var newItems = renderItems(data.new);
        if (newItems) {
            html += '<div class="changelog-section"><div class="changelog-section-title new">✨ New</div><ul class="changelog-list">' + newItems + '</ul></div>';
        }
        var fixedItems = renderItems(data.fixed);
        if (fixedItems) {
            html += '<div class="changelog-section"><div class="changelog-section-title fixed">🐛 Fixed</div><ul class="changelog-list">' + fixedItems + '</ul></div>';
        }
        var improvedItems = renderItems(data.improved);
        if (improvedItems) {
            html += '<div class="changelog-section"><div class="changelog-section-title improved">⚡ Improved</div><ul class="changelog-list">' + improvedItems + '</ul></div>';
        }
        bodyEl.innerHTML = html;
        modal.classList.remove('hidden');

        function handleClose() {
            modal.classList.add('hidden');
            closeBtn.removeEventListener('click', handleClose);
        }
        closeBtn.addEventListener('click', handleClose);
    }

    window.generateId = generateId;
    window.formatDate = formatDate;
    window.escapeHtml = escapeHtml;
    window.detectRiwayahFromFilename = detectRiwayahFromFilename;
    window.showConfirm = showConfirm;
    window.showChangelog = showChangelog;
    window.CHANGELOG = CHANGELOG;

    window.MushafUtils = {
        generateId: generateId,
        formatDate: formatDate,
        escapeHtml: escapeHtml,
        detectRiwayahFromFilename: detectRiwayahFromFilename,
        showConfirm: showConfirm,
        showChangelog: showChangelog
    };

})(window);
