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

        versionEl.textContent = 'v' + version;
        var html = '';
        if (data.new && data.new.length) {
            html += '<div class="changelog-section"><div class="changelog-section-title new">✨ New</div><ul class="changelog-list">';
            data.new.forEach(function(item) { html += '<li>' + escapeHtml(item) + '</li>'; });
            html += '</ul></div>';
        }
        if (data.fixed && data.fixed.length) {
            html += '<div class="changelog-section"><div class="changelog-section-title fixed">🐛 Fixed</div><ul class="changelog-list">';
            data.fixed.forEach(function(item) { html += '<li>' + escapeHtml(item) + '</li>'; });
            html += '</ul></div>';
        }
        if (data.improved && data.improved.length) {
            html += '<div class="changelog-section"><div class="changelog-section-title improved">⚡ Improved</div><ul class="changelog-list">';
            data.improved.forEach(function(item) { html += '<li>' + escapeHtml(item) + '</li>'; });
            html += '</ul></div>';
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
