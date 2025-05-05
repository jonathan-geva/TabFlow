// Background script for handling API requests and extension events

// Add version log to ensure code is refreshed
chrome.runtime.onInstalled.addListener(() => {
    console.log('TabFlow extension installed - v1.0.2');
    
    // Initialize default settings
    chrome.storage.sync.get('settings', function(data) {
        if (!data.settings) {
            const defaultSettings = {
                notionApiUrl: 'https://api.notion.com/v1',
                notionDatabaseId: '',
                notionApiKey: '',
                geminiApiKey: '',
                openaiApiKey: '',
                modelProvider: 'gemini', // default to gemini, options: 'gemini', 'openai'
                geminiModel: 'gemini-1.5-flash', // default Gemini model - fastest model
                openaiModel: 'gpt-4-1106-preview', // default OpenAI model (4.1nano)
                geminiModels: [], // will be populated with available models
                openaiModels: []  // will be populated with available models
            };
            chrome.storage.sync.set({ settings: defaultSettings });
        }
    });
});

// Listen for messages from popup.js or content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageInfo") {
    // Send message to content script to get page info
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "getPageInfo" }, (response) => {
          if (response) {
            sendResponse(response);
          }
        });
      }
    });
    return true; // Keep the message channel open for async response
  } else if (request.action === "saveToNotion") {
    // Get settings first, then save to Notion
    chrome.storage.sync.get('settings', function(data) {
      if (!data.settings) {
        sendResponse({ success: false, error: "Settings not configured" });
        return;
      }
      
      // Use stored settings
      saveToNotion(request.pageInfo, data.settings)
        .then(result => {
          sendResponse({ success: true, result });
        })
        .catch(error => {
          console.error("Error saving to Notion:", error);
          sendResponse({ success: false, error: error.message });
        });
    });
    return true; // Keep the message channel open for async response
  } else if (request.action === "previewInfo") {
    // Handle previewInfo message from content.js
    // No response needed for this message
  }
});

/**
 * Saves the captured page information to a Notion database
 * @param {Object} data - Page information to save
 * @param {Object} settings - User's Notion API settings
 * @returns {Promise} - Result of the Notion API call
 */
async function saveToNotion(data, settings) {
    try {
        const notionApiUrl = settings.notionApiUrl || 'https://api.notion.com/v1';
        const notionDatabaseId = settings.notionDatabaseId;
        const notionApiKey = settings.notionApiKey;
        
        if (!notionDatabaseId || !notionApiKey) {
            throw new Error('Notion API settings not configured');
        }
        
        // Build properties object for Notion
        const properties = {
            Name: {
                title: [
                    {
                        text: {
                            content: data.title
                        }
                    }
                ]
            },
            URL: {
                url: data.url
            },
            Description: {
                rich_text: [
                    {
                        text: {
                            content: data.description || 'No description'
                        }
                    }
                ]
            },
            "Saved at": {
                date: {
                    start: new Date().toISOString()
                }
            }
        };
        
        // Add tags if available
        if (data.tags && data.tags.length > 0) {
            properties.Tags = {
                multi_select: data.tags.slice(0, 10).map(tag => ({
                    name: tag.substring(0, 100) // Notion has a limit on tag length
                }))
            };
        }
        
        const response = await fetch(`${notionApiUrl}/pages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${notionApiKey}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28'
            },
            body: JSON.stringify({
                parent: { database_id: notionDatabaseId },
                properties: properties
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to save to Notion');
        }

        return await response.json();
    } catch (error) {
        console.error('Error saving to Notion:', error);
        throw error;
    }
}