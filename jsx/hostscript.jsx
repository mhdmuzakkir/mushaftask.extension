/**
 * Mushaf Task Manager - ExtendScript Host
 * Illustrator Communication Script
 */

// ==================== DOCUMENT FUNCTIONS ====================

/**
 * Get the name of the currently active document
 * @return {string} Document name or "null" if no document open
 */
function getActiveDocumentName() {
    try {
        if (app.documents.length > 0) {
            return app.activeDocument.name;
        }
    } catch (e) {
        $.writeln("Error getting active document: " + e);
    }
    return "null";
}

/**
 * Get full path of the active document
 * @return {string} Document path or "null" if no document open
 */
function getActiveDocumentPath() {
    try {
        if (app.documents.length > 0) {
            return app.activeDocument.fullName.fsName;
        }
    } catch (e) {
        $.writeln("Error getting document path: " + e);
    }
    return "null";
}

/**
 * Close the active document
 * @return {string} "closed" on success, "null" or error on failure
 */
function closeActiveDocument() {
    try {
        if (app.documents.length > 0) {
            app.activeDocument.close(SaveOptions.SAVECHANGES);
            return "closed";
        }
    } catch (e) {
        return "ERROR: " + e.toString();
    }
    return "null";
}
function closeActiveDocumentNoSave() {
    try {
        if (app.documents.length > 0) {
            app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
            return "closed";
        }
        return "no document";
    } catch (e) {
        return "ERROR: " + e.toString();
    }
}
/**
 * Save the active document
 * @return {string} "saved" on success, "null" or error on failure
 */
function saveActiveDocument() {
    try {
        if (app.documents.length > 0) {
            app.activeDocument.save();
            return "saved";
        }
    } catch (e) {
        return "ERROR: " + e.toString();
    }
    return "null";
}

// ==================== FILE OPERATIONS ====================

/**
 * Check if a file exists
 * @param {string} filePath - Full path to file
 * @return {boolean} File exists
 */
function fileExists(filePath) {
    try {
        var file = new File(filePath);
        return file.exists;
    } catch (e) {
        $.writeln("Error checking file: " + e);
    }
    return false;
}

/**
 * Move/rename a file
 * @param {string} sourcePath - Source file path
 * @param {string} destPath - Destination file path
 * @return {boolean} Success status
 */
function moveFile(sourcePath, destPath) {
    try {
        var sourceFile = new File(sourcePath);
        if (sourceFile.exists) {
            return sourceFile.rename(destPath);
        }
    } catch (e) {
        $.writeln("Error moving file: " + e);
    }
    return false;
}

/**
 * Create a folder if it doesn't exist
 * @param {string} folderPath - Folder path to create
 * @return {boolean} Success status
 */
function createFolder(folderPath) {
    try {
        var folder = new Folder(folderPath);
        if (!folder.exists) {
            return folder.create();
        }
        return true;
    } catch (e) {
        $.writeln("Error creating folder: " + e);
    }
    return false;
}
/**
 * Open a document in Illustrator
 * @param {string} filePath - Full path to the .ai file
 * @return {string} "success" on success, error message on failure
 */
function openDocument(filePath) {
    try {
        var file = new File(filePath);
        
        if (!file.exists) {
            return "ERROR: File does not exist: " + filePath;
        }
        
        // Check if it's an Illustrator file
        if (!file.name.match(/\.ai$/i)) {
            return "ERROR: Not an Illustrator file";
        }
        
        // Open the document
        var doc = app.open(file);
        
        if (doc != null) {
            return "success";
        } else {
            return "ERROR: Could not open document";
        }
    } catch (e) {
        return "ERROR: " + e.toString();
    }
}

// ==================== DOCUMENT INFO ====================

/**
 * Get document metadata
 * @return {string} JSON string with document info
 */
function getDocumentInfo() {
    try {
        if (app.documents.length > 0) {
            var doc = app.activeDocument;
            var info = {
                name: doc.name,
                path: doc.fullName.fsName,
                width: doc.width,
                height: doc.height,
                colorMode: doc.documentColorSpace.toString(),
                layers: doc.layers.length,
                artboards: doc.artboards.length
            };
            return JSON.stringify(info);
        }
    } catch (e) {
        $.writeln("Error getting document info: " + e);
    }
    return "null";
}

/**
 * Parse filename for mushaf format: {page}-{riwayah}.ai
 * @param {string} filename - Filename to parse
 * @return {string} JSON string with page and riwayah or "null"
 */
