# Barcode Verification System - Electron Desktop Application

A desktop application for packaging barcode verification with native file system access and portable executable generation.

## Features

- **Desktop Application**: Native Windows desktop app built with Electron
- **Widescreen Optimized**: Window size optimized for widescreen displays (1400x900 minimum)
- **Native File Operations**: Direct file system access for configuration and CSV files
- **Portable Executable**: Builds as a standalone portable .exe file
- **Configuration Management**: Save/load barcode verification configurations
- **CSV Export**: Automatic CSV export of scan results with persistent storage
- **Two Modes**: Configuration mode for setup and Production mode for scanning

## Installation & Setup

### Prerequisites
- Node.js (version 16 or higher)
- npm (comes with Node.js)

### Development Setup
1. Clone or download the project files
2. Open terminal in the project directory
3. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

#### Development Mode
```bash
npm start
```
or with developer tools:
```bash
npm run dev
```

#### Building Portable Executable
```bash
npm run build-portable
```

The portable executable will be created in the `dist` folder as:
`Barcode Verification System-1.0.0-portable.exe`

#### Other Build Options
```bash
# Build Windows installer
npm run build-win

# Build all targets
npm run build

# Package without building installer
npm run pack
```

## File Structure

```
barcode-verification-system/
├── main.js                           # Electron main process
├── index.html                        # Application UI
├── script.js                         # Application logic with Electron APIs
├── styles.css                        # Application styles
├── package.json                      # Project configuration
├── barcode_verification_config.json  # Default configuration
├── assets/                           # Application assets
└── dist/                            # Built executables
```

## Application Data Storage

The desktop application stores data in the following locations:

### Configuration Files
- **User Data**: `%APPDATA%/BarcodeVerification/barcode_verification_config.json`
- **Fallback**: Bundled configuration file in application directory

### CSV Export Files
- **Location**: `%APPDATA%/BarcodeVerification/csv_exports/`
- **Format**: `{SKU}_{YYYY_MM_DD}.csv`

## Key Features

### Native File System Integration
- Automatic configuration saving to user data directory
- CSV files saved with proper headers and appending
- File dialogs for import/export operations
- Persistent data storage between sessions

### Window Management
- Optimized for widescreen displays (1400x900 minimum)
- Window state management (maximize/restore)
- Proper focus handling
- Clean application shutdown

### Enhanced File Operations
The Electron version provides these improvements over the web version:
- **Persistent Storage**: Files saved to disk instead of browser downloads
- **Automatic File Management**: CSV files automatically append new data
- **User Data Directory**: Dedicated application data folder
- **Native Dialogs**: System file dialogs for better user experience

## Usage

### Configuration Mode
1. Set station title
2. Add product SKUs
3. Configure barcode patterns for each SKU using regex
4. Save configuration (automatically saved to user data directory)

### Production Mode
1. Select a configured SKU
2. Scan barcodes in sequence
3. System validates each barcode against configured patterns
4. Results automatically saved to CSV files
5. CSV files stored in user data directory with proper headers

## API Endpoints (IPC)

The application exposes these IPC endpoints for renderer-main communication:

- `save-config`: Save configuration to user data directory
- `load-config`: Load configuration from user data or bundled file
- `save-csv`: Save CSV data with automatic file management
- `show-save-dialog`: Display native save dialog
- `show-open-dialog`: Display native open dialog
- `read-file`: Read file content
- `write-file`: Write file content
- `get-system-info`: Get system and application information
- `export-data`: Export data with native save dialog

## Build Configuration

The application is configured to build:
- **Portable EXE**: Standalone executable requiring no installation
- **NSIS Installer**: Traditional Windows installer with shortcuts
- **Architecture**: x64 Windows
- **Auto-updater**: Ready for future implementation

## Development Notes

### Electron Security
- Node.js integration enabled for file system access
- Context isolation disabled for IPC communication
- Web security disabled for local file access

### File System Access
- Uses Electron's IPC for secure main-renderer communication
- Automatic directory creation for user data
- Error handling for file operations
- Fallback to web APIs when not in Electron environment

## Troubleshooting

### Build Issues
- Ensure Node.js version 16+ is installed
- Clear node_modules and reinstall if build fails
- Check Windows Defender/antivirus settings for false positives

### Runtime Issues
- Check user data directory permissions
- Verify configuration file format (valid JSON)
- Check console for detailed error messages in development mode

## Future Enhancements

- Application icon and branding
- Auto-updater implementation
- Database integration for larger datasets
- Network synchronization capabilities
- Advanced reporting features