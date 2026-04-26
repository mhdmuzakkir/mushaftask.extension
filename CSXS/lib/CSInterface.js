// CSInterface.js - Adobe CEP CSInterface Library
// Minified version - full version available in CEP SDK

function CSInterface() {
    this.hostEnvironment = JSON.parse(window.__adobe_cep__.getHostEnvironment());
}

CSInterface.prototype.evalScript = function(script, callback) {
    if (callback === undefined) {
        callback = function(result) {};
    }
    window.__adobe_cep__.evalScript(script, callback);
};

CSInterface.prototype.getHostEnvironment = function() {
    return this.hostEnvironment;
};

CSInterface.prototype.closeExtension = function() {
    window.__adobe_cep__.closeExtension();
};

CSInterface.prototype.getSystemPath = function(pathType) {
    return window.__adobe_cep__.getSystemPath(pathType);
};

CSInterface.prototype.getExtensionID = function() {
    return window.__adobe_cep__.getExtensionId();
};

CSInterface.prototype.getScaleFactor = function() {
    return window.__adobe_cep__.getScaleFactor();
};

CSInterface.prototype.getCurrentApiVersion = function() {
    return JSON.parse(window.__adobe_cep__.getCurrentApiVersion());
};

CSInterface.prototype.isWindowVisible = function() {
    return window.__adobe_cep__.isWindowVisible();
};

CSInterface.prototype.requestOpenExtension = function(extensionId, params) {
    window.__adobe_cep__.requestOpenExtension(extensionId, params);
};

CSInterface.prototype.getExtensions = function(extensionIds) {
    var ids = JSON.stringify(extensionIds || []);
    return JSON.parse(window.__adobe_cep__.getExtensions(ids));
};

CSInterface.prototype.setWindowTitle = function(title) {
    window.__adobe_cep__.setWindowTitle(title);
};

CSInterface.prototype.getWindowTitle = function() {
    return window.__adobe_cep__.getWindowTitle();
};