function getComplaintsPath() {
    return getProjectQuotesPath('quote-complaints.json');
}
function loadQuoteComplaints() {
    try {
        const complaintsPath = getComplaintsPath();
        if (!complaintsPath || !fs.existsSync(complaintsPath)) return [];
        const raw = fs.readFileSync(complaintsPath, 'utf8').replace(/^\uFEFF/, '');
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error('Error loading quote complaints:', e);
        return [];
    }
}
function saveQuoteComplaints(complaints) {
    try {
        const complaintsPath = getComplaintsPath();
        if (!complaintsPath) return false;
        fs.writeFileSync(complaintsPath, JSON.stringify(complaints, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Error saving quote complaints:', e);
        return false;
    }
}
function hasUserComplained(quoteId) {
    if (!authState.currentUser) return false;
    const complaints = loadQuoteComplaints();
    return complaints.some(c => c.quoteId === quoteId && c.complainedBy === authState.currentUser.toLowerCase() && c.status === 'open');
}
function getOpenComplaintCount() {
    const complaints = loadQuoteComplaints();
    return complaints.filter(c => c.status === 'open').length;
}
function updateQuoteFlagIcon() {
    const reportBtn = document.getElementById('reportQuoteBtn');
    const editBtn = document.getElementById('editQuoteBtn');
    if (!reportBtn || !editBtn) return;
    if (!authState.currentUser || !state.currentQuote) {
        reportBtn.classList.add('hidden');
        editBtn.classList.add('hidden');
        return;
    }
    reportBtn.classList.remove('hidden');
    editBtn.classList.remove('hidden');
    const quoteId = getQuoteId(state.currentQuote.quote, state.currentQuote.quoter);
    const complained = hasUserComplained(quoteId);
    if (complained) {
        reportBtn.classList.add('reported');
        reportBtn.title = 'You have reported this quote';
    } else {
        reportBtn.classList.remove('reported');
        reportBtn.title = 'Report this quote';
    }
}
function openReportQuoteModal() {
    if (!state.currentQuote) return;
    const q = state.currentQuote;
    const quoteId = getQuoteId(q.quote, q.quoter);
    if (hasUserComplained(quoteId)) {
        showToast('You have already reported this quote', 'info');
        return;
    }
    document.getElementById('reportQuotePreview').textContent = q.quote;
    document.getElementById('reportQuoteReason').value = '';
    document.getElementById('reportQuoteModal').classList.remove('hidden');
}
function closeReportQuoteModal() {
    document.getElementById('reportQuoteModal').classList.add('hidden');
}
function handleSubmitReportQuote() {
    const reason = document.getElementById('reportQuoteReason').value.trim();
    if (!reason) {
        showToast('Please provide a reason for the report', 'error');
        return;
    }
    if (!state.currentQuote || !authState.currentUser) return;
    const q = state.currentQuote;
    const quoteId = getQuoteId(q.quote, q.quoter);
    const complaints = loadQuoteComplaints();
    complaints.push({
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        quoteId: quoteId,
        quote: q.quote,
        quoter: q.quoter,
        reference: q.reference || '',
        complainedBy: authState.currentUser.toLowerCase(),
        reason: reason,
        timestamp: new Date().toISOString(),
        status: 'open'
    });
    if (saveQuoteComplaints(complaints)) {
        updateQuoteFlagIcon();
        updateComplaintsBadge();
        closeReportQuoteModal();
        showToast('Quote reported successfully. Admin will review.', 'success');
    } else {
        showToast('Failed to submit report', 'error');
    }
}
function openEditQuoteModal() {
    if (!state.currentQuote) return;
    const q = state.currentQuote;
    document.getElementById('editQuoteInputText').value = q.quote;
    document.getElementById('editQuoteInputQuoter').value = q.quoter;
    document.getElementById('editQuoteInputReference').value = q.reference || '';
    document.getElementById('editQuoteMode').value = 'propose';
    document.getElementById('editQuoteModalTitle').textContent = 'Propose Quote Change';
    document.getElementById('saveEditQuote').textContent = 'Propose Change';
    document.getElementById('editQuoteModal').classList.remove('hidden');
}
function openAdminEditQuote(complaintId) {
    const complaints = loadQuoteComplaints();
    const c = complaints.find(comp => comp.id === complaintId);
    if (!c) return;
    state._adminEditTarget = { quote: c.quote, quoter: c.quoter, reference: c.reference };
    document.getElementById('editQuoteInputText').value = c.quote;
    document.getElementById('editQuoteInputQuoter').value = c.quoter;
    document.getElementById('editQuoteInputReference').value = c.reference || '';
    document.getElementById('editQuoteMode').value = 'admin';
    document.getElementById('editQuoteModalTitle').textContent = 'Edit Quote';
    document.getElementById('saveEditQuote').textContent = 'Save Changes';
    document.getElementById('editQuoteModal').classList.remove('hidden');
}
function closeEditQuoteModal() {
    document.getElementById('editQuoteModal').classList.add('hidden');
    state._adminEditTarget = null;
}
function handleSaveQuoteEdit() {
    const newQuote = document.getElementById('editQuoteInputText').value.trim();
    const newQuoter = document.getElementById('editQuoteInputQuoter').value.trim();
    const newReference = document.getElementById('editQuoteInputReference').value.trim();
    if (!newQuote || !newQuoter) {
        showToast('Quote and Quoter are required', 'error');
        return;
    }
    const mode = document.getElementById('editQuoteMode').value;
    
    if (mode === 'propose') {
        // User proposing a change — save to change-{username}.json
        if (!state.currentQuote || !authState.currentUser) return;
        const oldQ = state.currentQuote;
        if (saveUserChange({
            originalQuote: oldQ.quote,
            originalQuoter: oldQ.quoter,
            originalReference: oldQ.reference || '',
            newQuote: newQuote,
            newQuoter: newQuoter,
            newReference: newReference
        })) {
            closeEditQuoteModal();
            showToast('Change proposed — admin will review on next Quotes Update', 'success');
        } else {
            showToast('Failed to propose change', 'error');
        }
        return;
    }
    
    // Admin direct edit mode
    const oldQ = state._adminEditTarget || state.currentQuote;
    if (!oldQ) return;
    const oldQuote = (oldQ.quote || '').trim();
    const oldQuoter = (oldQ.quoter || '').trim();
    let saved = false;
    try {
        // Update project folder quotes/quotes.json
        const projectQuotesPath = getProjectQuotesPath('quotes.json');
        if (projectQuotesPath && fs.existsSync(projectQuotesPath)) {
            const raw = fs.readFileSync(projectQuotesPath, 'utf8').replace(/^\uFEFF/, '');
            const data = JSON.parse(raw);
            const quotes = Array.isArray(data) ? data : (data.quotes || []);
            const idx = quotes.findIndex(q =>
                (q.quote || '').trim() === oldQuote && (q.quoter || '').trim() === oldQuoter
            );
            if (idx !== -1) {
                quotes[idx] = { quote: newQuote, quoter: newQuoter, reference: newReference };
                fs.writeFileSync(projectQuotesPath, JSON.stringify(quotes, null, 2), 'utf8');
                saved = true;
            }
        }
        // Update local assets quotes.json
        let extensionRoot = '';
        if (window.location.href.startsWith('file:///')) {
            const fullPath = decodeURIComponent(window.location.href.replace('file:///', ''));
            extensionRoot = path.dirname(fullPath);
        } else {
            extensionRoot = __dirname;
        }
        const localQuotesPath = path.join(extensionRoot, 'assets', 'quotes.json');
        if (fs.existsSync(localQuotesPath)) {
            const raw = fs.readFileSync(localQuotesPath, 'utf8').replace(/^\uFEFF/, '');
            const data = JSON.parse(raw);
            const quotes = Array.isArray(data) ? data : (data.quotes || []);
            const idx = quotes.findIndex(q =>
                (q.quote || '').trim() === oldQuote && (q.quoter || '').trim() === oldQuoter
            );
            if (idx !== -1) {
                quotes[idx] = { quote: newQuote, quoter: newQuoter, reference: newReference };
                fs.writeFileSync(localQuotesPath, JSON.stringify(quotes, null, 2), 'utf8');
                saved = true;
            }
        }
        // If quote was blacklisted, remove from blacklist since it's now fixed
        const blacklist = loadQuoteBlacklist();
        const oldHash = getQuoteId(oldQuote, oldQuoter);
        const blacklistIdx = blacklist.indexOf(oldHash);
        if (blacklistIdx !== -1) {
            blacklist.splice(blacklistIdx, 1);
            saveQuoteBlacklist(blacklist);
        }
    } catch (e) {
        console.error('Error saving quote edit:', e);
    }
    if (saved) {
        // Update current display if this is the currently shown quote
        if (state.currentQuote &&
            (state.currentQuote.quote || '').trim() === oldQuote &&
            (state.currentQuote.quoter || '').trim() === oldQuoter) {
            state.currentQuote = { quote: newQuote, quoter: newQuoter, reference: newReference };
            document.getElementById('quoteText').textContent = newQuote;
            document.getElementById('quoteQuoter').textContent = newQuoter;
            document.getElementById('quoteReference').textContent = newReference;
        }
        loadQuotes();
        closeEditQuoteModal();
        showToast('Quote updated successfully', 'success');
    } else {
        showToast('Quote not found in database', 'error');
    }
}
function updateComplaintsBadge() {
    const count = getOpenComplaintCount();
    const label = document.getElementById('reviewComplaintsLabel');
    if (label) {
        label.textContent = count > 0 ? 'Review Complaints (' + count + ')' : 'Review Complaints';
    }
}
function openReviewComplaintsModal() {
    renderComplaintsTable();
    document.getElementById('reviewComplaintsModal').classList.remove('hidden');
}
function closeReviewComplaintsModal() {
    document.getElementById('reviewComplaintsModal').classList.add('hidden');
}
function renderComplaintsTable() {
    const tbody = document.getElementById('complaintsTableBody');
    if (!tbody) return;
    const complaints = loadQuoteComplaints().filter(c => c.status === 'open');
    if (complaints.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No complaints to review</td></tr>';
        return;
    }
    tbody.innerHTML = complaints.map(c => `
        <tr>
            <td class="quote-cell" title="${escapeHtml(c.quote)}">${escapeHtml(c.quote)}</td>
            <td>${escapeHtml(c.quoter)}</td>
            <td>${escapeHtml(c.complainedBy)}</td>
            <td class="reason-cell" title="${escapeHtml(c.reason)}">${escapeHtml(c.reason)}</td>
            <td class="actions-cell">
                <button onclick="openAdminEditQuote('${c.id}')" title="Edit this quote">Edit</button>
                <button class="btn-verify" onclick="resolveQuoteComplaint('${c.id}', 'verified')" title="Mark as verified">Verify</button>
                <button class="btn-reject" onclick="resolveQuoteComplaint('${c.id}', 'rejected')" title="Dismiss">Dismiss</button>
            </td>
        </tr>
    `).join('');
}
function getQuoteBlacklistPath() {
    return getProjectQuotesPath('quote-blacklist.json');
}
function loadQuoteBlacklist() {
    try {
        const blacklistPath = getQuoteBlacklistPath();
        if (!blacklistPath || !fs.existsSync(blacklistPath)) return [];
        const raw = fs.readFileSync(blacklistPath, 'utf8').replace(/^\uFEFF/, '');
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error('Error loading quote blacklist:', e);
        return [];
    }
}
function saveQuoteBlacklist(blacklist) {
    try {
        const blacklistPath = getQuoteBlacklistPath();
        if (!blacklistPath) return false;
        fs.writeFileSync(blacklistPath, JSON.stringify(blacklist, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Error saving quote blacklist:', e);
        return false;
    }
}
function removeQuoteFromJson(quote, quoter) {
    try {
        let removed = false;
        const targetQuote = (quote || '').trim();
        const targetQuoter = (quoter || '').trim();
        // Remove from project folder quotes/quotes.json
        const projectQuotesPath = getProjectQuotesPath('quotes.json');
        if (projectQuotesPath && fs.existsSync(projectQuotesPath)) {
            const raw = fs.readFileSync(projectQuotesPath, 'utf8').replace(/^\uFEFF/, '');
            const data = JSON.parse(raw);
            const quotes = Array.isArray(data) ? data : (data.quotes || []);
            const filtered = quotes.filter(q =>
                (q.quote || '').trim() !== targetQuote || (q.quoter || '').trim() !== targetQuoter
            );
            if (filtered.length < quotes.length) {
                fs.writeFileSync(projectQuotesPath, JSON.stringify(filtered, null, 2), 'utf8');
                removed = true;
            }
        }
        // Remove from local assets quotes.json
        let extensionRoot = '';
        if (window.location.href.startsWith('file:///')) {
            const fullPath = decodeURIComponent(window.location.href.replace('file:///', ''));
            extensionRoot = path.dirname(fullPath);
        } else {
            extensionRoot = __dirname;
        }
        const localQuotesPath = path.join(extensionRoot, 'assets', 'quotes.json');
        if (fs.existsSync(localQuotesPath)) {
            const raw = fs.readFileSync(localQuotesPath, 'utf8').replace(/^\uFEFF/, '');
            const data = JSON.parse(raw);
            const quotes = Array.isArray(data) ? data : (data.quotes || []);
            const filtered = quotes.filter(q =>
                (q.quote || '').trim() !== targetQuote || (q.quoter || '').trim() !== targetQuoter
            );
            if (filtered.length < quotes.length) {
                fs.writeFileSync(localQuotesPath, JSON.stringify(filtered, null, 2), 'utf8');
                removed = true;
            }
        }
        return removed;
    } catch (e) {
        console.error('Error removing quote from JSON:', e);
        return false;
    }
}
function resolveQuoteComplaint(id, status) {
    const complaints = loadQuoteComplaints();
    const idx = complaints.findIndex(c => c.id === id);
    if (idx === -1) return;
    const complaint = complaints[idx];
    complaints[idx].status = status;
    complaints[idx].resolvedBy = authState.currentUser ? authState.currentUser.toLowerCase() : '';
    complaints[idx].resolvedAt = new Date().toISOString();
    
    let removedFromRotation = false;
    if (status === 'verified') {
        // Add to blacklist so it doesn't come back on next merge
        const blacklist = loadQuoteBlacklist();
        const quoteHash = getQuoteId(complaint.quote, complaint.quoter);
        if (!blacklist.includes(quoteHash)) {
            blacklist.push(quoteHash);
            saveQuoteBlacklist(blacklist);
        }
        // Remove from all quote JSON files
        removedFromRotation = removeQuoteFromJson(complaint.quote, complaint.quoter);
        // Reload quotes and refresh display
        loadQuotes();
        // If the currently displayed quote is the one removed, show a new one
        if (state.currentQuote &&
            (state.currentQuote.quote || '').trim() === (complaint.quote || '').trim() &&
            (state.currentQuote.quoter || '').trim() === (complaint.quoter || '').trim()) {
            showRandomQuote();
        }
    }
    
    if (saveQuoteComplaints(complaints)) {
        renderComplaintsTable();
        updateComplaintsBadge();
        if (status === 'verified') {
            showToast(removedFromRotation ? 'Quote removed from rotation' : 'Complaint verified', 'success');
        } else {
            showToast('Complaint dismissed', 'success');
        }
    } else {
        showToast('Failed to resolve complaint', 'error');
    }
}
