function loadMushafData() {
    try {
        let extensionRoot = '';
        
        if (window.location.href.startsWith('file:///')) {
            const fullPath = decodeURIComponent(window.location.href.replace('file:///', ''));
            extensionRoot = path.dirname(fullPath);
            console.log('Extension root from window.location:', extensionRoot);
        } else {
            extensionRoot = __dirname;
        }
        
        const mushafDataPath = path.join(extensionRoot, 'css', 'mushaf_info.json');
        
        console.log('Looking for mushaf_info.json at:', mushafDataPath);
        console.log('File exists?', fs.existsSync(mushafDataPath));
        
        if (!fs.existsSync(mushafDataPath)) {
            const altPath = path.join(extensionRoot, '..', 'css', 'mushaf_info.json');
            console.log('Trying alternative path:', altPath);
            
            if (fs.existsSync(altPath)) {
                console.log('Found at alternative path');
                const rawData = fs.readFileSync(altPath, 'utf8');
                const data = JSON.parse(rawData);
                state.mushafData.surahStatistics = data.surah_statistics || [];
                state.mushafData.pageStatistics = data.page_statistics || [];
            } else {
                console.error('mushaf_info.json not found in either location');
                return false;
            }
        } else {
            const rawData = fs.readFileSync(mushafDataPath, 'utf8');
            const data = JSON.parse(rawData);
            state.mushafData.surahStatistics = data.surah_statistics || [];
            state.mushafData.pageStatistics = data.page_statistics || [];
        }
        
        console.log(`✓ Successfully loaded:`);
        console.log(`  - ${state.mushafData.surahStatistics.length} surahs`);
        console.log(`  - ${state.mushafData.pageStatistics.length} pages`);
        
        if (state.mushafData.pageStatistics.length === 0) {
            console.error('ERROR: pageStatistics array is empty!');
            return false;
        }
        
        return true;
        
    } catch (e) {
        console.error('Error loading mushaf_info.json:', e);
        console.error('Stack:', e.stack);
        return false;
    }
}
function setupSurahControls() {
    const input = document.getElementById('goToSurahInput');
    const select = document.getElementById('goToSurahSelect');
    const ayahInput = document.getElementById('goToAyahInput');
    const ayahSelect = document.getElementById('goToAyahSelect');
    const pageInput = document.getElementById('goToPageInput');
    
    if (!input || !select) return;
    
    // CRITICAL: Set explicit tab order to force Surah → Ayah → Page
    input.setAttribute('tabindex', '1');
    select.setAttribute('tabindex', '-1'); // Skip the dropdown in tab order
    if (ayahInput) ayahInput.setAttribute('tabindex', '2');
    if (ayahSelect) ayahSelect.setAttribute('tabindex', '-1'); // Skip dropdown
    if (pageInput) pageInput.setAttribute('tabindex', '3');
    
    // Populate dropdown with surah001-surah114
    select.innerHTML = '<option value="">---</option>';
    for (let i = 1; i <= 114; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `surah${i.toString().padStart(3, '0')}`;
        select.appendChild(option);
    }
    
    input.addEventListener('input', function() {
        let val = parseInt(this.value);
        
        if (val > 114) {
            this.value = 114;
            val = 114;
        }
        if (val < 1) {
            this.value = '';
            val = null;
        }
        
        if (val >= 1 && val <= 114) {
            select.value = val;
            populateAyahDropdown(val);
            
            // Auto-select ayah 1 when surah changes
            if (ayahInput && ayahSelect) {
                setTimeout(() => {
                    ayahInput.value = "1";
                    ayahSelect.value = "1";
                }, 50);
            }
        } else {
            select.value = "";
            populateAyahDropdown(null);
        }
        
        if (pageInput) pageInput.value = '';
    });

    // AGGRESSIVE Tab interception: Surah Input → Ayah Input
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Tab' && !e.shiftKey) {
            // Stop browser default immediately
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            // Focus Ayah input if it exists and is enabled
            if (ayahInput && !ayahInput.disabled) {
                setTimeout(() => {
                    ayahInput.focus();
                    ayahInput.select();
                }, 0);
            }
            
            return false; // Extra prevention
        }
    }, true); // Use capture phase to catch event early
    
    // Also intercept from Surah Select
    select.addEventListener('keydown', function(e) {
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            if (ayahInput && !ayahInput.disabled) {
                ayahInput.focus();
            }
        }
    });
    
    // Reverse: Shift+Tab from Ayah → Surah Input
    if (ayahInput) {
        ayahInput.addEventListener('keydown', function(e) {
            if (e.key === 'Tab' && e.shiftKey) {
                e.preventDefault();
                input.focus();
            }
        });
    }
    
    select.addEventListener('change', function() {
        const val = parseInt(this.value);
        if (val) {
            input.value = val;
            populateAyahDropdown(val);
            
            // Auto-select ayah 1 when surah changes
            if (ayahInput && ayahSelect) {
                setTimeout(() => {
                    ayahInput.value = "1";
                    ayahSelect.value = "1";
                }, 50);
            }
            if (pageInput) pageInput.value = '';
        }
    });
    
    // Ayah Input handling
    if (ayahInput) {
        ayahInput.addEventListener('input', function() {
            let val = parseInt(this.value);
            const maxAyah = parseInt(this.getAttribute('max') || 999);
            
            // Validate max
            if (val > maxAyah) {
                this.value = maxAyah;
                val = maxAyah;
            }
            if (val < 1) {
                this.value = '';
                val = null;
            }
            
            // Sync with select
            if (ayahSelect && val >= 1 && val <= maxAyah) {
                ayahSelect.value = val;
            }
            
            if (pageInput) pageInput.value = '';
        });
        
        // Tab from Ayah Input → Page Input
        ayahInput.addEventListener('keydown', function(e) {
            if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault();
                if (pageInput) {
                    pageInput.focus();
                }
            }
        });
    }
    
    // Ayah Select change handling
    if (ayahSelect) {
        ayahSelect.addEventListener('change', function() {
            const val = this.value;
            if (ayahInput && val) {
                ayahInput.value = val;
            }
        });
    }
    
    // Restore last searched
    if (state.lastSearchedSurah) {
        input.value = state.lastSearchedSurah;
        select.value = state.lastSearchedSurah;
        populateAyahDropdown(state.lastSearchedSurah);
        
        if (state.lastSearchedAyah) {
            setTimeout(() => { 
                if (ayahSelect) ayahSelect.value = state.lastSearchedAyah;
                if (ayahInput) ayahInput.value = state.lastSearchedAyah;
            }, 100);
        }
    }
}

