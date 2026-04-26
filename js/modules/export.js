function populateExportRiwayahDropdown() {
    const select = document.getElementById('exportRiwayahSelect');
    if (!select || !state.tasksFolder) return;
    
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    try {
        const riwayahTasksPath = path.join(state.tasksFolder, 'riwayah-tasks');
        if (!fs.existsSync(riwayahTasksPath)) return;
        
        const riwayahs = fs.readdirSync(riwayahTasksPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        riwayahs.forEach(riwayah => {
            const option = document.createElement('option');
            option.value = riwayah;
            option.textContent = getRiwayahDisplayName(riwayah);
            select.appendChild(option);
        });
    } catch (e) {
        console.error('Error loading riwayahs for export:', e);
    }
}
async function startBatchExport() {
    const riwayah = document.getElementById('exportRiwayahSelect').value;
    const startPage = parseInt(document.getElementById('exportStartPage').value, 10);
    const endPage = parseInt(document.getElementById('exportEndPage').value, 10);
    const format = document.getElementById('exportFormat').value;
    const exportLocation = document.getElementById('exportLocation').value;
    const onlyCompleted = document.getElementById('exportOnlyCompleted').checked;
    
    if (!riwayah || !startPage || !endPage || !exportLocation) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    if (startPage > endPage) {
        showToast('Start page must be less than end page', 'error');
        return;
    }
    
    state.isExporting = true;
    const progressBar = document.getElementById('exportProgressFill');
    const progressText = document.getElementById('exportProgressText');
    const progressContainer = document.getElementById('exportProgress');
    
    progressContainer.classList.remove('hidden');
    
    const csInterface = new CSInterface();
    let exported = 0;
    let failed = 0;
    const total = endPage - startPage + 1;
    
    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
        const paddedPage = pageNum.toString().padStart(3, '0');
        const fileName = `${paddedPage}-${riwayah}.ai`;
        const juzFolder = getJuzFromPage(pageNum).toString().padStart(2, '0');
        
        // Check if should export (if onlyCompleted is checked)
        if (onlyCompleted && !isPageCompleted(riwayah, paddedPage)) {
            continue;
        }
        
        // Find file location
        let sourcePath = null;
        const locations = [
            path.join(state.projectFolder, riwayah, 'Completed', 'Ajza', juzFolder, fileName),
            path.join(state.projectFolder, riwayah, 'Ajza', juzFolder, fileName),
            path.join(state.projectFolder, riwayah, 'Review Task', fileName)
        ];
        
        for (const loc of locations) {
            if (fs.existsSync(loc)) {
                sourcePath = loc;
                break;
            }
        }
        
        if (!sourcePath) {
            failed++;
            continue;
        }
        
        // Export
        const ext = format === 'pdf' ? 'pdf' : 'png';
        const outputPath = path.join(exportLocation, `${paddedPage}-${riwayah}.${ext}`);
        
        try {
            const escapedSource = sourcePath.replace(/\\/g, '\\\\');
            const escapedOutput = outputPath.replace(/\\/g, '\\\\');
            
            // First, open the document
            const openResult = await new Promise((resolve) => {
                csInterface.evalScript(`openDocument("${escapedSource}")`, resolve);
            });
            
            if (openResult !== 'success') {
                console.error(`Failed to open ${fileName}: ${openResult}`);
                failed++;
                continue;
            }
            
            // Wait a moment for the document to fully load
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Now export the document
            const result = await new Promise((resolve) => {
                if (format === 'pdf') {
                    csInterface.evalScript(`exportAsPDF("${escapedOutput}")`, resolve);
                } else {
                    csInterface.evalScript(`exportAsPNG("${escapedOutput}", 1, 360)`, resolve);
                }
            });
            
            if (result === 'true') {
                exported++;
            } else {
                failed++;
            }
            
            // Close the document without saving
            await new Promise((resolve) => {
                csInterface.evalScript('closeActiveDocumentNoSave()', resolve);
            });
            
            // Wait a moment before opening the next file
            await new Promise(resolve => setTimeout(resolve, 200));
            
        } catch (e) {
            failed++;
            console.error('Export error:', e);
        }
        
        // Update progress
        const progress = Math.round(((pageNum - startPage + 1) / total) * 100);
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${pageNum - startPage + 1}/${total} (Exported: ${exported}, Failed: ${failed})`;
    }
    
    state.isExporting = false;
    showToast(`Export complete! ${exported} exported, ${failed} failed`, exported > 0 ? 'success' : 'error');
    
    setTimeout(() => {
        progressContainer.classList.add('hidden');
        document.getElementById('batchExportModal').classList.add('hidden');
    }, 2000);
}
