# TabFlow: Notion Web Clipper

A browser extension that helps you capture and organize web content directly in your Notion database. TabFlow transforms how you collect and manage web resources with minimal effort.

![TabFlow Logo](icons/icon128.png)

## Overview

TabFlow makes it effortless to save and organize websites directly to your Notion database with just a few clicks. Whether you're researching for a project, collecting resources, or building a knowledge base, TabFlow streamlines your workflow with sophisticated content extraction and AI-powered enhancement.

## Features

- **One-Click Capture**: Save any webpage to your Notion database in seconds
- **Smart Content Extraction**: Automatically pulls relevant information from webpages
- **AI Enhancement**: Optional AI-powered content analysis with Gemini API that generates improved descriptions and relevant tags
- **Customizable Capture**: Edit any information before saving
- **URL Path Control**: Choose exactly how much of a URL to include when saving
- **Multiple Enhancement Styles**: Choose from Standard, Detailed, Key Points, or Technical enhancement styles
- **Tag Management**: Easily add, edit and manage tags for better organization
- **Flexible Configuration**: Connect to any Notion database with a custom API integration

## Installation

### From Chrome Web Store (Coming Soon)
1. Visit the Chrome Web Store page [link to be added]
2. Click "Add to Chrome"
3. Confirm the installation

### Manual Installation (Developer Mode)
1. Download or clone this repository:
   ```
   git clone https://github.com/jonathan-geva/TabFlow
   ```
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top-right corner
4. Click "Load unpacked" and select the downloaded/cloned folder
5. The extension should now appear in your browser toolbar

## Configuration

Before using TabFlow, you need to set up your Notion integration:

1. Create a Notion integration at https://www.notion.so/my-integrations
2. Copy your integration token
3. Create a database in Notion with the following properties:
   - Name (title)
   - URL (url)
   - Description (text)
   - Tags (multi-select)
   - Saved at (date)
4. Share your database with the integration you created
5. Copy your database ID from the URL (the part after the workspace name and before the question mark)
6. Click the TabFlow extension icon and go to Settings
7. Enter your Notion API key and database ID
8. If you want to use AI enhancement features, add your Gemini API key

## Usage

1. Navigate to any webpage you wish to save
2. Click the TabFlow icon in your browser toolbar
3. Review the automatically extracted information
4. (Optional) Click "Enhance" to use AI to improve the description and generate tags
5. (Optional) Edit any field as needed
6. Click "Save" to add the page to your Notion database

## Development

### Project Structure
```
tabflow/
├── icons/                   # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── src/
│   ├── popup/
│   │   ├── popup.css        # Popup styling
│   │   ├── popup.html       # Popup HTML structure
│   │   └── popup.js         # Popup interaction logic
│   ├── utils/
│   │   └── notion-api.js    # Notion API interaction
│   ├── background.js        # Background script for API communication
│   └── content.js           # Content script for webpage data extraction
├── .gitignore
├── LICENSE
├── manifest.json            # Extension configuration
└── README.md                # Documentation
```

### Building and Testing
The extension can be loaded directly into Chrome for testing:
1. Make your changes to the codebase
2. Go to `chrome://extensions/`
3. Click "Reload" on the extension card
4. Test your changes

## Privacy

TabFlow accesses:
- The content of the current webpage to extract information
- Your Notion database (with your explicit permission)
- Gemini API for AI enhancement (optional, only if configured)

We do not:
- Track your browsing history
- Share any data with third parties
- Store your API keys or data outside your browser's local storage

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support the Project

If you find TabFlow helpful for your productivity workflow, consider buying me a coffee. Every contribution helps with maintenance and new feature development.

<a href="https://buymeacoffee.com/jonathan.g" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with Chrome Extension APIs
- Integrates with Notion API
- AI-powered enhancement via Google's Gemini API

---

**TabFlow: Browse. Collect. Create.**