/**
 * Utility functions for interacting with the Notion API
 * This file provides a layer of abstraction for Notion API interactions
 */

// Listen for messages from background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "notionApiRequest") {
    // Get settings from storage
    chrome.storage.sync.get('settings', function(data) {
      if (!data.settings) {
        sendResponse({ success: false, error: "Settings not configured" });
        return;
      }
      
      saveToNotion(request.pageInfo, data.settings)
        .then(result => {
          sendResponse({ success: true, result });
        })
        .catch(error => {
          console.error("Notion API error:", error);
          sendResponse({ success: false, error: error.message });
        });
    });
    return true; // Keep the message channel open for async response
  }
});

/**
 * Saves page information to a Notion database
 * @param {Object} pageInfo - Information about the page to save
 * @param {Object} settings - User's Notion API settings
 * @returns {Promise} - Result of the API call
 */
async function saveToNotion(pageInfo, settings) {
  try {
    const notionApiUrl = settings.notionApiUrl || 'https://api.notion.com/v1';
    const notionDatabaseId = settings.notionDatabaseId;
    const notionApiKey = settings.notionApiKey;
    
    if (!notionDatabaseId || !notionApiKey) {
      throw new Error('Notion API settings not configured');
    }
    
    const response = await fetch(`${notionApiUrl}/pages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionApiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parent: { database_id: notionDatabaseId },
        properties: {
          Name: {
            title: [
              {
                text: {
                  content: pageInfo.title
                }
              }
            ]
          },
          URL: {
            url: pageInfo.url
          },
          Description: {
            rich_text: [
              {
                text: {
                  content: pageInfo.description || 'No description'
                }
              }
            ]
          },
          "Saved at": {
            date: {
              start: new Date().toISOString()
            }
          }
        }
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