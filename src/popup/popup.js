document.addEventListener('DOMContentLoaded', function () {
    // UI elements
    const previewContainer = document.getElementById('info-preview');
    const confirmButton = document.getElementById('confirm-button');
    const cancelButton = document.getElementById('cancel-button');
    const settingsButton = document.getElementById('settings-button');
    const aiEnhanceButton = document.getElementById('ai-enhance-button');
    const settingsPanel = document.getElementById('settings-panel');
    const saveSettingsButton = document.getElementById('save-settings');
    const backButton = document.getElementById('back-button');
    const notionApiUrlInput = document.getElementById('notion-api-url');
    const notionDatabaseIdInput = document.getElementById('notion-database-id');
    const notionApiKeyInput = document.getElementById('notion-api-key');
    const geminiApiKeyInput = document.getElementById('gemini-api-key');
    const mainContent = document.getElementById('main-content');
    
    // Store page info for later use
    let pageInfo = {};
    let aiEnhanced = false;
    let manualTags = []; // Array to store manually added tags
    
    // Set retry count and interval
    let retryCount = 0;
    const maxRetries = 3;

    // Add notification container to the DOM
    const notificationContainer = document.createElement('div');
    notificationContainer.className = 'notification-container';
    document.body.appendChild(notificationContainer);
    
    // Global notification functions
    function showNotification(message, type = 'error', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const content = document.createElement('div');
        content.className = 'notification-content';
        content.textContent = message;
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'notification-close';
        closeBtn.innerHTML = '×';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent the notification click event from firing
            removeNotification(notification);
        });
        
        notification.appendChild(content);
        notification.appendChild(closeBtn);
        notificationContainer.appendChild(notification);
        
        // Make the entire notification clickable
        notification.addEventListener('click', () => {
            removeNotification(notification);
        });
        
        // Auto-dismiss after duration
        if (duration > 0) {
            setTimeout(() => {
                removeNotification(notification);
            }, duration);
        }
        
        return notification;
    }
    
    function removeNotification(notification) {
        notification.classList.add('removing');
        setTimeout(() => {
            notification.remove();
        }, 300); // Match the animation duration
    }

    // Load saved settings when popup opens
    loadSettings();
    
    // Function to show settings
    function showSettings() {
        mainContent.classList.add('hidden');
        settingsPanel.classList.remove('hidden');
        console.log('Settings panel opened');
    }
    
    // Function to show main content
    function showMainContent() {
        settingsPanel.classList.add('hidden');
        mainContent.classList.remove('hidden');
        console.log('Main content displayed');
    }
    
    // Settings toggle
    settingsButton.addEventListener('click', showSettings);
    
    // Back button in settings
    backButton.addEventListener('click', showMainContent);
    
    // Save settings
    saveSettingsButton.addEventListener('click', function() {
        const settings = {
            notionApiUrl: notionApiUrlInput.value.trim() || 'https://api.notion.com/v1',
            notionDatabaseId: notionDatabaseIdInput.value.trim() || '',
            notionApiKey: notionApiKeyInput.value.trim() || '',
            geminiApiKey: geminiApiKeyInput.value.trim() || ''
        };
        
        chrome.storage.sync.set({ settings }, function() {
            // Show success indicator
            saveSettingsButton.textContent = 'Saved!';
            saveSettingsButton.disabled = true;
            
            setTimeout(() => {
                saveSettingsButton.textContent = 'Save Settings';
                saveSettingsButton.disabled = false;
                
                // Return to main view using the showMainContent function
                showMainContent();
                
                // Show success notification
                showNotification('Settings saved successfully!', 'success', 2000);
            }, 1000);
        });
    });
    
    // Load settings from storage
    function loadSettings() {
        chrome.storage.sync.get('settings', function(data) {
            if (data.settings) {
                notionApiUrlInput.value = data.settings.notionApiUrl || '';
                notionDatabaseIdInput.value = data.settings.notionDatabaseId || '';
                notionApiKeyInput.value = data.settings.notionApiKey || '';
                geminiApiKeyInput.value = data.settings.geminiApiKey || '';
            }
        });
    }
    
    // Function to get page information with retries
    function getPageInformation() {
        previewContainer.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <div class="loading-text">Loading page information...</div>
            </div>`;
        
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                // First, try to inject our script if it's not already there
                ensureContentScriptLoaded(tabs[0].id, () => {
                    // Then request the page info
                    chrome.tabs.sendMessage(tabs[0].id, { action: "getPageInfo" }, (response) => {
                        if (response) {
                            pageInfo = response;
                            displayInfo(response);
                        } else if (retryCount < maxRetries) {
                            retryCount++;
                            previewContainer.innerHTML = `<p>Retrying... (${retryCount}/${maxRetries})</p>`;
                            setTimeout(getPageInformation, 500);
                        } else {
                            // Fallback: get basic information directly
                            getBasicPageInfo();
                        }
                    });
                });
            }
        });
    }
    
    // Function to ensure content script is loaded
    function ensureContentScriptLoaded(tabId, callback) {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                return window.notionClipperContentScriptLoaded === true;
            }
        }).then(results => {
            if (results[0]?.result === true) {
                // Content script is already loaded
                callback();
            } else {
                // Inject the content script
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['src/content.js']
                }).then(() => {
                    callback();
                }).catch(error => {
                    console.error("Error injecting content script:", error);
                    // Still try to proceed with callback
                    callback();
                });
            }
        }).catch(error => {
            console.error("Error checking for content script:", error);
            // Still try to proceed with callback
            callback();
        });
    }
    
    // Fallback function to get basic page info directly through tabs API
    function getBasicPageInfo() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                pageInfo = {
                    title: tabs[0].title || "Unknown Title",
                    url: tabs[0].url || "Unknown URL",
                    description: "Description could not be retrieved."
                };
                displayInfo(pageInfo);
                // Show a warning notification that we're using basic info
                showNotification("Using basic page information. For better results, reload the page.", "info", 4000);
            } else {
                showNotification("Error: Could not retrieve page information.", "error");
                previewContainer.innerHTML = '<div class="loading-container">Unable to get page information</div>';
            }
        });
    }
    
    // Function to display gathered information
    function displayInfo(info) {
        // Parse URL correctly
        const urlParts = parseUrl(info.url);
        
        // Check if there are any path segments
        const hasPathSegments = urlParts.segments.length > 0;

        previewContainer.innerHTML = `
            <div class="preview-item">
                <strong>Title</strong>
                <input type="text" id="title-input" class="editable-field" value="${escapeHtml(info.title)}" />
            </div>
            <div class="preview-item">
                <strong>URL${hasPathSegments ? ' <span class="hint">(adjust path depth)</span>' : ''}</strong>
                <div class="url-visualizer" id="url-visualizer">
                    <span class="domain">${urlParts.domain}</span>${urlParts.segments.map((segment, i) => 
                        `<span class="path-segment" data-index="${i}">${segment}</span>`
                    ).join('')}
                </div>
                ${hasPathSegments ? `
                <div class="slider-container">
                    <input type="range" min="0" max="${urlParts.segments.length}" value="${urlParts.segments.length}" class="url-depth-slider" id="url-depth-slider">
                    <div class="slider-labels">
                        <span>Domain</span>
                        <span>Full URL</span>
                    </div>
                </div>
                ` : ''}
                <input type="hidden" id="url-input" value="${info.url}">
            </div>
            <div class="preview-item">
                <strong>Tags <span class="hint">(press Enter or type comma to add)</span></strong>
                <div class="tag-input-container">
                    <input type="text" id="tag-input" class="editable-field" placeholder="Add tags..." />
                </div>
                <div class="tags-container" id="manual-tags-container"></div>
            </div>
            <div class="preview-item">
                <strong>Description</strong>
                <textarea id="description-input" class="editable-field" rows="4">${escapeHtml(info.description || '')}</textarea>
            </div>
        `;
        
        // Set up the URL depth slider functionality only if there are path segments
        if (hasPathSegments) {
            setupUrlDepthSlider(urlParts);
        }
        
        // Setup tag input functionality
        setupTagInput();
        
        // Auto-focus the title input
        const titleInput = document.getElementById('title-input');
        if (titleInput) {
            titleInput.focus();
            titleInput.setSelectionRange(titleInput.value.length, titleInput.value.length);
        }
    }
    
    // Initialize tag input and event listeners
    function setupTagInput() {
        const tagInput = document.getElementById('tag-input');
        const manualTagsContainer = document.getElementById('manual-tags-container');
        
        // Display any existing tags
        renderManualTags();
        
        // Handle tag input
        tagInput.addEventListener('keydown', function(e) {
            // Handle Enter key or Tab key
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                addTag(this.value);
            }
        });
        
        // Replace the existing input handler with this improved version
        tagInput.addEventListener('input', function(e) {
            const value = this.value;
            if (value.includes(',')) {
                // Split by comma and process all tags at once
                const tagValues = value.split(',');
                
                // Process each tag
                tagValues.forEach(tag => {
                    const trimmedTag = tag.trim();
                    if (trimmedTag) {
                        addTag(trimmedTag);
                    }
                });
                
                // Clear input field completely after processing all tags
                this.value = '';
            }
        });
    }
    
    // Add tag function
    function addTag(tagText) {
        tagText = tagText.trim();
        if (tagText && !manualTags.includes(tagText)) {
            manualTags.push(tagText);
            renderManualTags();
            
            // Clear input field
            const tagInput = document.getElementById('tag-input');
            tagInput.value = '';
            
            // Update pageInfo with the tags
            pageInfo.tags = [...manualTags];
        }
    }
    
    // Remove tag function
    function removeTag(tagIndex) {
        manualTags.splice(tagIndex, 1);
        renderManualTags();
        
        // Update pageInfo with the tags
        pageInfo.tags = [...manualTags];
    }
    
    // Render tags in the container
    function renderManualTags() {
        const manualTagsContainer = document.getElementById('manual-tags-container');
        if (!manualTagsContainer) return;
        
        manualTagsContainer.innerHTML = '';
        
        manualTags.forEach((tag, index) => {
            const tagElement = document.createElement('div');
            tagElement.className = 'tag';
            tagElement.innerHTML = `
                <span class="tag-text">${escapeHtml(tag)}</span>
                <span class="tag-remove" data-index="${index}">×</span>
            `;
            manualTagsContainer.appendChild(tagElement);
        });
        
        // Add event listeners to remove buttons
        document.querySelectorAll('.tag-remove').forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                removeTag(index);
            });
        });
    }

    // Improved URL parser that handles malformed URLs better
    function parseUrl(url) {
        try {
            // Fix common URL issues
            let fixedUrl = url;
            if (!/^https?:\/\//i.test(fixedUrl)) {
                fixedUrl = 'https://' + fixedUrl;
            }
            
            const urlObj = new URL(fixedUrl);
            
            // Extract domain (always shown and selected)
            const domain = urlObj.origin;
            
            // Get path segments
            let path = urlObj.pathname;
            if (path.startsWith('/')) {
                path = path.substring(1);
            }
            if (path.endsWith('/')) {
                path = path.substring(0, path.length - 1);
            }
            
            let segments = [];
            if (path) {
                segments = path.split('/').map(segment => '/' + segment);
            }
            
            // Add query string as a final segment if present
            if (urlObj.search) {
                segments.push(urlObj.search);
            }
            
            // Add hash as a final segment if present
            if (urlObj.hash) {
                segments.push(urlObj.hash);
            }
            
            return { domain, segments, full: url };
        } catch (e) {
            console.error("URL parsing error:", e);
            
            // Fallback for malformed URLs
            // Try to extract domain and path manually
            let domain = url;
            let segments = [];
            
            // Find the first slash after http:// or https://
            const protocolEnd = url.indexOf('://');
            if (protocolEnd > -1) {
                const pathStart = url.indexOf('/', protocolEnd + 3);
                if (pathStart > -1) {
                    domain = url.substring(0, pathStart);
                    const pathPart = url.substring(pathStart);
                    segments = pathPart.split('/').filter(Boolean).map(segment => '/' + segment);
                }
            } else {
                // No protocol, check for first slash
                const pathStart = url.indexOf('/');
                if (pathStart > -1) {
                    domain = url.substring(0, pathStart);
                    const pathPart = url.substring(pathStart);
                    segments = pathPart.split('/').filter(Boolean).map(segment => '/' + segment);
                }
            }
            
            return { domain, segments, full: url };
        }
    }

    // Set up the URL depth slider
    function setupUrlDepthSlider(urlParts) {
        // Skip setting up the slider if the element doesn't exist (no path segments)
        const slider = document.getElementById('url-depth-slider');
        if (!slider) return;
        
        const urlVisualizer = document.getElementById('url-visualizer');
        const urlInput = document.getElementById('url-input');
        const pathSegments = document.querySelectorAll('.path-segment');
        
        updateUrlVisualization(slider.value);
        
        slider.addEventListener('input', function() {
            updateUrlVisualization(this.value);
        });
        
        function updateUrlVisualization(depth) {
            // Update the URL visualizer
            pathSegments.forEach((segment, index) => {
                if (index < depth) {
                    segment.classList.add('selected');
                } else {
                    segment.classList.remove('selected');
                }
            });
            
            // Construct the new URL based on slider position
            let newUrl = urlParts.domain;
            for (let i = 0; i < depth && i < urlParts.segments.length; i++) {
                newUrl += urlParts.segments[i];
            }
            
            // Update the hidden input with the new URL
            urlInput.value = newUrl;
        }
    }

    // Helper function to escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // CONFIRM BUTTON - Save to Notion
    confirmButton.addEventListener('click', function () {
        confirmButton.disabled = true;
        confirmButton.innerHTML = '<div class="loading-spinner" style="width:16px;height:16px;"></div><span>Saving...</span>';
        
        // Get the edited values from the input fields
        const editedTitle = document.getElementById('title-input')?.value || pageInfo.title;
        const editedUrl = document.getElementById('url-input')?.value || pageInfo.url;
        const editedDescription = document.getElementById('description-input')?.value || pageInfo.description;
        
        // Create an updated pageInfo object with the edited values
        const updatedPageInfo = {
            ...pageInfo,
            title: editedTitle,
            url: editedUrl,
            description: editedDescription,
            tags: manualTags // Ensure we include the manual tags when saving
        };
        
        // First check if required settings are available
        chrome.storage.sync.get('settings', function(data) {
            if (!data.settings || !data.settings.notionApiKey || !data.settings.notionDatabaseId) {
                // Show notification for missing settings
                showNotification('Please configure your Notion API settings first!', 'error');
                confirmButton.disabled = false;
                confirmButton.innerHTML = '<svg class="button-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg><span>Try Again</span>';
                
                // Show settings panel automatically
                setTimeout(() => {
                    showSettings();
                }, 1500);
                
                return;
            }
            
            // Continue with saving if we have all required settings
            chrome.runtime.sendMessage({
                action: 'saveToNotion',
                pageInfo: updatedPageInfo
            }, function (response) {
                if (response && response.success) {
                    // Get reference to button container
                    const buttonContainer = document.querySelector('.button-container');
                    
                    // Show success screen
                    previewContainer.innerHTML = `
                        <div class="success-container">
                            <div class="success-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="6 12 10 16 18 8"></polyline>
                                </svg>
                            </div>
                            <div class="success-message">Successfully saved to Notion!</div>
                        </div>`;
                    
                    // Hide the button container
                    if (buttonContainer) {
                        buttonContainer.style.display = 'none';
                    }
                    
                    setTimeout(() => {
                        window.close();
                    }, 1500);
                } else {
                    showNotification(`Failed to save to Notion: ${response?.error || 'Unknown error'}`, 'error');
                    confirmButton.disabled = false;
                    confirmButton.innerHTML = '<svg class="button-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg><span>Try Again</span>';
                }
            });
        });
    });

    // Close popup when cancel button is clicked
    cancelButton.addEventListener('click', function () {
        window.close();
    });
    
    // AI ENHANCE BUTTON
    aiEnhanceButton.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Just show the modal when clicking the enhance button
        const modal = document.getElementById('enhance-options-modal');
        if (modal) {
            modal.style.display = "block";
        }
    });
    
    // Replace the existing enhanceWithAI function with this improved version
    async function enhanceWithAI(pageData, apiKey, enhancementStyle = 'standard') {
        // Update the model to gemini-2.0-pro-exp-02-05 as specified
        const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-pro-exp-02-05:generateContent';
        
        // Create the JSON input structure for the AI
        const inputJson = {
            url: pageData.url || "Not available",
            title: pageData.title || "Not available",
            meta_description: pageData.description || null,
            page_content: pageData.content ? pageData.content.substring(0, 4000) : "Not available"
        };
        
        // Prepare the system prompt with style-specific instructions
        let styleInstructions = "";
        
        switch(enhancementStyle) {
            case 'detailed':
                styleInstructions = `
                    Create a DETAILED analysis with:
                    - A comprehensive description (3-4 sentences)
                    - 8-12 specific tags covering topics, technologies, and use cases
                    - Include more technical terms where appropriate
                `;
                break;
            case 'key-points':
                styleInstructions = `
                    Structure the response as KEY POINTS with:
                    - A 1 sentence summary of what the site/tool does
                    - 3-5 bullet points highlighting the main features/benefits 
                    - 6-10 relevant tags focusing on capabilities and functions
                `;
                break;
            case 'technical':
                styleInstructions = `
                    Create a TECHNICAL overview with:
                    - Focus on technologies, frameworks, and technical capabilities
                    - Emphasize technical aspects and specifications
                    - Include technical terminology in the tags
                    - The description should highlight technical features
                `;
                break;
            default: // standard
                styleInstructions = `
                    Create a STANDARD enhancement with:
                    - A concise 1-2 sentence summary
                    - 5-8 relevant, focused tags
                `;
        }
        
        const systemPrompt = `
    ### **System Prompt**  
    
    You are an advanced AI specializing in **web content analysis and categorization**. Your task is to process the **URL, title, meta description** and **content** of a webpage and generate:  
    
    1. **Tags** – A list of relevant keywords that categorize the page's content effectively.
    2. **Short Description** – A summary that clearly describes the website, tool, or resource. The description should be factual, direct, and engaging—avoiding any uncertainty.  
    
    ### **Enhancement Style**: ${enhancementStyle.toUpperCase()}
    ${styleInstructions}
    
    ### **Purpose & Guidelines:**  
    - The output will be used in a curated website list featuring tools and resources.  
    - The description should clearly explain what the site/tool offers without generic phrases.
    - If the meta description is vague or missing, extract meaning from the content.  
    - Avoid broad, generic tags like "website", "information", or "news".  
    - If the page lists multiple tools/resources, summarize the collection's purpose.  
    
    ### **Input:**  
    ${JSON.stringify(inputJson, null, 2)}
    
    Respond ONLY with a JSON object containing:
    1. A "tags" array with relevant tags
    2. A "short_description" field with the summary
    
    Your response must be valid JSON that can be parsed with JSON.parse().
    `;
        
        const requestData = {
            contents: [
                {
                    role: "user",
                    parts: [{ text: systemPrompt }]
                }
            ],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 500
            }
        };
        
        try {
            const response = await fetch(`${apiUrl}?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || "Failed to process with AI");
            }
            
            const responseData = await response.json();
            
            // Get the text response from the AI
            const aiText = responseData.candidates[0]?.content?.parts[0]?.text;
            
            if (!aiText) {
                throw new Error("No response from AI");
            }
            
            // Try to extract the JSON object from the response
            try {
                // Find JSON content - look for content between curly braces
                const jsonMatch = aiText.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error("No valid JSON found in response");
                }
                
                const jsonContent = jsonMatch[0];
                const parsedResponse = JSON.parse(jsonContent);
                
                // Extract tags and description from JSON response
                const tags = Array.isArray(parsedResponse.tags) ? parsedResponse.tags : [];
                const shortDescription = parsedResponse.short_description || "";
                
                return { 
                    tags, 
                    shortDescription,
                    enhancementStyle // Include the style used for reference
                };
            } catch (jsonError) {
                console.error("Failed to parse AI response JSON:", jsonError);
                
                // More robust fallback parsing
                return fallbackResponseParsing(aiText, enhancementStyle);
            }
        } catch (fetchError) {
            console.error("AI enhancement API error:", fetchError);
            
            // If the API call fails completely, generate a basic response from existing data
            return generateFallbackEnhancement(pageData, enhancementStyle);
        }
    }
    
    // New function: Fallback parsing for when JSON parsing fails
    function fallbackResponseParsing(aiText, enhancementStyle) {
        let tags = [];
        let shortDescription = "";
        
        // Extract tags using more flexible regex patterns
        const tagsMatch = aiText.match(/tags["']?\s*:?\s*\[([^\]]+)\]/i) || 
                         aiText.match(/tags["']?\s*:?\s*["']([^"']+)["']/i);
                         
        if (tagsMatch) {
            const tagText = tagsMatch[1];
            tags = tagText.split(',').map(tag => 
                tag.trim().replace(/^["']|["']$/g, '') // Remove quotes if present
            ).filter(tag => tag.length > 0);
        }
        
        // Extract short description with more flexible patterns
        const descMatch = aiText.match(/short_description["']?\s*:?\s*["']([^"']+)["']/i) || 
                         aiText.match(/short_description["']?\s*:?\s*([^,\n\r]+)/i);
                         
        if (descMatch) {
            shortDescription = descMatch[1].trim();
        } else {
            // If no pattern matches, look for paragraphs that might be descriptions
            const paragraphs = aiText.split(/\n\n|\r\n\r\n/).filter(p => 
                p.trim().length > 20 && !p.includes('tags') && !p.includes('{') && !p.includes('}')
            );
            
            if (paragraphs.length > 0) {
                shortDescription = paragraphs[0].trim();
            }
        }
        
        return { 
            tags, 
            shortDescription,
            enhancementStyle,
            fallbackParsed: true // Flag that this was parsed with fallback method
        };
    }
    
    // New function: Generate a basic enhancement when API fails
    function generateFallbackEnhancement(pageData, enhancementStyle) {
        // Extract potential tags from title and description
        let possibleTags = [];
        let title = pageData.title || "";
        let description = pageData.description || "";
        
        // Get words from title and description
        const titleWords = title.split(/\s+/);
        const descriptionWords = description.split(/\s+/);
        
        // Filter for words that could be tags (longer than 3 chars, not stopwords)
        const stopwords = ['the', 'and', 'for', 'with', 'that', 'this', 'from', 'your'];
        
        titleWords.forEach(word => {
            word = word.replace(/[^\w]/g, '').toLowerCase();
            if (word.length > 3 && !stopwords.includes(word)) {
                possibleTags.push(word);
            }
        });
        
        // Add domain name as a tag if available
        try {
            const url = new URL(pageData.url);
            const domain = url.hostname.replace('www.', '').split('.')[0];
            if (domain && domain.length > 1) {
                possibleTags.push(domain);
            }
        } catch(e) {}
        
        // Remove duplicates and limit to 5 tags
        const uniqueTags = [...new Set(possibleTags)].slice(0, 5);
        
        return {
            tags: uniqueTags,
            shortDescription: description || title || "Website saved from tab",
            enhancementStyle,
            fallbackGenerated: true // Flag that this was generated as fallback
        };
    }
    
    // Add this handler for enhance options
    document.addEventListener('DOMContentLoaded', function() {
        // Add event handlers for enhancement options
        document.querySelectorAll('.enhance-option').forEach(option => {
            option.addEventListener('click', function() {
                const style = this.getAttribute('data-style');
                enhanceContent(style);
            });
        });
        
        
        // Function to handle enhancement with specific style
        function enhanceContent(enhancementStyle) {
            if (aiEnhanced) {
                // If already enhanced, ask user if they want to re-enhance
                if (!confirm("Content is already enhanced. Enhance again with " + 
                          enhancementStyle + " style?")) {
                    return;
                }
            }
            
            // Rest of your AI enhancement logic here, passing the style parameter
            // to the enhanceWithAI function
            
            // Check if Gemini API key is available
            chrome.storage.sync.get('settings', function(data) {
                if (!data.settings || !data.settings.geminiApiKey) {
                    showNotification('Gemini API key is required for AI enhancement. Please add your API key in the settings.', 'error');
                    
                    // Auto-show settings after a delay
                    setTimeout(() => {
                        showSettings();
                    }, 1500);
                    return;
                }
                
                // Show loading notification
                const loadingNotification = showNotification(`Analyzing content with ${enhancementStyle} style...`, 'info', 0);
                
                // Add loading spinner to notification content
                const notificationContent = loadingNotification.querySelector('.notification-content');
                notificationContent.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="ai-spinner"></div>
                        <span>Analyzing with ${enhancementStyle} style...</span>
                    </div>
                `;
                
                // Disable enhance button while processing
                document.getElementById('ai-enhance-button').disabled = true;
                
                // Get the current page info
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]) {
                        chrome.tabs.sendMessage(tabs[0].id, { action: "getPageInfo" }, async (response) => {
                            if (response) {
                                try {
                                    // Pass the enhancement style to the AI function
                                    const enhancedContent = await enhanceWithAI(
                                        response, 
                                        data.settings.geminiApiKey,
                                        enhancementStyle
                                    );
                                    
                                    // Update UI with enhanced content
                                    updateUIWithAIContent(enhancedContent);
                                    
                                    // Set flag that content has been enhanced
                                    aiEnhanced = true;
                                    
                                    // Remove loading notification
                                    removeNotification(loadingNotification);
                                    
                                    // Add success indicator
                                    const statusIndicator = document.createElement('div');
                                    statusIndicator.className = 'ai-status-indicator';
                                    statusIndicator.innerHTML = `
                                        <svg width="12" height="12" viewBox="0 0 24 24">
                                            <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                                        </svg>
                                        <span>${enhancedContent.fallbackGenerated ? 'Basic' : 
                                               enhancedContent.fallbackParsed ? 'Partial' : 
                                               'Full'} enhancement with ${enhancementStyle} style</span>
                                    `;
                                    
                                    // Add status indicator to description container
                                    const descContainer = document.querySelector('.preview-item:last-child');
                                    if (descContainer) {
                                        // Remove any existing status indicators
                                        descContainer.querySelectorAll('.ai-status-indicator').forEach(el => el.remove());
                                        descContainer.appendChild(statusIndicator);
                                    }
                                    
                                } catch (error) {
                                    console.error("AI enhancement error:", error);
                                    removeNotification(loadingNotification);
                                    showNotification(`AI enhancement failed: ${error.message}`, 'error');
                                    
                                    // Add error indicator
                                    const errorIndicator = document.createElement('div');
                                    errorIndicator.className = 'ai-status-indicator error';
                                    errorIndicator.innerHTML = `
                                        <svg width="12" height="12" viewBox="0 0 24 24">
                                            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                                        </svg>
                                        <span>Enhancement failed - using original content</span>
                                    `;
                                    
                                    // Add error indicator
                                    const descContainer = document.querySelector('.preview-item:last-child');
                                    if (descContainer) {
                                        descContainer.querySelectorAll('.ai-status-indicator').forEach(el => el.remove());
                                        descContainer.appendChild(errorIndicator);
                                    }
                                } finally {
                                    // Re-enable the enhance button
                                    document.getElementById('ai-enhance-button').disabled = false;
                                }
                            } else {
                                removeNotification(loadingNotification);
                                showNotification("Couldn't retrieve page content", "error");
                                document.getElementById('ai-enhance-button').disabled = false;
                            }
                        });
                    }
                });
            });
        }
    });
    
    // Function to update the UI with AI-generated content
    function updateUIWithAIContent(aiContent) {
        // Insert AI-generated tags section if there are any new tags
        if (aiContent.tags && Array.isArray(aiContent.tags) && aiContent.tags.length > 0) {
            // Add the AI-generated tags that aren't already in manualTags
            aiContent.tags.forEach(tag => {
                // Ensure tag is a string before adding
                const tagStr = typeof tag === 'object' ? JSON.stringify(tag) : String(tag).trim();
                if (tagStr && !manualTags.includes(tagStr)) {
                    manualTags.push(tagStr);
                }
            });
            
            // Render the updated tags
            renderManualTags();
        }
        
        // Update description with AI-generated description if available
        if (aiContent.shortDescription) {
            const descriptionInput = document.getElementById('description-input');
            if (descriptionInput) {
                // Handle the case where shortDescription is a complex object with KEY-POINTS
                if (typeof aiContent.shortDescription === 'object') {
                    // Check if it has KEY-POINTS array
                    if (aiContent.shortDescription['KEY-POINTS'] && Array.isArray(aiContent.shortDescription['KEY-POINTS'])) {
                        // Format the key points as a nicely formatted string
                        const keyPoints = aiContent.shortDescription['KEY-POINTS']
                            .map(point => point.trim())
                            .join('\n\n');
                        descriptionInput.value = keyPoints;
                    } else {
                        // Fallback for other object formats
                        descriptionInput.value = JSON.stringify(aiContent.shortDescription);
                    }
                } else {
                    // Handle regular string descriptions
                    descriptionInput.value = String(aiContent.shortDescription);
                }
            }
        }
    }
    
    // Start getting page info when popup opens
    getPageInformation();
    
    // Make sure main content is visible on load (unless coming from a redirect)
    showMainContent();
    
    // Show/hide the enhancement style modal
    // Get the modal
    const modal = document.getElementById('enhance-options-modal');
    const enhanceButton = document.getElementById('ai-enhance-button');
    const closeButton = document.querySelector('.enhance-close');
    
    // When the user clicks on the button, open the modal
    enhanceButton.addEventListener('click', function(e) {
        e.preventDefault();
        modal.style.display = "block";
    });
    
    // When the user clicks on the × close button, close the modal
    closeButton.addEventListener('click', function() {
        modal.style.display = "none";
    });
    
    // When the user clicks anywhere outside of the modal, close it
    window.addEventListener('click', function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    });
    
    // When the user clicks on an enhancement style option
    document.querySelectorAll('.enhance-option').forEach(option => {
        option.addEventListener('click', function() {
            // Get the enhancement style from the data attribute
            const style = this.getAttribute('data-style');
            
            // Hide the modal
            modal.style.display = "none";
            
            // Trigger enhancement with the selected style
            enhanceContent(style);
        });
    });
    
    // The enhanceContent function to implement enhancement with specific style
    function enhanceContent(enhancementStyle) {
        if (aiEnhanced) {
            // Replace the confirm with custom dialog
            showConfirmDialog(`Content is already enhanced. Enhance again with ${enhancementStyle} style?`, () => {
                // This runs when user confirms
                processEnhancement(enhancementStyle);
            });
        } else {
            // Directly process enhancement if not already enhanced
            processEnhancement(enhancementStyle);
        }
        
        // Move the actual enhancement logic to a separate function
        function processEnhancement(style) {
            // Check if Gemini API key is available
            chrome.storage.sync.get('settings', function(data) {
                if (!data.settings || !data.settings.geminiApiKey) {
                    showNotification('Gemini API key is required for AI enhancement. Please add your API key in the settings.', 'error');
                    
                    // Auto-show settings after a delay
                    setTimeout(() => {
                        showSettings();
                    }, 1500);
                    return;
                }
                
                // Rest of your existing enhancement implementation...
                const loadingNotification = showNotification(`Enhancing with ${style} style...`, 'info', 0);
                
                // Add loading spinner to notification content
                const notificationContent = loadingNotification.querySelector('.notification-content');
                notificationContent.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="ai-spinner"></div>
                        <span>Enhancing with ${style} style...</span>
                    </div>
                `;
                
                // Disable enhance button while processing
                document.getElementById('ai-enhance-button').disabled = true;
                
                // Get the current page info and enhance it
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]) {
                        chrome.tabs.sendMessage(tabs[0].id, { action: "getPageInfo" }, async (response) => {
                            if (response) {
                                try {
                                    const enhancedContent = await enhanceWithAI(
                                        response, 
                                        data.settings.geminiApiKey,
                                        style
                                    );
                                    
                                    // Update UI with enhanced content
                                    updateUIWithAIContent(enhancedContent);
                                    
                                    // Set flag that content has been enhanced
                                    aiEnhanced = true;
                                    
                                    // Remove loading notification
                                    removeNotification(loadingNotification);
                                    
                                    // Show success notification or indicator
                                    // ...
                                    
                                } catch (error) {
                                    console.error("AI enhancement error:", error);
                                    removeNotification(loadingNotification);
                                    showNotification(`AI enhancement failed: ${error.message}`, 'error');
                                } finally {
                                    // Re-enable the enhance button
                                    document.getElementById('ai-enhance-button').disabled = false;
                                }
                            } else {
                                removeNotification(loadingNotification);
                                showNotification("Couldn't retrieve page content", "error");
                                document.getElementById('ai-enhance-button').disabled = false;
                            }
                        });
                    }
                });
            });
        }
    }
    
    // Add this function to handle custom confirmations
    function showConfirmDialog(message, onConfirm) {
        const dialog = document.getElementById('confirm-dialog');
        const messageElement = document.getElementById('confirm-dialog-message');
        const okButton = document.getElementById('confirm-dialog-ok');
        const cancelButton = document.getElementById('confirm-dialog-cancel');
        const closeButton = document.querySelector('.confirm-close');
        
        // Set the message
        messageElement.textContent = message;
        
        // Show the dialog
        dialog.style.display = "block";
        
        // Set up event handlers
        const closeDialog = () => {
            dialog.style.display = "none";
        };
        
        // Handle OK button
        okButton.onclick = () => {
            closeDialog();
            onConfirm();
        };
        
        // Handle Cancel button and close button
        cancelButton.onclick = closeDialog;
        closeButton.onclick = closeDialog;
        
        // Close when clicking outside the dialog
        window.addEventListener('click', function(event) {
            if (event.target === dialog) {
                closeDialog();
            }
        }, { once: true });
    }
});