function parseMushafFilename(filename) {
    try {
        // Remove extension
        var nameWithoutExt = filename.replace(/\.ai$/i, '');
        
        // Match pattern: number followed by dash followed by text
        var match = nameWithoutExt.match(/^(\d+)-(.+)$/);
        
        if (match) {
            var result = {
                page: match[1],
                riwayah: match[2]
            };
            return JSON.stringify(result);
        }
    } catch (e) {
        $.writeln("Error parsing filename: " + e);
    }
    return "null";
}

// ==================== LAYER OPERATIONS ====================

/**
 * Get all layer names in the document
 * @return {string} JSON array of layer names
 */
function getLayerNames() {
    try {
        if (app.documents.length > 0) {
            var doc = app.activeDocument;
            var layers = [];
            for (var i = 0; i < doc.layers.length; i++) {
                layers.push(doc.layers[i].name);
            }
            return JSON.stringify(layers);
        }
    } catch (e) {
        $.writeln("Error getting layers: " + e);
    }
    return "[]";
}

/**
 * Show/hide a layer
 * @param {string} layerName - Name of layer
 * @param {boolean} visible - Visibility state
 * @return {boolean} Success status
 */
function setLayerVisibility(layerName, visible) {
    try {
        if (app.documents.length > 0) {
            var doc = app.activeDocument;
            var layer = doc.layers.getByName(layerName);
            if (layer) {
                layer.visible = visible;
                return true;
            }
        }
    } catch (e) {
        $.writeln("Error setting layer visibility: " + e);
    }
    return false;
}

// ==================== EXPORT FUNCTIONS ====================

/**
 * Export document as PDF
 * @param {string} outputPath - Output file path
 * @return {boolean} Success status
 */
function exportAsPDF(outputPath) {
    try {
        if (app.documents.length > 0) {
            var doc = app.activeDocument;
            var file = new File(outputPath);
            
            var pdfOptions = new PDFSaveOptions();
            pdfOptions.compatibility = PDFCompatibility.ACROBAT5;
            pdfOptions.generateThumbnails = true;
            pdfOptions.preserveEditability = false;
            
            doc.saveAs(file, pdfOptions);
            return true;
        }
    } catch (e) {
        $.writeln("Error exporting PDF: " + e);
    }
    return false;
}

/**
 * Export document as PNG
 * @param {string} outputPath - Output file path
 * @param {number} scale - Scale factor (default: 1)
 * @return {boolean} Success status
 */
function exportAsPNG(outputPath, scale) {
    if (scale === undefined) scale = 1;
    
    try {
        if (app.documents.length > 0) {
            var doc = app.activeDocument;
            var file = new File(outputPath);
            
            var pngOptions = new ExportOptionsPNG24();
            pngOptions.antiAliasing = true;
            pngOptions.transparency = true;
            pngOptions.artBoardClipping = true;
            pngOptions.horizontalScale = scale * 100;
            pngOptions.verticalScale = scale * 100;
            pngOptions.resolution = 360;
            
            doc.exportFile(file, ExportType.PNG24, pngOptions);
            return true;
        }
    } catch (e) {
        $.writeln("Error exporting PNG: " + e);
    }
    return false;
}

// ==================== APPLICATION INFO ====================

/**
 * Get Illustrator version info
 * @return {string} JSON with version information
 */
function getIllustratorInfo() {
    try {
        var info = {
            version: app.version,
            build: app.buildNumber,
            locale: app.locale,
            scriptingVersion: app.scriptingVersion
        };
        return JSON.stringify(info);
    } catch (e) {
        $.writeln("Error getting Illustrator info: " + e);
    }
    return "null";
}

/**
 * Check if a document is currently open
 * @return {boolean} Document is open
 */
function isDocumentOpen() {
    return app.documents.length > 0;
}

// ==================== EVENT LISTENERS ====================

/**
 * Add event listener for document open/close
 * Note: This requires persistent scripting context
 */
function setupDocumentListeners() {
    // This is a placeholder - actual event listening
    // would require persistent scripting which has limitations in CEP
    $.writeln("Document listeners setup (placeholder)");
}

// ==================== FOLDER DIALOG ====================

/**
 * Show folder selection dialog
 * @return {string} Selected folder path or "null" if cancelled
 */
function selectFolderDialog() {
    try {
        var folder = Folder.selectDialog("Select Mushaf Tasks Folder");
        if (folder != null) {
            return folder.fsName;
        }
        return "null";
    } catch (e) {
        return "ERROR:" + e.toString();
    }
}

// Log that script loaded
$.writeln("Mushaf Task Manager ExtendScript loaded successfully");
