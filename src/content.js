/**
 * Content script for TabFlow extension
 * Extracts information from the webpage for saving to Notion
 */

// Execute immediately instead of waiting for DOMContentLoaded
const pageInfo = getPageInfo();

// Create a flag to indicate the script is ready
window.notionClipperContentScriptLoaded = true;

// Send the gathered information to the popup
chrome.runtime.sendMessage({ action: 'previewInfo', data: pageInfo });

/**
 * Extracts relevant information from the current webpage
 * @returns {Object} Page information including title, URL, description, and content
 */
function getPageInfo() {
  const pageInfo = {
    title: document.title || "",
    url: window.location.href,
    description: "",
    favicon: "",
    content: "", // For AI analysis
  };

  // Special handling for Google Search pages
  if (window.location.hostname.includes('google') && window.location.pathname.includes('/search')) {
    // Get the search query
    const searchQuery = new URLSearchParams(window.location.search).get('q');
    if (searchQuery) {
      pageInfo.title = `Google Search: ${searchQuery}`;
      pageInfo.description = `Search results for: ${searchQuery}`;
    }
  } else {
    // Try to get meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      pageInfo.description = metaDescription.getAttribute("content");
    }
  }

  // Try to get favicon
  const favicon = document.querySelector('link[rel="icon"]') || 
                 document.querySelector('link[rel="shortcut icon"]');
  if (favicon) {
    pageInfo.favicon = favicon.href;
  }

  // Extract page content for AI analysis
  try {
    // Get main content (prioritizing article or main tags)
    const mainContent = document.querySelector('article') || 
                       document.querySelector('main') || 
                       document.querySelector('.content') || 
                       document.querySelector('#content');
    
    if (mainContent) {
      pageInfo.content = mainContent.textContent.trim();
    } else {
      // Fallback: get body text with some filtering
      const bodyText = document.body.innerText;
      // Only include first 5000 chars to avoid huge payloads
      pageInfo.content = bodyText.slice(0, 5000);
    }
    
    // Truncate if too long (API limits)
    if (pageInfo.content.length > 5000) {
      pageInfo.content = pageInfo.content.substring(0, 5000) + '...';
    }
  } catch (e) {
    pageInfo.content = "";
  }

  return pageInfo;
}

// Listen for messages from background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageInfo") {
    sendResponse(getPageInfo());
  }
  return true;
});

// Make sure the script announces its presence
console.log("Notion Web Clipper content script loaded successfully");