class ConfigurationSystem {
    constructor() {
        this.config = {
            stationTitle: '',
            skus: {}
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

        // Station title update
        document.getElementById('stationTitle').addEventListener('input', (e) => {
            this.config.stationTitle = e.target.value;
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
        if (confirm(`Are you sure you want to delete SKU "${sku}"?`)) {
            delete this.config.skus[sku];
            if (this.selectedConfigSku === sku) {
                this.selectedConfigSku = '';
                document.getElementById('barcodeConfig').style.display = 'none';
            }
            this.renderSkuList();
            this.showStatus('SKU deleted successfully', 'success');
        }
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
        if (confirm('Are you sure you want to delete this barcode configuration?')) {
            this.config.skus[this.selectedConfigSku].barcodes.splice(index, 1);
            this.renderBarcodeList();
            this.renderSkuList(); // Update barcode count
            this.showStatus('Barcode configuration deleted successfully', 'success');
        }
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

    showStatus(message, type) {
        const statusDiv = document.getElementById('statusMessage');
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${type}`;
        statusDiv.style.display = 'block';
        
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}

// Initialize the configuration system when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.configSystem = new ConfigurationSystem();
});