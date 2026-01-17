const fs = require('fs');
const path = require('path');

const electronVal = require('electron'); // This returns the path to the electron binary executable
console.log('Electron executable path:', electronVal);

let plistPath;
if (process.platform === 'darwin') {
    // Traverse up to find Contents
    const contentsPath = path.resolve(path.dirname(electronVal), '..');
    plistPath = path.join(contentsPath, 'Info.plist');
} else {
    console.log('Not running on macOS, skipping Info.plist patch.');
    process.exit(0);
}

console.log('Target Info.plist:', plistPath);

if (!fs.existsSync(plistPath)) {
    console.error('Error: Info.plist not found at', plistPath);
    process.exit(1);
}

let plistContent = fs.readFileSync(plistPath, 'utf8');

// Define keys to add/update
const keyMap = {
    'NSCameraUsageDescription': 'This app requires camera access for video conferencing and AI vision features.',
    'NSMicrophoneUsageDescription': 'This app requires microphone access for voice commands and AI interaction.',
    'NSCameraUseContinuityCameraDeviceType': true
};

function removeKey(content, key) {
    // Regex to remove <key>KeyName</key> followed by <string>...</string> or <true/> or <false/>
    // We match liberally to catch both single line and multi-line formatting if possible, 
    // but plist usually uses newlines.

    // We will use a loop to remove ALL occurrences in case of duplicates
    let newContent = content;
    const regex = new RegExp(`\\s*<key>${key}</key>\\s*(<string>.*?</string>|<true/>|<false/>)`, 'gs');

    // Check if match exists
    while (regex.test(newContent)) {
        newContent = newContent.replace(regex, '');
        // Reset regex state just in case, though replace with global flag should handle it
        // actually replace with 'gs' only replaces once? No, global replaces all.
        // But let's act on the string directly.
    }
    return newContent.replace(regex, '');
}

// Clean up existing keys to avoid duplicates
let newContent = plistContent;
Object.keys(keyMap).forEach(key => {
    newContent = removeKey(newContent, key);
});

// Now construct the new keys block
let keysString = '';
Object.entries(keyMap).forEach(([key, value]) => {
    keysString += `\n    <key>${key}</key>\n`;
    if (typeof value === 'boolean') {
        keysString += `    <${value}/>`;
    } else {
        keysString += `    <string>${value}</string>`;
    }
});

// Insert before the closing </dict> of the main root dict
const closingDictIndex = newContent.lastIndexOf('</dict>');

if (closingDictIndex === -1) {
    console.error('Error: Could not find closing </dict> in Info.plist');
    process.exit(1);
}

newContent = newContent.slice(0, closingDictIndex) + keysString + newContent.slice(closingDictIndex);

try {
    fs.writeFileSync(plistPath, newContent, 'utf8');
    console.log('Successfully patched Info.plist with clean camera/microphone permissions.');
} catch (err) {
    console.error('Error writing Info.plist:', err);
    process.exit(1);
}
