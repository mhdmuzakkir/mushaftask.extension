function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Only handle if not in an input/textarea
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            return;
        }
        
        // Ctrl/Cmd + Shift + N = Next Page
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
            e.preventDefault();
            goToNextPage();
        }
        
        // Ctrl/Cmd + Shift + P = Previous Page
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
            e.preventDefault();
            goToPreviousPage();
        }
        
        // Ctrl/Cmd + Shift + R = Refresh
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
            e.preventDefault();
            refreshUI();
            showToast('Refreshed', 'info');
        }
        
        // Ctrl/Cmd + Shift + M = Move to Completed
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'M') {
            e.preventDefault();
            moveToCompleted();
        }
        
        // Escape = Close any open modal
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                if (!modal.classList.contains('hidden') && modal.id !== 'setupModal') {
                    modal.classList.add('hidden');
                }
            });
        }
    });
}
