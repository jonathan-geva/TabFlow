// Import the OpenAI API utility and model providers
import { enhanceWithOpenAI } from '../utils/openai-api.js';
import { fetchModelsForProvider, fetchGeminiModels } from '../utils/model-providers.js';

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
    const openaiApiKeyInput = document.getElementById('openai-api-key');
    const modelProviderSelect = document.getElementById('model-provider');
    const geminiModelSelect = document.getElementById('gemini-model');
    const openaiModelSelect = document.getElementById('openai-model');
    const geminiSettings = document.getElementById('gemini-settings');
    const openaiSettings = document.getElementById('openai-settings');
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
    
    // Function to create a styled confirmation notification
    function showStyledConfirmNotification(message, options = {}) {
        const {
            type = 'info',
            icon = 'star', // 'star', 'info', or custom SVG path
            primaryBtnText = 'Confirm',
            secondaryBtnText = 'Cancel',
            onPrimaryClick = () => {},
            onSecondaryClick = () => {}
        } = options;
        
        // Create base notification
        const notification = showNotification(message, type, 0);
        
        // Apply consistent styling
        notification.style.maxWidth = 'none';
        notification.style.width = 'calc(100% - 20px)';
        notification.style.borderRadius = 'var(--border-radius)';
        notification.style.backgroundColor = 'var(--card-bg)';
        notification.style.border = '1px solid var(--border-color)';
        notification.style.boxShadow = '0 4px 12px var(--glass-shadow), inset 0 1px 1px var(--glass-highlight)';
        
        // Get and style content
        const notificationContent = notification.querySelector('.notification-content');
        notificationContent.style.fontSize = '13px';
        notificationContent.style.color = 'var(--text-primary)';
        notificationContent.style.textAlign = 'center';
        notificationContent.style.padding = '5px 0';
        
        // Add icon
        const iconContainer = document.createElement('div');
        iconContainer.style.display = 'flex';
        iconContainer.style.justifyContent = 'center';
        iconContainer.style.marginBottom = '8px';
        
        // Choose the appropriate icon
        let iconSvg = '';
        if (icon === 'star') {
            iconSvg = `<path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z"/>`;
        } else if (icon === 'info') {
            iconSvg = `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>`;
        } else {
            // Custom icon path
            iconSvg = icon;
        }
        
        const enhanceIcon = document.createElement('div');
        enhanceIcon.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="color: var(--primary-color)">
                ${iconSvg}
            </svg>
        `;
        
        iconContainer.appendChild(enhanceIcon);
        
        // Wrap the text content in a styled div
        const textContent = notificationContent.textContent;
        notificationContent.textContent = '';
        
        const textContainer = document.createElement('div');
        textContainer.textContent = textContent;
        textContainer.style.fontWeight = '500';
        textContainer.style.margin = '8px 0';
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.marginTop = '12px';
        buttonContainer.style.justifyContent = 'center';
        
        // Create primary button
        const primaryBtn = document.createElement('button');
        primaryBtn.textContent = primaryBtnText;
        primaryBtn.className = 'notification-button confirm';
        primaryBtn.style.backgroundColor = 'var(--primary-color)';
        primaryBtn.style.color = 'white';
        primaryBtn.style.padding = '8px 16px';
        primaryBtn.style.borderRadius = 'var(--border-radius)';
        primaryBtn.style.fontWeight = '500';
        primaryBtn.style.fontSize = '13px';
        primaryBtn.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
        
        // Create secondary button
        const secondaryBtn = document.createElement('button');
        secondaryBtn.textContent = secondaryBtnText;
        secondaryBtn.className = 'notification-button cancel';
        secondaryBtn.style.backgroundColor = '#222';
        secondaryBtn.style.color = '#ccc';
        secondaryBtn.style.padding = '8px 16px';
        secondaryBtn.style.borderRadius = 'var(--border-radius)';
        secondaryBtn.style.fontWeight = '500';
        secondaryBtn.style.fontSize = '13px';
        secondaryBtn.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        
        // Rebuild the notification content
        notificationContent.appendChild(iconContainer);
        notificationContent.appendChild(textContainer);
        buttonContainer.appendChild(primaryBtn);
        buttonContainer.appendChild(secondaryBtn);
        notificationContent.appendChild(buttonContainer);
        
        // Add event listeners
        primaryBtn.addEventListener('click', () => {
            removeNotification(notification);
            onPrimaryClick();
        });
        
        secondaryBtn.addEventListener('click', () => {
            removeNotification(notification);
            onSecondaryClick();
        });
        
        // Return the notification
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
    
    // Toggle provider settings visibility based on selection
    modelProviderSelect.addEventListener('change', function() {
        const provider = this.value;
        updateProviderSettingsVisibility(provider);
        
        // Fetch models for the selected provider
        populateModelDropdown(provider);
    });
    
    // Function to update provider settings visibility
    function updateProviderSettingsVisibility(provider) {
        // Hide all provider settings
        geminiSettings.classList.remove('active');
        openaiSettings.classList.remove('active');
        
        // Show the selected provider's settings
        if (provider === 'gemini') {
            geminiSettings.classList.add('active');
        } else if (provider === 'openai') {
            openaiSettings.classList.add('active');
        }
    }
    
    // Function to populate model dropdown for selected provider
    async function populateModelDropdown(provider, apiKey = null) {
        const modelSelect = provider === 'openai' ? openaiModelSelect : geminiModelSelect;
        const apiKeyInput = provider === 'openai' ? openaiApiKeyInput : geminiApiKeyInput;
        
        // Get API key if not provided
        if (!apiKey) {
            apiKey = apiKeyInput.value;
        }
        
        try {
            // Fetch models
            const models = await fetchModelsForProvider(provider, apiKey);
            
            // Save current selection if any
            const currentSelection = modelSelect.value;
            
            // Clear existing options
            modelSelect.innerHTML = '';
            
            if (provider === 'openai') {
                // Handle OpenAI models
                models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model;
                    
                    // Add a friendly label for some known models
                    if (model === 'gpt-4-1106-preview') {
                        option.textContent = `${model} (4.1nano)`;
                    } else if (model === 'gpt-3.5-turbo') {
                        option.textContent = `${model} (3.5)`;
                    } else {
                        option.textContent = model;
                    }
                    
                    modelSelect.appendChild(option);
                });
            } else {
                // Handle Gemini models - fetch the full objects with names
                const geminiModels = await fetchGeminiModels(apiKey);
                geminiModels.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = model.name;
                    modelSelect.appendChild(option);
                });
            }
            
            // Restore previous selection if it exists in the new list
            if (currentSelection && models.includes(currentSelection)) {
                modelSelect.value = currentSelection;
            }
            
            // If empty, set a default selection
            if (modelSelect.options.length === 0) {
                const defaultModel = provider === 'openai' ? 'gpt-4-1106-preview' : 'gemini-1.5-flash';
                const option = document.createElement('option');
                option.value = defaultModel;
                option.textContent = defaultModel;
                modelSelect.appendChild(option);
            }
            
            // Save models to settings
            chrome.storage.sync.get('settings', function(data) {
                if (data.settings) {
                    const settings = data.settings;
                    if (provider === 'openai') {
                        settings.openaiModels = models;
                    } else {
                        settings.geminiModels = models;
                    }
                    chrome.storage.sync.set({ settings });
                }
            });
            
        } catch (error) {
            console.error(`Error fetching models for ${provider}:`, error);
            
            // Add a default option if fetch fails
            if (modelSelect.options.length === 0) {
                const defaultModel = provider === 'openai' ? 'gpt-4-1106-preview' : 'gemini-1.5-flash';
                const option = document.createElement('option');
                option.value = defaultModel;
                option.textContent = defaultModel;
                modelSelect.appendChild(option);
            }
        }
    }
    
    // Save settings
    saveSettingsButton.addEventListener('click', function() {
        const settings = {
            notionApiUrl: notionApiUrlInput.value.trim() || 'https://api.notion.com/v1',
            notionDatabaseId: notionDatabaseIdInput.value.trim() || '',
            notionApiKey: notionApiKeyInput.value.trim() || '',
            geminiApiKey: geminiApiKeyInput.value.trim() || '',
            openaiApiKey: openaiApiKeyInput.value.trim() || '',
            modelProvider: modelProviderSelect.value || 'gemini',
            geminiModel: geminiModelSelect.value || 'gemini-pro',
            openaiModel: openaiModelSelect.value || 'gpt-4-1106-preview'
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
                openaiApiKeyInput.value = data.settings.openaiApiKey || '';
                modelProviderSelect.value = data.settings.modelProvider || 'gemini';
                
                // Set the model dropdowns if values exist
                if (data.settings.geminiModel) {
                    geminiModelSelect.value = data.settings.geminiModel;
                }
                
                if (data.settings.openaiModel) {
                    openaiModelSelect.value = data.settings.openaiModel;
                }
                
                // Update visibility of provider settings
                updateProviderSettingsVisibility(data.settings.modelProvider);
                
                // Populate model dropdowns with cached models if available
                if (data.settings.geminiModels && data.settings.geminiModels.length > 0) {
                    populateModelDropdownFromCache('gemini', data.settings.geminiModels, data.settings.geminiModel);
                } else {
                    // Fetch fresh models
                    populateModelDropdown('gemini', data.settings.geminiApiKey);
                }
                
                if (data.settings.openaiModels && data.settings.openaiModels.length > 0) {
                    populateModelDropdownFromCache('openai', data.settings.openaiModels, data.settings.openaiModel);
                } else {
                    // Fetch fresh models
                    populateModelDropdown('openai', data.settings.openaiApiKey);
                }
            } else {
                // If no settings, initialize model dropdowns
                populateModelDropdown('gemini');
                populateModelDropdown('openai');
            }
        });
    }
    
    // Function to populate model dropdown from cached models
    function populateModelDropdownFromCache(provider, models, selectedModel) {
        const modelSelect = provider === 'openai' ? openaiModelSelect : geminiModelSelect;
        const apiKeyInput = provider === 'openai' ? openaiApiKeyInput : geminiApiKeyInput;
        
        // Clear existing options
        modelSelect.innerHTML = '';
        
        if (provider === 'openai') {
            // Add models to dropdown
            models.forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                
                // Add a friendly label for some known models
                if (model === 'gpt-4-1106-preview') {
                    option.textContent = `${model} (4.1nano)`;
                } else if (model === 'gpt-3.5-turbo') {
                    option.textContent = `${model} (3.5)`;
                } else {
                    option.textContent = model;
                }
                
                modelSelect.appendChild(option);
            });
        } else {
            // For Gemini, we need to fetch the display names
            const apiKey = apiKeyInput.value;
            fetchGeminiModels(apiKey).then(geminiModels => {
                const modelMap = {};
                geminiModels.forEach(model => {
                    modelMap[model.id] = model.name;
                });
                
                // Add models to dropdown
                models.forEach(modelId => {
                    const option = document.createElement('option');
                    option.value = modelId;
                    
                    // Use the display name if available, otherwise use the ID
                    option.textContent = modelMap[modelId] || modelId;
                    
                    modelSelect.appendChild(option);
                });
                
                // Set the selected model if provided
                if (selectedModel && models.includes(selectedModel)) {
                    modelSelect.value = selectedModel;
                }
            });
            return; // Exit early since we're handling selection in the promise
        }
        
        // Set the selected model if provided
        if (selectedModel && models.includes(selectedModel)) {
            modelSelect.value = selectedModel;
        }
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
        try {
            console.log(`Enhancing with AI using ${enhancementStyle} style`);
            
            return new Promise((resolve, reject) => {
                chrome.storage.sync.get('settings', async function(data) {
                    try {
                        const settings = data.settings || {};
                        const modelProvider = settings.modelProvider || 'gemini';
                        
                        let aiContent;
                        
                        if (modelProvider === 'openai') {
                            // Use OpenAI
                            const openaiApiKey = settings.openaiApiKey;
                            const openaiModel = settings.openaiModel || 'gpt-4-1106-preview';
                            
                            if (!openaiApiKey) {
                                throw new Error('OpenAI API key is required. Please configure it in settings.');
                            }
                            
                            console.log(`Using OpenAI model ${openaiModel} for enhancement`);
                            aiContent = await enhanceWithOpenAI(pageData, openaiApiKey, enhancementStyle, openaiModel);
                        } else {
                            // Use Gemini (default)
                            const geminiApiKey = settings.geminiApiKey;
                            const geminiModel = settings.geminiModel || 'gemini-pro';
                            
                            if (!geminiApiKey) {
                                throw new Error('Gemini API key is required. Please configure it in settings.');
                            }
                            
                            console.log(`Using Gemini model ${geminiModel} for enhancement`);
                            // Use existing Gemini enhancement code with the selected model
                            aiContent = await enhanceWithGemini(pageData, geminiApiKey, enhancementStyle, geminiModel);
                        }
                        
                        // Update UI with AI content
                        updateUIWithAIContent(aiContent);
                        resolve(aiContent);
                        
                    } catch (error) {
                        console.error('Error enhancing with AI:', error);
                        showNotification(error.message, 'error');
                        
                        // Fall back to generate basic enhancement if possible
                        const fallbackContent = generateFallbackEnhancement(pageData, enhancementStyle);
                        updateUIWithAIContent(fallbackContent);
                        resolve(fallbackContent); // Resolve with fallback content instead of rejecting
                    }
                });
            });
            
        } catch (error) {
            console.error('Error enhancing with AI:', error);
            throw error;
        }
    }
    
    // Update enhanceWithGemini to use the selected model
    async function enhanceWithGemini(pageData, apiKey, enhancementStyle = 'standard', model = 'gemini-1.5-flash') {
        if (!apiKey) {
            throw new Error('Gemini API key is required');
        }
        
        try {
            // Fetch available models to validate the selected model
            const availableModels = await fetchGeminiModels(apiKey);
            const availableModelIds = availableModels.map(m => m.id);
            
            // Check if the selected model is available
            if (!availableModelIds.includes(model)) {
                console.warn(`Model ${model} is not available. Falling back to gemini-1.5-flash or first available model.`);
                
                // Try to fallback to gemini-1.5-flash, or the first available model
                model = availableModelIds.includes('gemini-1.5-flash') 
                    ? 'gemini-1.5-flash' 
                    : (availableModelIds[0] || 'gemini-pro');
                
                console.log(`Using fallback model: ${model}`);
            }
            
            // Prepare the API URL with the provided API key and model
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            
            // Create prompts based on enhancement style
            let prompt = '';
            
            switch (enhancementStyle) {
                case 'detailed':
                    prompt = `You are an AI assistant that improves web page descriptions and generates relevant tags. 
Given the following web page information, provide a comprehensive analysis with 150-200 words. 
Generate 8-12 relevant tags that categorize the content effectively.

Page Title: ${pageData.title}
Page URL: ${pageData.url}
Page Description: ${pageData.description || 'No description available'}

Format your response exactly as follows:
Description: [Your comprehensive analysis]
Tags: [tag1, tag2, tag3, ...]`;
                    break;
                    
                case 'key-points':
                    prompt = `You are an AI assistant that improves web page descriptions and generates relevant tags. 
Given the following web page information, extract 4-6 key points from the content and format them as bullet points. 
Generate 6-8 relevant tags that highlight the main topics.

Page Title: ${pageData.title}
Page URL: ${pageData.url}
Page Description: ${pageData.description || 'No description available'}

Format your response exactly as follows:
Description:
• [Key point 1]
• [Key point 2]
• [Key point 3]
...
Tags: [tag1, tag2, tag3, ...]`;
                    break;
                    
                case 'technical':
                    prompt = `You are an AI assistant that improves web page descriptions and generates relevant tags. 
Given the following web page information, focus on technical specifications, features, and capabilities. 
Provide a technical summary of 100-150 words.
Generate 6-10 technical tags related to technologies, methods, or specifications.

Page Title: ${pageData.title}
Page URL: ${pageData.url}
Page Description: ${pageData.description || 'No description available'}

Format your response exactly as follows:
Description: [Your technical summary]
Tags: [tag1, tag2, tag3, ...]`;
                    break;
                    
                case 'standard':
                default:
                    prompt = `You are an AI assistant that improves web page descriptions and generates relevant tags. 
Given the following web page information, provide a concise summary in 80-120 words. 
Generate 5-8 relevant tags that accurately represent the content.

Page Title: ${pageData.title}
Page URL: ${pageData.url}
Page Description: ${pageData.description || 'No description available'}

Format your response exactly as follows:
Description: [Your concise summary]
Tags: [tag1, tag2, tag3, ...]`;
                    break;
            }
            
            // Define the request payload
            const payload = {
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000,
                    topP: 0.8,
                    topK: 40
                }
            };
            
            console.log(`Making request to Gemini API with model: ${model}`);
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `Error calling Gemini API with model ${model}`);
            }
            
            const data = await response.json();
            
            // Extract the AI-generated text
            const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            
            // Extract description and tags from AI response
            const descriptionMatch = aiText.match(/Description:(.*?)(?=Tags:|$)/s);
            const tagsMatch = aiText.match(/Tags:(.*?)$/s);
            
            let description = '';
            let tags = [];
            
            if (descriptionMatch && descriptionMatch[1]) {
                description = descriptionMatch[1].trim();
            }
            
            if (tagsMatch && tagsMatch[1]) {
                // Extract tags and clean them up
                const tagsText = tagsMatch[1].trim();
                tags = tagsText.split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag.length > 0);
            }
            
            // If parsing fails, attempt fallback parsing
            if (!description && !tags.length) {
                return fallbackResponseParsing(aiText, enhancementStyle);
            }
            
            return {
                description,
                tags,
                model: model // Include the model used for reference
            };
        } catch (error) {
            console.error(`Error with Gemini API (${model}):`, error);
            throw error;
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
    
    // Fallback enhancement generator when AI service fails
    function generateFallbackEnhancement(pageData, enhancementStyle) {
        console.log("Generating fallback enhancement for style:", enhancementStyle);
        
        // Generate a basic description from the page data
        const title = pageData.title || "";
        const url = pageData.url || "";
        const domain = new URL(url).hostname.replace('www.', '');
        
        let description = "";
        let tags = [];
        
        // Generate description based on available data
        if (pageData.description && pageData.description.length > 10) {
            description = pageData.description;
        } else {
            // Create a basic description based on the title and domain
            description = `${title} - A resource found at ${domain}.`;
        }
        
        // Extract potential tags from title and URL
        const titleWords = title.split(/\s+/);
        
        // Filter out common words and short words, then convert to lowercase for tags
        const commonWords = ["the", "and", "a", "an", "in", "on", "at", "to", "for", "with", "by", "of", "is", "are"];
        const potentialTags = titleWords
            .filter(word => word.length > 3 && !commonWords.includes(word.toLowerCase()))
            .map(word => word.replace(/[^\w\s]/g, '').toLowerCase())
            .filter(word => word.length > 3)
            .slice(0, 5);  // Take at most 5 tags
        
        // Add domain as a tag
        tags = [...new Set([domain.split('.')[0], ...potentialTags])];
        
        return {
            description: description,
            tags: tags
        };
    }
    
    // Function to update the UI with AI-enhanced content
    function updateUIWithAIContent(aiContent) {
        if (!aiContent) {
            showNotification("AI enhancement failed. Using original content.", "error");
            return;
        }
        
        // Get the current description and URL
        const descriptionInput = document.getElementById('description-input');
        
        // Update the description with the AI-enhanced content if available
        if (aiContent.description) {
            descriptionInput.value = aiContent.description;
        } else if (aiContent.shortDescription) {
            // For backward compatibility with older content format
            descriptionInput.value = aiContent.shortDescription;
        }
        
        // Update the tags if they are provided
        if (aiContent.tags && aiContent.tags.length > 0) {
            // Clear existing manual tags
            manualTags = [];
            
            // Add the AI-generated tags
            aiContent.tags.forEach(tag => {
                addTag(tag);
            });
            
            // Render the updated tags
            renderManualTags();
        }
        
        // Save the enhanced content to localStorage
        saveEnhancedContentToStorage(aiContent);
        
        // Indicate that the content has been AI-enhanced
        aiEnhanced = true;
        
        // Update the UI to reflect the enhancement
        const aiEnhanceButton = document.getElementById('ai-enhance-button');
        aiEnhanceButton.classList.add('enhanced');
        
        // Create a small label to show which model was used
        const modelUsed = aiContent.model || 'AI';
        const modelIndicator = document.createElement('div');
        modelIndicator.className = 'model-indicator';
        modelIndicator.innerHTML = `Enhanced using: ${modelUsed}`;
        modelIndicator.style.fontSize = '10px';
        modelIndicator.style.marginTop = '4px';
        modelIndicator.style.color = '#666';
        
        // Add the indicator below the description field
        const descriptionContainer = document.querySelector('.preview-item:last-child');
        if (descriptionContainer) {
            // Remove any existing model indicators
            const existingIndicator = descriptionContainer.querySelector('.model-indicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }
            
            descriptionContainer.appendChild(modelIndicator);
        }
        
        // Show a success notification
        showNotification("Content enhanced with AI!", "success", 2000);
    }
    
    // Add this function to save enhanced content to localStorage
    function saveEnhancedContentToStorage(enhancementData) {
        localStorage.setItem('tabflow_enhanced_content', JSON.stringify({
            timestamp: Date.now(),
            data: enhancementData
        }));
    }
    
    // Add this function to load enhanced content from localStorage
    function loadEnhancedContentFromStorage() {
        const savedContent = localStorage.getItem('tabflow_enhanced_content');
        if (savedContent) {
            try {
                const parsedContent = JSON.parse(savedContent);
                // Check if the content is recent (last 24 hours)
                const isRecent = (Date.now() - parsedContent.timestamp) < 24 * 60 * 60 * 1000;
                
                if (isRecent && parsedContent.data) {
                    updateUIWithAIContent(parsedContent.data);
                    // Remove from localStorage after loading
                    localStorage.removeItem('tabflow_enhanced_content');
                    return true;
                }
            } catch (e) {
                console.error('Error parsing saved enhanced content:', e);
            }
        }
        return false;
    }

    // Start getting page info when popup opens
    getPageInformation();
    
    // Try to load previously enhanced content
    const hasLoadedContent = loadEnhancedContentFromStorage();
    if (hasLoadedContent) {
        showNotification("Loaded previously enhanced content!", "success", 2000);
    }
    
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
    
    // Function to handle enhancement with specific style
    function enhanceContent(enhancementStyle) {
        if (aiEnhanced) {
            // Use the styled confirmation notification
            showStyledConfirmNotification(`Enhance again with "${enhancementStyle}" style?`, {
                icon: 'star',
                primaryBtnText: 'Enhance',
                secondaryBtnText: 'Cancel',
                onPrimaryClick: proceedWithEnhancement,
                onSecondaryClick: () => {}
            });
            
            return;
        }
        
        proceedWithEnhancement();
        
        function proceedWithEnhancement() {
            // Show loading state in the UI
            const descriptionInput = document.getElementById('description-input');
            if (descriptionInput) {
                descriptionInput.value = "Loading AI enhancement...";
            }
            
            // Disable the enhance button during processing
            const enhanceButton = document.getElementById('ai-enhance-button');
            if (enhanceButton) {
                enhanceButton.disabled = true;
                enhanceButton.innerHTML = '<span class="loading-dots"></span>';
            }
            
            // Check if API key is available for the selected provider
            chrome.storage.sync.get('settings', function(data) {
                if (!data.settings) {
                    showNotification("Settings not configured. Please set up your API keys.", "error");
                    enableEnhanceButton();
                    return;
                }
                
                const settings = data.settings;
                const modelProvider = settings.modelProvider || 'gemini';
                
                if (modelProvider === 'openai' && !settings.openaiApiKey) {
                    showNotification("OpenAI API key is required. Please configure it in settings.", "error");
                    
                    // Auto-show settings after a delay
                    setTimeout(() => {
                        showSettings();
                    }, 1500);
                    
                    enableEnhanceButton();
                    return;
                } else if (modelProvider === 'gemini' && !settings.geminiApiKey) {
                    showNotification("Gemini API key is required. Please configure it in settings.", "error");
                    
                    // Auto-show settings after a delay
                    setTimeout(() => {
                        showSettings();
                    }, 1500);
                    
                    enableEnhanceButton();
                    return;
                }
                
                // Show loading notification
                const loadingNotification = showNotification(`Analyzing content with ${enhancementStyle} style...`, 'info', 0);
                
                // Add loading spinner to notification content
                const notificationContent = loadingNotification.querySelector('.notification-content');
                notificationContent.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="ai-spinner"></div>
                        <span>Analyzing with ${enhancementStyle} style using ${modelProvider === 'openai' ? settings.openaiModel : settings.geminiModel}...</span>
                    </div>
                `;
                
                // Create a copy of pageInfo for enhancement
                const enhancementData = {
                    pageInfo: JSON.parse(JSON.stringify(pageInfo)),
                    enhancementStyle: enhancementStyle,
                    settings: {
                        modelProvider: modelProvider,
                        apiKey: modelProvider === 'openai' ? settings.openaiApiKey : settings.geminiApiKey,
                        model: modelProvider === 'openai' ? settings.openaiModel : settings.geminiModel
                    }
                };
                
                // Get the current page info and enhance it
                try {
                    // Create a worker to handle the enhancement in the background
                    const worker = new Worker(URL.createObjectURL(new Blob([`
                        // Worker script for handling AI enhancement in the background
                        self.onmessage = async function(e) {
                            const { data } = e;
                            try {
                                // This is just a placeholder to signal that processing has started
                                // The actual enhancement is done in the main thread
                                self.postMessage({ status: 'started' });
                            } catch (error) {
                                self.postMessage({ status: 'error', error: error.message });
                            }
                        };
                    `], { type: 'application/javascript' })));
                    
                    // Listen for messages from the worker
                    worker.onmessage = function(e) {
                        // Just to keep the worker running until we're done
                        if (e.data.status === 'started') {
                            console.log('Enhancement worker started');
                        }
                    };
                    
                    // Start the worker
                    worker.postMessage(enhancementData);
                    
                    // Save the enhancement data to localStorage
                    localStorage.setItem('tabflow_enhancement_in_progress', JSON.stringify(enhancementData));
                    
                    enhanceWithAI(
                        pageInfo, 
                        modelProvider === 'openai' ? settings.openaiApiKey : settings.geminiApiKey,
                        enhancementStyle
                    ).then((aiContent) => {
                        // Save the enhanced content to localStorage
                        if (aiContent) {
                            saveEnhancedContentToStorage(aiContent);
                        }
                        
                        // Remove the in-progress flag
                        localStorage.removeItem('tabflow_enhancement_in_progress');
                        
                        // Update UI 
                        removeNotification(loadingNotification);
                        enableEnhanceButton();
                        
                        // This is done inside enhanceWithAI via updateUIWithAIContent already
                    }).catch(error => {
                        console.error("AI enhancement error:", error);
                        removeNotification(loadingNotification);
                        showNotification(`AI enhancement failed: ${error.message}`, 'error');
                        enableEnhanceButton();
                        
                        // Remove the in-progress flag
                        localStorage.removeItem('tabflow_enhancement_in_progress');
                    });
                } catch (error) {
                    console.error("Error starting AI enhancement:", error);
                    removeNotification(loadingNotification);
                    showNotification(`Failed to start AI enhancement: ${error.message}`, 'error');
                    enableEnhanceButton();
                    
                    // Remove the in-progress flag
                    localStorage.removeItem('tabflow_enhancement_in_progress');
                }
            });
        }
        
        // Helper function to re-enable the enhance button
        function enableEnhanceButton() {
            if (enhanceButton) {
                enhanceButton.disabled = false;
                enhanceButton.innerHTML = `
                    <svg class="button-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z"/>
                    </svg>
                    <span>Enhance</span>
                    <svg class="dropdown-arrow" width="10" height="10" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M7 10l5 5 5-5z"/>
                    </svg>
                `;
            }
        }
    }

    // Add code to check for and resume any in-progress enhancement
    function checkForInProgressEnhancement() {
        const inProgressData = localStorage.getItem('tabflow_enhancement_in_progress');
        if (inProgressData) {
            try {
                const enhancementData = JSON.parse(inProgressData);
                // Check if the data is recent (within the last hour)
                const isRecent = enhancementData.timestamp && 
                    (Date.now() - enhancementData.timestamp < 60 * 60 * 1000);
                
                if (isRecent) {
                    // Use the styled confirmation notification
                    showStyledConfirmNotification(
                        'Enhancement was in progress when popup closed. Would you like to check results?', 
                        {
                            icon: 'info',
                            primaryBtnText: 'Check results',
                            secondaryBtnText: 'Dismiss',
                            onPrimaryClick: () => {
                                loadEnhancedContentFromStorage();
                                localStorage.removeItem('tabflow_enhancement_in_progress');
                            },
                            onSecondaryClick: () => {
                                localStorage.removeItem('tabflow_enhancement_in_progress');
                            }
                        }
                    );
                } else {
                    // Remove old in-progress data
                    localStorage.removeItem('tabflow_enhancement_in_progress');
                }
            } catch (e) {
                console.error('Error checking for in-progress enhancement:', e);
                localStorage.removeItem('tabflow_enhancement_in_progress');
            }
        }
    }
    
    // Call this function when the popup opens
    checkForInProgressEnhancement();

    // Make sure main content is visible on load (unless coming from a redirect)
    showMainContent();

    // Process the enhancement request is now called by enhanceContent

    // Add API key input change listeners to fetch models when API keys are entered
    geminiApiKeyInput.addEventListener('blur', function() {
        if (this.value && this.value.trim().length > 0) {
            populateModelDropdown('gemini', this.value);
        }
    });
    
    openaiApiKeyInput.addEventListener('blur', function() {
        if (this.value && this.value.trim().length > 0) {
            populateModelDropdown('openai', this.value);
        }
    });
});