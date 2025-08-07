class ProductionSystem {
    constructor() {
        this.config = {
            stationTitle: '',
            skus: {},
            autoRestartSeconds: 0
        };
        this.currentSku = '';
        this.currentScanIndex = 0;
        this.scanResults = [];
        this.isElectron = typeof require !== 'undefined';
        this.autoRestartTimer = null;
        
        this.initializeEventListeners();
        this.loadConfiguration();
    }

    initializeEventListeners() {
        // Production mode events
        document.getElementById('productionSku').addEventListener('change', (e) => this.selectProductionSku(e.target.value));
        document.getElementById('barcodeInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.processScan();
        });
        document.getElementById('submitScanBtn').addEventListener('click', () => this.processScan());
        document.getElementById('restartScanBtn').addEventListener('click', () => this.restartScan());
    }

    async loadConfiguration() {
        if (this.isElectron) {
            try {
                const { ipcRenderer } = require('electron');
                const result = await ipcRenderer.invoke('load-config');
                
                if (result.success) {
                    this.config = result.data;
                    this.updateStationTitleDisplay();
                    this.updateProductionSkuList();
                    this.showStatus(`Configuration loaded successfully (${result.source})`, 'success');
                } else {
                    this.showStatus(`Error loading configuration: ${result.error}`, 'error');
                }
            } catch (error) {
                this.showStatus(`Error loading configuration: ${error.message}`, 'error');
            }
        } else {
            // Fallback for web browser - try to load from localStorage
            const savedConfig = localStorage.getItem('barcodeVerificationConfig');
            if (savedConfig) {
                try {
                    this.config = JSON.parse(savedConfig);
                    this.updateStationTitleDisplay();
                    this.updateProductionSkuList();
                    this.showStatus('Configuration loaded from browser storage', 'success');
                } catch (error) {
                    this.showStatus('Error loading configuration from browser storage', 'error');
                }
            } else {
                this.showStatus('No configuration found. Please configure the system first.', 'warning');
            }
        }
    }

    updateStationTitleDisplay() {
        const title = this.config.stationTitle || 'Production Station';
        document.getElementById('stationTitleDisplay').textContent = title;
    }

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
        // Clear any existing auto-restart timer
        if (this.autoRestartTimer) {
            clearTimeout(this.autoRestartTimer);
            this.autoRestartTimer = null;
        }
        
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
                this.scheduleAutoRestart();
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
        
        // Always show only the latest message: clear previous results
        resultsDiv.innerHTML = '';
        
        const resultMessage = document.createElement('div');
        resultMessage.className = `result-message ${type}`;
        resultMessage.textContent = message;
        
        resultsDiv.appendChild(resultMessage);
        resultsDiv.scrollTop = resultsDiv.scrollHeight;

        // Add a brief attention-grabbing animation for failures
        // Applies to type === 'error' only
        if (type === 'error') {
            // Use an animation class (defined in CSS) and remove it after animation ends
            resultMessage.classList.remove('shake-error');
            // Force reflow to restart animation if applied consecutively
            // eslint-disable-next-line no-unused-expressions
            resultMessage.offsetWidth;
            resultMessage.classList.add('shake-error');
            resultMessage.addEventListener('animationend', () => {
                resultMessage.classList.remove('shake-error');
            }, { once: true });
        }
    }

    async saveScanToCSV() {
        const now = new Date();
        const dateStr = now.getFullYear() + '_' +
                       String(now.getMonth() + 1).padStart(2, '0') + '_' +
                       String(now.getDate()).padStart(2, '0');
        
        const timeStr = String(now.getHours()).padStart(2, '0') + ':' +
                       String(now.getMinutes()).padStart(2, '0') + ':' +
                       String(now.getSeconds()).padStart(2, '0');
        
        const csvRow = [
            this.currentSku,
            dateStr,
            timeStr,
            ...this.scanResults
        ].join(',');
        
        const filename = `records/${this.currentSku}_${dateStr}.csv`;
        
        if (this.isElectron) {
            try {
                const { ipcRenderer } = require('electron');
                
                // Create header if this is a new file
                const barcodes = this.config.skus[this.currentSku].barcodes;
                const header = ['SKU', 'Date', 'Time', ...barcodes.map(b => b.name)].join(',');
                
                // Check if file exists in exe directory
                const fileExistsResult = await ipcRenderer.invoke('file-exists', filename);
                
                let csvData = '';
                if (!fileExistsResult.success || !fileExistsResult.exists) {
                    // New file, add header and row
                    csvData = header + '\n' + csvRow + '\n';
                } else {
                    // File exists, just add the new row with newline
                    csvData = csvRow + '\n';
                }
                
                const result = await ipcRenderer.invoke('save-csv', filename, csvData);
                
                if (result.success) {
                    this.showStatus(`Scan data saved to ${filename}`, 'success');
                } else {
                    this.showStatus(`Error saving CSV: ${result.error}`, 'error');
                }
            } catch (error) {
                this.showStatus(`Error saving CSV: ${error.message}`, 'error');
            }
        } else {
            // Fallback for web browser
            let existingData = localStorage.getItem(filename) || '';
            
            // Add header if file is new
            if (!existingData) {
                const barcodes = this.config.skus[this.currentSku].barcodes;
                const header = ['SKU', 'Date', 'Time', ...barcodes.map(b => b.name)].join(',');
                existingData = header + '\n';
            }
            
            existingData += csvRow + '\n';
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
    }

    scheduleAutoRestart() {
        // Clear any existing timer first
        if (this.autoRestartTimer) {
            clearTimeout(this.autoRestartTimer);
            this.autoRestartTimer = null;
        }
        
        const autoRestartSeconds = this.config.autoRestartSeconds || 0;
        
        if (autoRestartSeconds > 0) {
            //this.showScanResult(`⏱️ Auto-restart in ${autoRestartSeconds} seconds...`, 'info');
            
            this.autoRestartTimer = setTimeout(() => {
                this.showScanResult('🔄 Auto-restarting scan...', 'info');
                this.restartScan();
            }, autoRestartSeconds * 1000);
        }
    }

    focusInput() {
        setTimeout(() => {
            const input = document.getElementById('barcodeInput');
            if (input) {
                input.focus();
            }
        }, 100);
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

// Initialize the production system when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.productionSystem = new ProductionSystem();
});