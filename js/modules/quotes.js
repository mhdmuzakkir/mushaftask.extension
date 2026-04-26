function getProjectQuotesPath(filename) {
    if (!state.projectFolder) return null;
    return path.join(state.projectFolder, 'quotes', filename || 'quotes.json');
}
function ensureQuotesFolder() {
    try {
        console.log('ensureQuotesFolder called, projectFolder:', state.projectFolder);
        if (!state.projectFolder) {
            console.log('ensureQuotesFolder: projectFolder is null, skipping');
            return;
        }
        const quotesFolder = path.join(state.projectFolder, 'quotes');
        console.log('ensureQuotesFolder: quotesFolder path:', quotesFolder);
        if (!fs.existsSync(quotesFolder)) {
            fs.mkdirSync(quotesFolder, { recursive: true });
            console.log('Created quotes folder in project:', quotesFolder);
        }
        // Copy base quotes.json if master doesn't exist
        const masterPath = path.join(quotesFolder, 'quotes.json');
        if (!fs.existsSync(masterPath)) {
            let extensionRoot = '';
            if (window.location.href.startsWith('file:///')) {
                const fullPath = decodeURIComponent(window.location.href.replace('file:///', ''));
                extensionRoot = path.dirname(fullPath);
            } else {
                extensionRoot = __dirname;
            }
            const localQuotesPath = path.join(extensionRoot, 'assets', 'quotes.json');
            console.log('ensureQuotesFolder: looking for local quotes at:', localQuotesPath);
            if (fs.existsSync(localQuotesPath)) {
                // Use read+write instead of copyFileSync for older Node compatibility
                const quotesData = fs.readFileSync(localQuotesPath);
                fs.writeFileSync(masterPath, quotesData);
                console.log('Copied base quotes.json to project quotes folder:', masterPath);
            } else {
                console.log('ensureQuotesFolder: local quotes.json not found, creating empty master');
                fs.writeFileSync(masterPath, '[]', 'utf8');
            }
        }
        // Create empty blacklist if missing
        const blacklistPath = path.join(quotesFolder, 'quote-blacklist.json');
        if (!fs.existsSync(blacklistPath)) {
            fs.writeFileSync(blacklistPath, '[]', 'utf8');
            console.log('Created empty blacklist:', blacklistPath);
        }
        // Create empty complaints if missing
        const complaintsPath = path.join(quotesFolder, 'quote-complaints.json');
        if (!fs.existsSync(complaintsPath)) {
            fs.writeFileSync(complaintsPath, '[]', 'utf8');
            console.log('Created empty complaints:', complaintsPath);
        }
    } catch (e) {
        console.error('Error ensuring quotes folder:', e);
        console.error('Stack:', e.stack);
    }
}
function loadQuotes() {
    try {
        // Priority 1: Project folder quotes/quotes.json
        const projectQuotesPath = getProjectQuotesPath('quotes.json');
        if (projectQuotesPath && fs.existsSync(projectQuotesPath)) {
            const raw = fs.readFileSync(projectQuotesPath, 'utf8').replace(/^\uFEFF/, '');
            const data = JSON.parse(raw);
            QUOTES = Array.isArray(data) ? data : (data.quotes || []);
            console.log(`Loaded ${QUOTES.length} quotes from project quotes folder`);
            return;
        }
        
        // Priority 2: Legacy root project folder fallback
        if (state.projectFolder && fs.existsSync(state.projectFolder)) {
            const legacyPath = path.join(state.projectFolder, 'quotes.json');
            if (fs.existsSync(legacyPath)) {
                const raw = fs.readFileSync(legacyPath, 'utf8').replace(/^\uFEFF/, '');
                const data = JSON.parse(raw);
                QUOTES = Array.isArray(data) ? data : (data.quotes || []);
                console.log(`Loaded ${QUOTES.length} quotes from legacy project path`);
                return;
            }
        }
        
        // Priority 3: Local assets fallback
        let extensionRoot = '';
        if (window.location.href.startsWith('file:///')) {
            const fullPath = decodeURIComponent(window.location.href.replace('file:///', ''));
            extensionRoot = path.dirname(fullPath);
            console.log('Quotes: extensionRoot from window.location:', extensionRoot);
        } else {
            extensionRoot = __dirname;
            console.log('Quotes: extensionRoot from __dirname:', extensionRoot);
        }
        let quotesPath = path.join(extensionRoot, 'assets', 'quotes.json');
        console.log('Trying quotes path:', quotesPath);
        
        if (!fs.existsSync(quotesPath)) {
            const altPath = path.join(extensionRoot, '..', 'assets', 'quotes.json');
            console.log('Trying alt quotes path:', altPath);
            if (fs.existsSync(altPath)) {
                quotesPath = altPath;
            } else {
                console.error('quotes.json not found at either path');
                return;
            }
        }
        
        const raw = fs.readFileSync(quotesPath, 'utf8');
        console.log('quotes.json first 50 chars:', JSON.stringify(raw.substring(0, 50)));
        const clean = raw.replace(/^\uFEFF/, '');
        const data = JSON.parse(clean);
        QUOTES = Array.isArray(data) ? data : (data.quotes || []);
        console.log(`Loaded ${QUOTES.length} quotes from JSON`);
        if (QUOTES.length > 0) {
            console.log('First quote sample:', QUOTES[0].quote.substring(0, 30));
        }
    } catch (e) {
        console.error('Error loading quotes:', e);
        console.error('Stack:', e.stack);
    }
}
function showRandomQuote() {
    if (QUOTES.length === 0) return;
    const idx = Math.floor(Math.random() * QUOTES.length);
    const q = QUOTES[idx];
    state.currentQuote = q;
    const quoterEl = document.getElementById('quoteQuoter');
    const textEl = document.getElementById('quoteText');
    const refEl = document.getElementById('quoteReference');
    if (quoterEl) quoterEl.textContent = q.quoter;
    if (textEl) textEl.textContent = q.quote;
    if (refEl) refEl.textContent = q.reference;
    updateQuoteFlagIcon();
}
function getUserQuotesPath() {
    if (!state.tasksFolder || !authState.currentUser) return null;
    const quotesDir = path.join(state.tasksFolder, 'quotes');
    return path.join(quotesDir, authState.currentUser.toLowerCase() + '.json');
}
function loadUserQuotes() {
    try {
        const quotesPath = getUserQuotesPath();
        if (!quotesPath) return [];
        if (!fs.existsSync(quotesPath)) return [];
        const raw = fs.readFileSync(quotesPath, 'utf8').replace(/^\uFEFF/, '');
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error('Error loading user quotes:', e);
        return [];
    }
}
function saveUserQuotes(quotes) {
    try {
        const quotesPath = getUserQuotesPath();
        if (!quotesPath) return false;
        const quotesDir = path.dirname(quotesPath);
        if (!fs.existsSync(quotesDir)) {
            fs.mkdirSync(quotesDir, { recursive: true });
        }
        fs.writeFileSync(quotesPath, JSON.stringify(quotes, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Error saving user quotes:', e);
        return false;
    }
}
function saveUserQuote(quoteObj) {
    const quotes = loadUserQuotes();
    if (quoteObj.id) {
        const idx = quotes.findIndex(q => q.id === quoteObj.id);
        if (idx !== -1) {
            quotes[idx] = { ...quoteObj };
        } else {
            quotes.push({ ...quoteObj });
        }
    } else {
        quoteObj.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        quotes.push(quoteObj);
    }
    return saveUserQuotes(quotes);
}
function deleteUserQuote(id) {
    const quotes = loadUserQuotes();
    const filtered = quotes.filter(q => q.id !== id);
    return saveUserQuotes(filtered);
}
function renderUserQuotes() {
    const tbody = document.getElementById('myQuotesTableBody');
    if (!tbody) return;
    const quotes = loadUserQuotes();
    if (quotes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">No quotes added yet</td></tr>';
        return;
    }
    tbody.innerHTML = quotes.map(q => `
        <tr>
            <td class="quote-cell" title="${escapeHtml(q.quote)}">${escapeHtml(q.quote)}</td>
            <td>${escapeHtml(q.quoter)}</td>
            <td>${escapeHtml(q.reference)}</td>
            <td class="actions-cell">
                <button onclick="editUserQuote('${q.id}')" title="Edit">Edit</button>
                <button onclick="deleteUserQuoteAndRefresh('${q.id}')" title="Delete">Delete</button>
            </td>
        </tr>
    `).join('');
}
function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function editUserQuote(id) {
    const quotes = loadUserQuotes();
    const q = quotes.find(qt => qt.id === id);
    if (!q) return;
    document.getElementById('editQuoteId').value = q.id;
    document.getElementById('quoteInputText').value = q.quote;
    document.getElementById('quoteInputQuoter').value = q.quoter;
    document.getElementById('quoteInputReference').value = q.reference || '';
    document.getElementById('quoteFormTitle').textContent = 'Edit Quote';
    document.getElementById('saveQuoteBtn').textContent = 'Update Quote';
    document.getElementById('cancelQuoteEdit').classList.remove('hidden');
}
function deleteUserQuoteAndRefresh(id) {
    showConfirm('Are you sure you want to delete this quote?', function() {
        if (deleteUserQuote(id)) {
            renderUserQuotes();
            showToast('Quote deleted', 'success');
        } else {
            showToast('Failed to delete quote', 'error');
        }
    });
}
function resetQuoteForm() {
    document.getElementById('editQuoteId').value = '';
    document.getElementById('quoteInputText').value = '';
    document.getElementById('quoteInputQuoter').value = '';
    document.getElementById('quoteInputReference').value = '';
    document.getElementById('quoteFormTitle').textContent = 'Add New Quote';
    document.getElementById('saveQuoteBtn').textContent = 'Save Quote';
    document.getElementById('cancelQuoteEdit').classList.add('hidden');
}
function openMyQuotesModal() {
    resetQuoteForm();
    renderUserQuotes();
    document.getElementById('myQuotesModal').classList.remove('hidden');
}
function closeMyQuotesModal() {
    document.getElementById('myQuotesModal').classList.add('hidden');
}
function handleSaveQuote() {
    const id = document.getElementById('editQuoteId').value;
    const quote = document.getElementById('quoteInputText').value.trim();
    const quoter = document.getElementById('quoteInputQuoter').value.trim();
    const reference = document.getElementById('quoteInputReference').value.trim();
    if (!quote || !quoter) {
        showToast('Quote and Quoter are required', 'error');
        return;
    }
    const quoteObj = { quote, quoter, reference };
    if (id) quoteObj.id = id;
    if (saveUserQuote(quoteObj)) {
        renderUserQuotes();
        resetQuoteForm();
        showToast(id ? 'Quote updated' : 'Quote saved', 'success');
    } else {
        showToast('Failed to save quote', 'error');
    }
}
function getUserChangesPath() {
    if (!state.tasksFolder || !authState.currentUser) return null;
    return path.join(state.tasksFolder, 'quotes', 'change-' + authState.currentUser.toLowerCase() + '.json');
}
function loadUserChanges() {
    try {
        const changesPath = getUserChangesPath();
        if (!changesPath || !fs.existsSync(changesPath)) return [];
        const raw = fs.readFileSync(changesPath, 'utf8').replace(/^\uFEFF/, '');
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error('Error loading user changes:', e);
        return [];
    }
}
function saveUserChange(changeObj) {
    try {
        const changesPath = getUserChangesPath();
        if (!changesPath) return false;
        const changesDir = path.dirname(changesPath);
        if (!fs.existsSync(changesDir)) {
            fs.mkdirSync(changesDir, { recursive: true });
        }
        const changes = loadUserChanges();
        changeObj.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        changeObj.timestamp = new Date().toISOString();
        changes.push(changeObj);
        fs.writeFileSync(changesPath, JSON.stringify(changes, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Error saving user change:', e);
        return false;
    }
}
function mergeAllQuotes() {
    try {
        if (!state.tasksFolder) {
            showToast('Tasks folder not set', 'error');
            return;
        }
        if (!state.projectFolder) {
            showToast('Project folder not set', 'error');
            return;
        }
        ensureQuotesFolder();
        const quotesDir = path.join(state.tasksFolder, 'quotes');
        let allQuotes = [];
        
        // Start with local assets as base
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
            allQuotes = Array.isArray(data) ? data : (data.quotes || []);
        }
        
        // Merge all user contributions (skip change-*.json files)
        if (fs.existsSync(quotesDir)) {
            const files = fs.readdirSync(quotesDir).filter(f => f.endsWith('.json') && !f.startsWith('change-'));
            for (const file of files) {
                const userPath = path.join(quotesDir, file);
                const raw = fs.readFileSync(userPath, 'utf8').replace(/^\uFEFF/, '');
                const userQuotes = JSON.parse(raw);
                if (Array.isArray(userQuotes)) {
                    for (const q of userQuotes) {
                        const exists = allQuotes.some(existing =>
                            existing.quote === q.quote && existing.quoter === q.quoter
                        );
                        if (!exists) {
                            allQuotes.push({
                                quote: q.quote,
                                quoter: q.quoter,
                                reference: q.reference || ''
                            });
                        }
                    }
                }
            }
        }
        
        // Apply all user proposed changes from change-*.json files
        if (fs.existsSync(quotesDir)) {
            const changeFiles = fs.readdirSync(quotesDir).filter(f => f.startsWith('change-') && f.endsWith('.json'));
            for (const file of changeFiles) {
                const changePath = path.join(quotesDir, file);
                const raw = fs.readFileSync(changePath, 'utf8').replace(/^\uFEFF/, '');
                const changes = JSON.parse(raw);
                if (Array.isArray(changes)) {
                    for (const change of changes) {
                        const targetQuote = (change.originalQuote || '').trim();
                        const targetQuoter = (change.originalQuoter || '').trim();
                        const idx = allQuotes.findIndex(q =>
                            (q.quote || '').trim() === targetQuote && (q.quoter || '').trim() === targetQuoter
                        );
                        if (idx !== -1) {
                            allQuotes[idx] = {
                                quote: change.newQuote,
                                quoter: change.newQuoter,
                                reference: change.newReference || ''
                            };
                            console.log(`Applied change: "${targetQuote}" → "${change.newQuote}"`);
                        }
                    }
                }
            }
        }
        
        // Filter out blacklisted quotes before writing
        const blacklist = loadQuoteBlacklist();
        const filteredQuotes = allQuotes.filter(q => {
            const hash = getQuoteId(q.quote, q.quoter);
            return !blacklist.includes(hash);
        });
        
        // Write merged quotes to project folder
        const projectQuotesPath = getProjectQuotesPath('quotes.json');
        fs.writeFileSync(projectQuotesPath, JSON.stringify(filteredQuotes, null, 2), 'utf8');
        
        // Clear all change-*.json files after successful merge
        if (fs.existsSync(quotesDir)) {
            const changeFiles = fs.readdirSync(quotesDir).filter(f => f.startsWith('change-') && f.endsWith('.json'));
            for (const file of changeFiles) {
                fs.unlinkSync(path.join(quotesDir, file));
                console.log('Cleared change file after merge:', file);
            }
        }
        
        // Reload quotes immediately
        loadQuotes();
        showRandomQuote();
        
        const filteredCount = allQuotes.length - filteredQuotes.length;
        if (filteredCount > 0) {
            showToast(`Merged ${filteredQuotes.length} quotes (${filteredCount} blacklisted)`, 'success');
        } else {
            showToast(`Merged ${filteredQuotes.length} quotes into master list`, 'success');
        }
        console.log(`Quotes update: merged ${filteredQuotes.length} quotes (${filteredCount} blacklisted)`);
    } catch (e) {
        console.error('Error merging quotes:', e);
        showToast('Failed to merge quotes', 'error');
    }
}
function getQuoteId(quote, quoter) {
    const str = (quote || '').trim() + '|' + (quoter || '').trim();
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'q_' + Math.abs(hash).toString(36);
}
