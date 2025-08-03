class ConfigurationSystem {
    constructor() {
        this.config = {
            stationTitle: '',
            skus: {},
            autoRestartSeconds: 0
        };
        this.selectedConfigSku = '';
        this.isElectron = typeof require !== 'undefined';
        
        this.initializeEventListeners();
        this.loadConfiguration();
    }

    initializeEventListeners() {
        // Configuration mode events
        document.getElementById('addSkuBtn').addEventListener('click', () => this.addSku());
        document.getElementById('newSku').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addSku();
        });
        document.getElementById('addBarcodeBtn').addEventListener('click', () => this.addBarcode());
        document.getElementById('saveConfigBtn').addEventListener('click', () => this.saveConfiguration());
        document.getElementById('loadConfigBtn').addEventListener('click', () => this.loadConfiguration());
        document.getElementById('uploadConfigBtn').addEventListener('click', () => this.uploadConfiguration());
        document.getElementById('downloadConfigBtn').addEventListener('click', () => this.downloadConfiguration());

        // Station title update
        document.getElementById('stationTitle').addEventListener('input', (e) => {
            this.config.stationTitle = e.target.value;
        });
        
        // Auto-restart seconds update
        document.getElementById('autoRestartSeconds').addEventListener('input', (e) => {
            this.config.autoRestartSeconds = parseInt(e.target.value) || 0;
        });
    }

    // Configuration Mode Methods
    addSku() {
        const skuInput = document.getElementById('newSku');
        const sku = skuInput.value.trim().toUpperCase();
        
        if (!sku) {
            this.showStatus('Please enter a SKU code', 'error');
            return;
        }
        
        if (this.config.skus[sku]) {
            this.showStatus('SKU already exists', 'error');
            return;
        }
        
        this.config.skus[sku] = {
            barcodes: []
        };
        
        skuInput.value = '';
        this.renderSkuList();
        this.showStatus('SKU added successfully', 'success');
    }

    renderSkuList() {
        const skuList = document.getElementById('skuList');
        skuList.innerHTML = '';
        
        Object.keys(this.config.skus).forEach(sku => {
            const skuItem = document.createElement('div');
            skuItem.className = 'sku-item';
            if (sku === this.selectedConfigSku) {
                skuItem.classList.add('selected');
            }
            
            skuItem.innerHTML = `
                <span>${sku} (${this.config.skus[sku].barcodes.length} barcodes)</span>
                <div class="item-actions">
                    <button onclick="configSystem.selectSkuForConfig('${sku}')">Configure</button>
                    <button class="delete-btn" onclick="configSystem.deleteSku('${sku}')">Delete</button>
                </div>
            `;
            
            skuList.appendChild(skuItem);
        });
    }

    selectSkuForConfig(sku) {
        this.selectedConfigSku = sku;
        document.getElementById('selectedSkuTitle').textContent = sku;
        document.getElementById('barcodeConfig').style.display = 'block';
        this.renderBarcodeList();
        this.renderSkuList(); // Re-render to show selection
    }

    deleteSku(sku) {
        this.showCustomConfirm(
            `Are you sure you want to delete SKU "${sku}"?`,
            () => {
                delete this.config.skus[sku];
                if (this.selectedConfigSku === sku) {
                    this.selectedConfigSku = '';
                    document.getElementById('barcodeConfig').style.display = 'none';
                }
                this.renderSkuList();
                this.showStatus('SKU deleted successfully', 'success');
                // Restore focus to the new SKU input after deletion
                setTimeout(() => {
                    document.getElementById('newSku').focus();
                }, 100);
            }
        );
    }

    addBarcode() {
        if (!this.selectedConfigSku) {
            this.showStatus('Please select a SKU first', 'error');
            return;
        }
        
        const nameInput = document.getElementById('barcodeName');
        const regexInput = document.getElementById('barcodeRegex');
        
        const name = nameInput.value.trim();
        const regex = regexInput.value.trim();
        
        if (!name || !regex) {
            this.showStatus('Please enter both barcode name and regex pattern', 'error');
            return;
        }
        
        // Test if regex is valid
        try {
            new RegExp(regex);
        } catch (e) {
            this.showStatus('Invalid regex pattern', 'error');
            return;
        }
        
        this.config.skus[this.selectedConfigSku].barcodes.push({
            name: name,
            regex: regex
        });
        
        nameInput.value = '';
        regexInput.value = '';
        this.renderBarcodeList();
        this.renderSkuList(); // Update barcode count
        this.showStatus('Barcode configuration added successfully', 'success');
    }

    renderBarcodeList() {
        const barcodeList = document.getElementById('barcodeList');
        barcodeList.innerHTML = '';
        
        if (!this.selectedConfigSku) return;
        
        const barcodes = this.config.skus[this.selectedConfigSku].barcodes;
        
        barcodes.forEach((barcode, index) => {
            const barcodeItem = document.createElement('div');
            barcodeItem.className = 'barcode-item';
            
            barcodeItem.innerHTML = `
                <div class="barcode-info">
                    <div class="barcode-name">${index + 1}. ${barcode.name}</div>
                    <div class="barcode-regex">Pattern: ${barcode.regex}</div>
                </div>
                <div class="item-actions">
                    <button class="delete-btn" onclick="configSystem.deleteBarcode(${index})">Delete</button>
                </div>
            `;
            
            barcodeList.appendChild(barcodeItem);
        });
    }

    deleteBarcode(index) {
        this.showCustomConfirm(
            'Are you sure you want to delete this barcode configuration?',
            () => {
                this.config.skus[this.selectedConfigSku].barcodes.splice(index, 1);
                this.renderBarcodeList();
                this.renderSkuList(); // Update barcode count
                this.showStatus('Barcode configuration deleted successfully', 'success');
                // Restore focus to the barcode name input after deletion
                setTimeout(() => {
                    document.getElementById('barcodeName').focus();
                }, 100);
            }
        );
    }

    async saveConfiguration() {
        if (this.isElectron) {
            try {
                const { ipcRenderer } = require('electron');
                const result = await ipcRenderer.invoke('save-config', this.config);
                
                if (result.success) {
                    this.showStatus('Configuration saved successfully', 'success');
                } else {
                    this.showStatus(`Error saving configuration: ${result.error}`, 'error');
                }
            } catch (error) {
                this.showStatus(`Error saving configuration: ${error.message}`, 'error');
            }
        } else {
            // Fallback for web browser
            localStorage.setItem('barcodeVerificationConfig', JSON.stringify(this.config));
            
            const configData = JSON.stringify(this.config, null, 2);
            const blob = new Blob([configData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'barcode_verification_config.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showStatus('Configuration saved successfully', 'success');
        }
    }

    async loadConfiguration() {
        if (this.isElectron) {
            try {
                const { ipcRenderer } = require('electron');
                const result = await ipcRenderer.invoke('load-config');
                
                if (result.success) {
                    this.config = result.data;
                    
                    // Update UI
                    document.getElementById('stationTitle').value = this.config.stationTitle || '';
                    document.getElementById('autoRestartSeconds').value = this.config.autoRestartSeconds || 0;
                    this.renderSkuList();
                    this.selectedConfigSku = '';
                    document.getElementById('barcodeConfig').style.display = 'none';
                    
                    this.showStatus(`Configuration loaded successfully (${result.source})`, 'success');
                } else {
                    this.showStatus(`Error loading configuration: ${result.error}`, 'error');
                }
            } catch (error) {
                this.showStatus(`Error loading configuration: ${error.message}`, 'error');
            }
        } else {
            // Fallback for web browser
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const config = JSON.parse(e.target.result);
                        this.config = config;
                        
                        // Save to localStorage for production page
                        localStorage.setItem('barcodeVerificationConfig', JSON.stringify(this.config));
                        
                        // Update UI
                        document.getElementById('stationTitle').value = this.config.stationTitle || '';
                        document.getElementById('autoRestartSeconds').value = this.config.autoRestartSeconds || 0;
                        this.renderSkuList();
                        this.selectedConfigSku = '';
                        document.getElementById('barcodeConfig').style.display = 'none';
                        
                        this.showStatus('Configuration loaded successfully', 'success');
                    } catch (error) {
                        this.showStatus('Invalid configuration file', 'error');
                    }
                };
                reader.readAsText(file);
            };
            
            input.click();
        }
    }

    async uploadConfiguration() {
        if (this.isElectron) {
            try {
                const { ipcRenderer } = require('electron');
                const result = await ipcRenderer.invoke('upload-config');
                
                if (result.success) {
                    this.config = result.data;
                    
                    // Update UI
                    document.getElementById('stationTitle').value = this.config.stationTitle || '';
                    document.getElementById('autoRestartSeconds').value = this.config.autoRestartSeconds || 0;
                    this.renderSkuList();
                    this.selectedConfigSku = '';
                    document.getElementById('barcodeConfig').style.display = 'none';
                    
                    this.showStatus(`Configuration uploaded successfully from: ${result.source}`, 'success');
                } else if (result.canceled) {
                    this.showStatus('Upload canceled', 'info');
                } else {
                    this.showStatus(`Error uploading configuration: ${result.error}`, 'error');
                }
            } catch (error) {
                this.showStatus(`Error uploading configuration: ${error.message}`, 'error');
            }
        } else {
            // Fallback for web browser - same as loadConfiguration
            this.loadConfiguration();
        }
    }

    async downloadConfiguration() {
        if (this.isElectron) {
            try {
                const { ipcRenderer } = require('electron');
                const result = await ipcRenderer.invoke('download-config', this.config);
                
                if (result.success) {
                    this.showStatus(`Configuration downloaded successfully to: ${result.path}`, 'success');
                } else if (result.canceled) {
                    this.showStatus('Download canceled', 'info');
                } else {
                    this.showStatus(`Error downloading configuration: ${result.error}`, 'error');
                }
            } catch (error) {
                this.showStatus(`Error downloading configuration: ${error.message}`, 'error');
            }
        } else {
            // Fallback for web browser - same as saveConfiguration download
            const configData = JSON.stringify(this.config, null, 2);
            const blob = new Blob([configData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'barcode_verification_config.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showStatus('Configuration downloaded successfully', 'success');
        }
    }

    showStatus(message, type) {
        const statusDiv = document.getElementById('statusMessage');
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${type}`;
        statusDiv.style.display = 'block';
        
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }

    showCustomConfirm(message, onConfirm) {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;

        // Create modal dialog
        const modal = document.createElement('div');
        modal.className = 'modal-dialog';
        modal.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            max-width: 400px;
            width: 90%;
            text-align: center;
        `;

        // Create message
        const messageEl = document.createElement('p');
        messageEl.textContent = message;
        messageEl.style.cssText = `
            margin: 0 0 20px 0;
            font-size: 16px;
            color: #333;
        `;

        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 10px;
            justify-content: center;
        `;

        // Create confirm button
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Yes, Delete';
        confirmBtn.className = 'delete-btn';
        confirmBtn.style.cssText = `
            padding: 8px 16px;
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;

        // Create cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = `
            padding: 8px 16px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;

        // Add event listeners
        confirmBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            onConfirm();
        });

        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            // Restore focus to the appropriate input field
            setTimeout(() => {
                const newSkuInput = document.getElementById('newSku');
                if (newSkuInput) {
                    newSkuInput.focus();
                }
            }, 100);
        });

        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', handleEscape);
                // Restore focus to the appropriate input field
                setTimeout(() => {
                    const newSkuInput = document.getElementById('newSku');
                    if (newSkuInput) {
                        newSkuInput.focus();
                    }
                }, 100);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Assemble modal
        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(confirmBtn);
        modal.appendChild(messageEl);
        modal.appendChild(buttonContainer);
        overlay.appendChild(modal);

        // Add to DOM and focus
        document.body.appendChild(overlay);
        cancelBtn.focus();
    }
}

// Initialize the configuration system when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.configSystem = new ConfigurationSystem();
});