function populateAyahDropdown(surahNumber) {
    const select = document.getElementById('goToAyahSelect');
    const input = document.getElementById('goToAyahInput');
    if (!select) return;
    
    while (select.options.length > 0) {
        select.remove(0);
    }
    
    if (!surahNumber) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "-";
        select.appendChild(option);
        select.disabled = true;
        if (input) {
            input.disabled = true;
            input.value = '';
            input.removeAttribute('max');
        }
        return;
    }
    
    const surah = state.mushafData.surahStatistics.find(s => s.surah_number === parseInt(surahNumber));
    if (!surah) {
        select.disabled = true;
        if (input) {
            input.disabled = true;
            input.value = '';
            input.removeAttribute('max');
        }
        return;
    }
    
    for (let i = 1; i <= surah.total_ayahs; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        select.appendChild(option);
    }
    
    select.disabled = false;
    
    // Enable input and set max
    if (input) {
        input.disabled = false;
        input.setAttribute('max', surah.total_ayahs);
        input.setAttribute('placeholder', `1-${surah.total_ayahs}`);
    }
}

function findPageFromSurahAyah(surahNumber, ayahNumber) {
    if (!surahNumber || !ayahNumber) return null;
    
    const surahNum = parseInt(surahNumber);
    const ayahNum = parseInt(ayahNumber);
    
    console.log(`\n=== SEARCHING ===`);
    console.log(`Surah: ${surahNum}, Ayah: ${ayahNum}`);
    
    if (state.mushafData.pageStatistics.length === 0) {
        console.error('ERROR: No page data loaded!');
        return null;
    }
    
    for (const p of state.mushafData.pageStatistics) {
        const pageNum = parseInt(p.page_number);
        const fromSurah = parseInt(p.from_surah);
        const toSurah = parseInt(p.to_surah);
        const fromAyah = parseInt(p.from_ayah);
        const toAyah = parseInt(p.to_ayah);
        
        const isSurahOnPage = (surahNum >= fromSurah && surahNum <= toSurah);
        const pageSurahs = Array.isArray(p.surahs) ? p.surahs.map(Number) : [];
        const isInSurahsArray = pageSurahs.includes(surahNum);
        
        if (!isSurahOnPage && !isInSurahsArray) continue;
        
        console.log(`Page ${pageNum}: range ${fromSurah}:${fromAyah} - ${toSurah}:${toAyah}`);
        
        let match = false;
        
        if (fromSurah === toSurah && fromSurah === surahNum) {
            match = ayahNum >= fromAyah && ayahNum <= toAyah;
            if (match) console.log(`  ✓ Single surah ${surahNum}, ayah ${ayahNum} in range ${fromAyah}-${toAyah}`);
        }
        else if (surahNum === fromSurah) {
            match = ayahNum >= fromAyah;
            if (match) console.log(`  ✓ Starting surah ${surahNum} from ayah ${fromAyah} onwards`);
        }
        else if (surahNum === toSurah) {
            match = ayahNum <= toAyah;
            if (match) console.log(`  ✓ Ending surah ${surahNum} up to ayah ${toAyah}`);
        }
        else if (surahNum > fromSurah && surahNum < toSurah) {
            match = true;
            console.log(`  ✓ Middle surah ${surahNum} (between ${fromSurah} and ${toSurah})`);
        }
        
        if (match) {
            console.log(`=== FOUND PAGE ${pageNum} ===\n`);
            return pageNum;
        }
    }
    
    console.log(`=== NOT FOUND ===\n`);
    return null;
}
function getSurahInfoFromPage(pageNumber) {
    if (!state.mushafData.pageStatistics || state.mushafData.pageStatistics.length === 0) {
        return null;
    }
    
    const pageData = state.mushafData.pageStatistics.find(p => parseInt(p.page_number) === parseInt(pageNumber));
    if (!pageData) return null;
    
    const fromSurah = parseInt(pageData.from_surah);
    const toSurah = parseInt(pageData.to_surah);
    
    const formatSurah = (num) => `surah${num.toString().padStart(3, '0')}`;
    
    return {
        fromSurah: fromSurah,
        toSurah: toSurah,
        isMultiSurah: fromSurah !== toSurah,
        primarySurah: formatSurah(fromSurah),
        secondarySurah: fromSurah !== toSurah ? formatSurah(toSurah) : null,
        displayText: fromSurah === toSurah ? formatSurah(fromSurah) : `${formatSurah(fromSurah)} ${formatSurah(toSurah)}`
    };
}
