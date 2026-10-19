// metadata.js - Updated to create a stack container for display elements

document.addEventListener('DOMContentLoaded', () => {
    const familyTreeContainer = document.getElementById('family-tree-container');
    // Renamed to store the single stack element instead of individual elements
    let currentMetadataStackElement = null;

    // Function to clear previous metadata display elements
    function clearMetadataDisplay() {
        if (currentMetadataStackElement && currentMetadataStackElement.parentElement) {
            currentMetadataStackElement.parentElement.removeChild(currentMetadataStackElement);
        }
        currentMetadataStackElement = null;
    }

    // Function to parse the raw metadata string
    function parseMetadata(rawMetadataString) {
        const metadata = {
            title: '',
            subtitle: '',
            author: '',
            date: '',
            color: true, // Default is true
            family_type: '',
            background: '', // 由 research.js 套用
            legend: true    // 由 research.js 套用
        };

        if (!rawMetadataString) {
            // console.log("No metadata block found or provided for parsing."); // Keep commented unless debugging
            return metadata; // Return defaults
        }

        // Extract content within the first metadata block {}
        const contentMatch = rawMetadataString.match(/metadata\s*\{([\s\S]*?)\}/);
        if (!contentMatch || !contentMatch[1]) {
             // console.warn("Metadata block format incorrect or empty:", rawMetadataString); // Keep commented unless debugging
             return metadata;
        }
        const metadataContent = contentMatch[1];

        // Use a regex that accounts for escaped quotes within string values
        const propertyRegex = /\s*(\w+)\s*:\s*((?:[^;"']|"[^"]*"|'[^']*')*?)\s*;/g;
        let match;

        while ((match = propertyRegex.exec(metadataContent)) !== null) {
            const key = match[1].trim();
            let value = match[2].trim();

            // Clean string values (remove quotes)
             if (value.startsWith('"') && value.endsWith('"')) {
                 value = value.substring(1, value.length - 1).replace(/\\"/g, '"'); // Handle escaped quotes inside
             } else if (value.startsWith("'") && value.endsWith("'")) {
                  value = value.substring(1, value.length - 1).replace(/\\'/g, "'"); // Handle escaped quotes inside
             }


            if (key in metadata) {
                if (key === 'color' || key === 'legend') {
                     // Convert value to boolean, defaulting to true for anything not explicitly "false"
                     metadata[key] = value.toLowerCase() !== 'false';
                } else {
                    metadata[key] = value;
                }
            } else {
                 console.warn(`Unknown metadata property: "${key}"`);
            }
        }
        // console.log("Parsed Metadata:", metadata); // Keep this commented unless debugging
        return metadata;
    }

    // Function to render the metadata display elements within a stack
    function renderMetadataDisplay(metadata) {
        if (!familyTreeContainer) {
            console.error("Family tree container not found for metadata display.");
            return;
        }

        clearMetadataDisplay(); // Clear existing stack before rendering new ones

        // Create the stack container element
        const metadataStack = document.createElement('div');
        metadataStack.id = 'metadata-display-stack';
        familyTreeContainer.appendChild(metadataStack);
        currentMetadataStackElement = metadataStack; // Store reference

        // Append individual metadata elements to the stack container
        if (metadata.title) {
            const titleEl = document.createElement('div');
            titleEl.classList.add('metadata-title');
            titleEl.textContent = metadata.title;
            metadataStack.appendChild(titleEl);
        }

        if (metadata.subtitle) {
            const subtitleEl = document.createElement('div');
            subtitleEl.classList.add('metadata-subtitle');
            subtitleEl.textContent = metadata.subtitle;
            metadataStack.appendChild(subtitleEl);
        }

        if (metadata.family_type) {
            const typeEl = document.createElement('div');
            typeEl.classList.add('metadata-family-type');
            typeEl.textContent = metadata.family_type;
            metadataStack.appendChild(typeEl);
        }

         if (metadata.author) {
            const authorEl = document.createElement('div');
            authorEl.classList.add('metadata-author');
            authorEl.textContent = `作者: ${metadata.author}`;
            metadataStack.appendChild(authorEl);
        }

        if (metadata.date) {
            const dateEl = document.createElement('div');
            dateEl.classList.add('metadata-date');
            dateEl.textContent = metadata.date; // Display date string as is
            metadataStack.appendChild(dateEl);
        }
    }

    // Function to apply or remove the grayscale mode class
    function applyColorMode(useColor) {
        if (familyTreeContainer) {
            familyTreeContainer.classList.toggle('grayscale-mode', !useColor);
            // console.log("Grayscale mode:", !useColor); // Keep commented unless debugging
        }
    }

    // Main function to process and display metadata - Called by treeSelector
    function processMetadata(ftdlStringWithMetadata) {
        const metadata = parseMetadata(ftdlStringWithMetadata);
        renderMetadataDisplay(metadata);
        applyColorMode(metadata.color);
    }

    // Function to clear displayed metadata and color mode - Called by treeSelector
    function clearMetadata() {
        clearMetadataDisplay();
        applyColorMode(true); // Ensure color mode is ON when cleared
        // console.log("Metadata display cleared."); // Keep commented unless debugging
    }

    // Expose functions globally for treeSelector.js
    window.processMetadata = processMetadata;
    window.clearMetadata = clearMetadata;

    console.log("metadata.js initialized.");

    // Initial clear on load to ensure no leftover elements or grayscale class
    // This also happens before any FTDL is processed, ensuring a clean start.
    clearMetadata();
});