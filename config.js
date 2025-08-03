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
        
        const skuKeys = Object.keys(this.config.skus);
        
        skuKeys.forEach((sku, index) => {
            const skuItem = document.createElement('div');
            skuItem.className = 'sku-item';
            skuItem.draggable = true;
            skuItem.dataset.sku = sku;
            skuItem.dataset.index = index;
            
            if (sku === this.selectedConfigSku) {
                skuItem.classList.add('selected');
            }
            
            skuItem.innerHTML = `
                <i class="fas fa-grip-vertical drag-handle"></i>
                <div class="sku-name">
                    <span class="editable-field" data-original-sku="${sku}" onclick="configSystem.editSkuName(this)">${sku}</span>
                    <i class="fas fa-edit edit-icon" onclick="configSystem.editSkuName(this.previousElementSibling)"></i>
                    <span class="barcode-count">(${this.config.skus[sku].barcodes.length} barcodes)</span>
                </div>
                <div class="item-actions">
                    <button onclick="configSystem.selectSkuForConfig('${sku}')">Configure</button>
                    <button class="delete-btn" onclick="configSystem.deleteSku('${sku}')">Delete</button>
                </div>
            `;
            
            // Add drag and drop event listeners for SKUs
            skuItem.addEventListener('dragstart', (e) => this.handleSkuDragStart(e));
            skuItem.addEventListener('dragover', (e) => this.handleSkuDragOver(e));
            skuItem.addEventListener('drop', (e) => this.handleSkuDrop(e));
            skuItem.addEventListener('dragend', (e) => this.handleSkuDragEnd(e));
            
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
            barcodeItem.draggable = true;
            barcodeItem.dataset.index = index;
            
            barcodeItem.innerHTML = `
                <i class="fas fa-grip-vertical drag-handle"></i>
                <div class="barcode-info">
                    <div class="barcode-name">
                        <span>${index + 1}. </span>
                        <span class="editable-field" data-field="name" data-index="${index}" onclick="configSystem.editBarcodeField(this)">${barcode.name}</span>
                        <i class="fas fa-edit edit-icon" onclick="configSystem.editBarcodeField(this.previousElementSibling)"></i>
                    </div>
                    <div class="barcode-regex">
                        <span>Pattern: </span>
                        <span class="editable-field" data-field="regex" data-index="${index}" onclick="configSystem.editBarcodeField(this)">${barcode.regex}</span>
                        <i class="fas fa-edit edit-icon" onclick="configSystem.editBarcodeField(this.previousElementSibling)"></i>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="delete-btn" onclick="configSystem.deleteBarcode(${index})">Delete</button>
                </div>
            `;
            
            // Add drag and drop event listeners
            barcodeItem.addEventListener('dragstart', (e) => this.handleDragStart(e));
            barcodeItem.addEventListener('dragover', (e) => this.handleDragOver(e));
            barcodeItem.addEventListener('drop', (e) => this.handleDrop(e));
            barcodeItem.addEventListener('dragend', (e) => this.handleDragEnd(e));
            
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

    // Inline editing methods
    editSkuName(element) {
        if (element.classList.contains('editing')) return;
        
        const originalSku = element.dataset.originalSku;
        const currentText = element.textContent;
        
        element.classList.add('editing');
        element.contentEditable = true;
        element.focus();
        
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        const finishEdit = () => {
            element.classList.remove('editing');
            element.contentEditable = false;
            
            const newSku = element.textContent.trim().toUpperCase();
            
            if (newSku === originalSku) return;
            
            if (!newSku) {
                element.textContent = originalSku;
                this.showStatus('SKU name cannot be empty', 'error');
                return;
            }
            
            if (this.config.skus[newSku]) {
                element.textContent = originalSku;
                this.showStatus('SKU already exists', 'error');
                return;
            }
            
            // Update the SKU in config
            this.config.skus[newSku] = this.config.skus[originalSku];
            delete this.config.skus[originalSku];
            
            // Update selected SKU if it was the one being edited
            if (this.selectedConfigSku === originalSku) {
                this.selectedConfigSku = newSku;
                document.getElementById('selectedSkuTitle').textContent = newSku;
            }
            
            element.dataset.originalSku = newSku;
            this.renderSkuList();
            this.showStatus('SKU name updated successfully', 'success');
        };
        
        element.addEventListener('blur', finishEdit, { once: true });
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                element.blur();
            } else if (e.key === 'Escape') {
                element.textContent = originalSku;
                element.blur();
            }
        }, { once: true });
    }
    
    editBarcodeField(element) {
        if (element.classList.contains('editing')) return;
        
        const field = element.dataset.field;
        const index = parseInt(element.dataset.index);
        const originalValue = element.textContent;
        
        element.classList.add('editing');
        element.contentEditable = true;
        element.focus();
        
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        const finishEdit = () => {
            element.classList.remove('editing');
            element.contentEditable = false;
            
            const newValue = element.textContent.trim();
            
            if (newValue === originalValue) return;
            
            if (!newValue) {
                element.textContent = originalValue;
                this.showStatus(`${field === 'name' ? 'Barcode name' : 'Pattern'} cannot be empty`, 'error');
                return;
            }
            
            // Validate regex if editing pattern
            if (field === 'regex') {
                try {
                    new RegExp(newValue);
                } catch (e) {
                    element.textContent = originalValue;
                    this.showStatus('Invalid regex pattern', 'error');
                    return;
                }
            }
            
            // Update the barcode in config
            this.config.skus[this.selectedConfigSku].barcodes[index][field] = newValue;
            this.showStatus(`Barcode ${field === 'name' ? 'name' : 'pattern'} updated successfully`, 'success');
        };
        
        element.addEventListener('blur', finishEdit, { once: true });
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                element.blur();
            } else if (e.key === 'Escape') {
                element.textContent = originalValue;
                element.blur();
            }
        }, { once: true });
    }
    
    // Drag and drop methods
    handleDragStart(e) {
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);
        e.dataTransfer.setData('text/plain', e.target.dataset.index);
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const draggingElement = document.querySelector('.dragging');
        const currentElement = e.target.closest('.barcode-item');
        
        if (currentElement && currentElement !== draggingElement) {
            currentElement.classList.add('drag-over');
        }
    }
    
    handleDrop(e) {
        e.preventDefault();
        
        const draggingElement = document.querySelector('.dragging');
        const currentElement = e.target.closest('.barcode-item');
        
        if (currentElement && currentElement !== draggingElement) {
            const draggedIndex = parseInt(draggingElement.dataset.index);
            const targetIndex = parseInt(currentElement.dataset.index);
            
            // Reorder the barcodes array
            const barcodes = this.config.skus[this.selectedConfigSku].barcodes;
            const draggedItem = barcodes.splice(draggedIndex, 1)[0];
            barcodes.splice(targetIndex, 0, draggedItem);
            
            this.renderBarcodeList();
            this.renderSkuList(); // Update barcode count
            this.showStatus('Barcode order updated successfully', 'success');
        }
        
        // Clean up drag over effects
        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
    }
    
    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
    }
    
    // SKU drag and drop methods
    handleSkuDragStart(e) {
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);
        e.dataTransfer.setData('text/plain', e.target.dataset.sku);
    }
    
    handleSkuDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const draggingElement = document.querySelector('.sku-item.dragging');
        const currentElement = e.target.closest('.sku-item');
        
        if (currentElement && currentElement !== draggingElement) {
            currentElement.classList.add('drag-over');
        }
    }
    
    handleSkuDrop(e) {
        e.preventDefault();
        
        const draggingElement = document.querySelector('.sku-item.dragging');
        const currentElement = e.target.closest('.sku-item');
        
        if (currentElement && currentElement !== draggingElement) {
            const draggedSku = draggingElement.dataset.sku;
            const targetSku = currentElement.dataset.sku;
            
            // Get current SKU order
            const skuKeys = Object.keys(this.config.skus);
            const draggedIndex = skuKeys.indexOf(draggedSku);
            const targetIndex = skuKeys.indexOf(targetSku);
            
            // Reorder SKUs by creating a new config object with reordered keys
            const newConfig = { ...this.config };
            newConfig.skus = {};
            
            // Remove dragged SKU from its current position
            skuKeys.splice(draggedIndex, 1);
            // Insert it at the target position
            skuKeys.splice(targetIndex, 0, draggedSku);
            
            // Rebuild the skus object in the new order
            skuKeys.forEach(sku => {
                newConfig.skus[sku] = this.config.skus[sku];
            });
            
            this.config = newConfig;
            this.renderSkuList();
            this.showStatus('SKU order updated successfully', 'success');
        }
        
        // Clean up drag over effects
        document.querySelectorAll('.sku-item.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
    }
    
    handleSkuDragEnd(e) {
        e.target.classList.remove('dragging');
        document.querySelectorAll('.sku-item.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
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