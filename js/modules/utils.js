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

    window.generateId = generateId;
    window.formatDate = formatDate;
    window.escapeHtml = escapeHtml;
    window.detectRiwayahFromFilename = detectRiwayahFromFilename;

    window.MushafUtils = {
        generateId: generateId,
        formatDate: formatDate,
        escapeHtml: escapeHtml,
        detectRiwayahFromFilename: detectRiwayahFromFilename
    };

})(window);
