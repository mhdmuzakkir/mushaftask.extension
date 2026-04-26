/**
 * Mushaf Task Manager - Illustrator Module
 * Adobe Illustrator / CEP bridge functions
 */
(function(window) {
    'use strict';

    var CSInterface;
    try {
        if (typeof window !== 'undefined' && typeof window.CSInterface !== 'undefined') {
            CSInterface = window.CSInterface;
        } else if (typeof window !== 'undefined' && window.cep && window.cep.CSInterface) {
            CSInterface = window.cep.CSInterface;
        }
    } catch (e) {
        console.log('CSInterface not available');
    }

    function browseFolder(callback) {
        try {
            if (typeof CSInterface !== 'undefined' && CSInterface) {
                var csInterface = new CSInterface();
                csInterface.evalScript('selectFolderDialog()', function(result) {
                    console.log('browseFolder result:', result);
                    if (result && result !== "null" && !result.startsWith("ERROR")) {
                        callback(result);
                    } else if (result && result.startsWith("ERROR")) {
                        console.error('ExtendScript error:', result);
                    }
                });
                return;
            }
        } catch (e) {
            console.error('browseFolder CSInterface error:', e);
        }
        
        // Fallback for non-CEP contexts
        var pathInput = prompt('Enter folder path:');
        if (pathInput) callback(pathInput);
    }

    function getActiveDocumentInfo() {
        return new Promise(function(resolve) {
            if (typeof CSInterface === 'undefined') {
                resolve(null);
                return;
            }
            
            var csInterface = new CSInterface();
            
            var timeout = setTimeout(function() {
                console.log('getActiveDocumentName timeout');
                resolve(null);
            }, 1000);
            
            csInterface.evalScript('getActiveDocumentName()', function(result) {
                clearTimeout(timeout);
                
                console.log('Raw result from Illustrator:', result);
                
                if (!result || result === 'null' || result === 'undefined' || result === 'Error') {
                    resolve(null);
                } else {
                    var info = null;
                    if (window.MushafUtils && window.MushafUtils.detectRiwayahFromFilename) {
                        info = window.MushafUtils.detectRiwayahFromFilename(result);
                    } else {
                        var match = result.match(/^(\d+)-(.+)\.ai$/i);
                        if (match) {
                            info = {
                                page: parseInt(match[1], 10),
                                riwayah: match[2].trim()
                            };
                        }
                    }
                    resolve(info);
                }
            });
        });
    }

    window.browseFolder = browseFolder;
    window.getActiveDocumentInfo = getActiveDocumentInfo;

    window.MushafAI = {
        browseFolder: browseFolder,
        getActiveDocumentInfo: getActiveDocumentInfo
    };

})(window);
