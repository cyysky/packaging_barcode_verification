class BarcodeVerificationSystem {
    constructor() {
        this.config = {
            stationTitle: '',
            skus: {}
        };
        this.currentMode = 'config';
        this.currentSku = '';
        this.currentScanIndex = 0;
        this.scanResults = [];
        this.selectedConfigSku = '';
        
        this.initializeEventListeners();
        this.loadConfiguration();
    }

    initializeEventListeners() {
        // Mode switching
        document.getElementById('configModeBtn').addEventListener('click', () => this.switchMode('config'));
        document.getElementById('productionModeBtn').addEventListener('click', () => this.switchMode('production'));

        // Configuration mode events
        document.getElementById('addSkuBtn').addEventListener('click', () => this.addSku());
        document.getElementById('newSku').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addSku();
        });
        document.getElementById('addBarcodeBtn').addEventListener('click', () => this.addBarcode());
        document.getElementById('saveConfigBtn').addEventListener('click', () => this.saveConfiguration());
        document.getElementById('loadConfigBtn').addEventListener('click', () => this.loadConfiguration());

        // Production mode events
        document.getElementById('productionSku').addEventListener('change', (e) => this.selectProductionSku(e.target.value));
        document.getElementById('barcodeInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.processScan();
        });
        document.getElementById('submitScanBtn').addEventListener('click', () => this.processScan());
        document.getElementById('restartScanBtn').addEventListener('click', () => this.restartScan());

        // Station title update
        document.getElementById('stationTitle').addEventListener('input', (e) => {
            this.config.stationTitle = e.target.value;
            this.updateStationTitleDisplay();
        });
    }

    switchMode(mode) {
        this.currentMode = mode;
        
        // Update button states
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.mode-section').forEach(section => section.classList.remove('active'));
        
        if (mode === 'config') {
            document.getElementById('configModeBtn').classList.add('active');
            document.getElementById('configMode').classList.add('active');
        } else {
            document.getElementById('productionModeBtn').classList.add('active');
            document.getElementById('productionMode').classList.add('active');
            this.updateProductionSkuList();
        }
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
                    <button onclick="barcodeSystem.selectSkuForConfig('${sku}')">Configure</button>
                    <button class="delete-btn" onclick="barcodeSystem.deleteSku('${sku}')">Delete</button>
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
                    <button class="delete-btn" onclick="barcodeSystem.deleteBarcode(${index})">Delete</button>
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

    saveConfiguration() {
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

    loadConfiguration() {
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
                    
                    // Update UI
                    document.getElementById('stationTitle').value = this.config.stationTitle || '';
                    this.updateStationTitleDisplay();
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

    updateStationTitleDisplay() {
        const title = this.config.stationTitle || 'Production Station';
        document.getElementById('stationTitleDisplay').textContent = title;
    }

    // Production Mode Methods
    updateProductionSkuList() {
        const select = document.getElementById('productionSku');
        select.innerHTML = '<option value="">-- Select SKU --</option>';
        
        Object.keys(this.config.skus).forEach(sku => {
            if (this.config.skus[sku].barcodes.length > 0) {
                const option = document.createElement('option');
                option.value = sku;
                option.textContent = sku;
                select.appendChild(option);
            }
        });
    }

    selectProductionSku(sku) {
        this.currentSku = sku;
        
        if (sku) {
            document.getElementById('scanningInterface').style.display = 'block';
            this.restartScan();
        } else {
            document.getElementById('scanningInterface').style.display = 'none';
        }
    }

    restartScan() {
        this.currentScanIndex = 0;
        this.scanResults = [];
        document.getElementById('barcodeInput').value = '';
        document.getElementById('scanResults').innerHTML = '';
        this.updateScanProgress();
        this.focusInput();
    }

    updateScanProgress() {
        const progressDisplay = document.getElementById('progressDisplay');
        const currentScanLabel = document.getElementById('currentScanLabel');
        
        if (!this.currentSku || !this.config.skus[this.currentSku]) {
            progressDisplay.innerHTML = '';
            currentScanLabel.textContent = 'Please select a SKU first';
            return;
        }
        
        const barcodes = this.config.skus[this.currentSku].barcodes;
        progressDisplay.innerHTML = '';
        
        barcodes.forEach((barcode, index) => {
            const progressItem = document.createElement('div');
            progressItem.className = 'progress-item';
            
            if (index < this.currentScanIndex) {
                progressItem.classList.add('completed');
                progressItem.innerHTML = `
                    <span>${index + 1}. ${barcode.name}</span>
                    <span>✓ ${this.scanResults[index]}</span>
                `;
            } else if (index === this.currentScanIndex) {
                progressItem.classList.add('current');
                progressItem.innerHTML = `
                    <span>${index + 1}. ${barcode.name}</span>
                    <span>Scanning...</span>
                `;
                currentScanLabel.textContent = `Scan: ${barcode.name}`;
            } else {
                progressItem.classList.add('pending');
                progressItem.innerHTML = `
                    <span>${index + 1}. ${barcode.name}</span>
                    <span>Pending</span>
                `;
            }
            
            progressDisplay.appendChild(progressItem);
        });
        
        if (this.currentScanIndex >= barcodes.length) {
            currentScanLabel.textContent = 'All barcodes scanned successfully!';
        }
    }

    processScan() {
        const input = document.getElementById('barcodeInput');
        const scannedValue = input.value.trim();
        
        if (!scannedValue) {
            this.showStatus('Please scan a barcode', 'error');
            return;
        }
        
        if (!this.currentSku || !this.config.skus[this.currentSku]) {
            this.showStatus('Please select a SKU first', 'error');
            return;
        }
        
        const barcodes = this.config.skus[this.currentSku].barcodes;
        
        if (this.currentScanIndex >= barcodes.length) {
            this.showStatus('All barcodes already scanned. Click Restart to begin again.', 'info');
            return;
        }
        
        const currentBarcode = barcodes[this.currentScanIndex];
        const regex = new RegExp(currentBarcode.regex);
        
        if (regex.test(scannedValue)) {
            // Valid scan
            this.scanResults.push(scannedValue);
            this.currentScanIndex++;
            
            this.showScanResult(`✓ Valid ${currentBarcode.name}: ${scannedValue}`, 'success');
            
            if (this.currentScanIndex >= barcodes.length) {
                // All scans complete
                this.showScanResult('🎉 PASS - All barcodes verified successfully!', 'pass');
                this.saveScanToCSV();
            }
            
            this.updateScanProgress();
        } else {
            // Invalid scan
            this.showScanResult(`✗ Invalid ${currentBarcode.name}: ${scannedValue}`, 'error');
        }
        
        input.value = '';
        this.focusInput();
    }

    showScanResult(message, type) {
        const resultsDiv = document.getElementById('scanResults');
        const resultMessage = document.createElement('div');
        resultMessage.className = `result-message ${type}`;
        resultMessage.textContent = message;
        
        resultsDiv.appendChild(resultMessage);
        resultsDiv.scrollTop = resultsDiv.scrollHeight;
    }

    saveScanToCSV() {
        const now = new Date();
        const dateStr = now.getFullYear() + '_' + 
                       String(now.getMonth() + 1).padStart(2, '0') + '_' + 
                       String(now.getDate()).padStart(2, '0');
        
        const timeStr = String(now.getHours()).padStart(2, '0') + ':' + 
                       String(now.getMinutes()).padStart(2, '0') + ':' + 
                       String(now.getSeconds()).padStart(2, '0');
        
        const csvData = [
            this.currentSku,
            dateStr,
            timeStr,
            ...this.scanResults
        ].join(',');
        
        const filename = `${this.currentSku}_${dateStr}.csv`;
        
        // Check if file exists in localStorage (simulating file system)
        let existingData = localStorage.getItem(filename) || '';
        
        // Add header if file is new
        if (!existingData) {
            const barcodes = this.config.skus[this.currentSku].barcodes;
            const header = ['SKU', 'Date', 'Time', ...barcodes.map(b => b.name)].join(',');
            existingData = header + '\n';
        }
        
        existingData += csvData + '\n';
        localStorage.setItem(filename, existingData);
        
        // Also trigger download
        const blob = new Blob([existingData], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showStatus(`Scan data saved to ${filename}`, 'success');
    }

    focusInput() {
        setTimeout(() => {
            document.getElementById('barcodeInput').focus();
        }, 100);
    }

    showStatus(message, type) {
        const statusDiv = document.getElementById('statusMessage');
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${type} show`;
        
        setTimeout(() => {
            statusDiv.classList.remove('show');
        }, 3000);
    }
}

// Initialize the system
const barcodeSystem = new BarcodeVerificationSystem();