/**
 * OpenAI API utility functions for the TabFlow browser extension
 */

/**
 * Makes a request to the OpenAI API to enhance content with the selected model
 * 
 * @param {Object} data - Page information to enhance
 * @param {string} apiKey - OpenAI API key
 * @param {string} enhancementStyle - Style of enhancement (standard, detailed, key-points, technical)
 * @param {string} model - OpenAI model to use (defaults to gpt-4-1106-preview)
 * @returns {Promise<Object>} - Enhanced content with description and tags
 */
async function enhanceWithOpenAI(data, apiKey, enhancementStyle = 'standard', model = 'gpt-4-1106-preview') {
    try {
        if (!apiKey) {
            throw new Error('OpenAI API key is required');
        }

        // Create system prompt based on enhancement style
        let systemPrompt = getSystemPromptForStyle(enhancementStyle);
        
        // Prepare the page data to send to OpenAI
        const pageTitle = data.title || '';
        const pageUrl = data.url || '';
        const pageDescription = data.description || '';
        
        // Create the user prompt with page information
        const userPrompt = `
Page Title: ${pageTitle}
Page URL: ${pageUrl}
Page Description: ${pageDescription}

Please enhance this content according to the specified style.`;

        // Make the API request to OpenAI with the specified model
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Error calling OpenAI API');
        }

        const result = await response.json();
        const aiText = result.choices[0]?.message?.content || '';
        
        // Parse the AI response
        return parseOpenAIResponse(aiText, enhancementStyle);
    } catch (error) {
        console.error('Error enhancing with OpenAI:', error);
        throw error;
    }
}

/**
 * Creates the system prompt based on the enhancement style
 * 
 * @param {string} enhancementStyle - The style of enhancement
 * @returns {string} - The system prompt
 */
function getSystemPromptForStyle(enhancementStyle) {
    const basePrompt = `You are an AI assistant that improves web page descriptions and generates relevant tags. `;
    
    switch (enhancementStyle) {
        case 'detailed':
            return basePrompt + `Provide a comprehensive analysis of the webpage with 150-200 words. 
Generate 8-12 relevant tags that categorize the content effectively. 
Format your response with "Description:" followed by the detailed analysis, and "Tags:" followed by comma-separated tags.`;
            
        case 'key-points':
            return basePrompt + `Extract 4-6 key points from the webpage content and format them as bullet points. 
Generate 6-8 relevant tags that highlight the main topics. 
Format your response with "Description:" followed by the bullet points (using • as the bullet character), and "Tags:" followed by comma-separated tags.`;
            
        case 'technical':
            return basePrompt + `Focus on technical specifications, features, and capabilities mentioned on the webpage. 
Provide a technical summary of 100-150 words.
Generate 6-10 technical tags related to technologies, methods, or specifications.
Format your response with "Description:" followed by the technical summary, and "Tags:" followed by comma-separated tags.`;
            
        case 'standard':
        default:
            return basePrompt + `Provide a concise summary of the webpage content in 80-120 words. 
Generate 5-8 relevant tags that accurately represent the content. 
Format your response with "Description:" followed by the summary, and "Tags:" followed by comma-separated tags.`;
    }
}

/**
 * Parses the OpenAI response to extract description and tags
 * 
 * @param {string} aiText - The text response from OpenAI
 * @param {string} enhancementStyle - The style of enhancement
 * @returns {Object} - Object containing description and tags
 */
function parseOpenAIResponse(aiText, enhancementStyle) {
    try {
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
            tags
        };
    } catch (error) {
        console.error('Error parsing OpenAI response:', error);
        return fallbackResponseParsing(aiText, enhancementStyle);
    }
}

/**
 * Fallback parsing method for when the standard parsing fails
 * 
 * @param {string} aiText - The text response from OpenAI
 * @param {string} enhancementStyle - The style of enhancement
 * @returns {Object} - Object containing description and tags
 */
function fallbackResponseParsing(aiText, enhancementStyle) {
    // Simple fallback: use the first 80% as description, try to extract hashtags or keywords for tags
    const text = aiText.trim();
    const splitPoint = Math.floor(text.length * 0.8);
    
    let description = text.substring(0, splitPoint).trim();
    
    // Look for hashtags or keyword indicators in the remaining text
    const remainingText = text.substring(splitPoint);
    
    // Try to find hashtags or keywords
    const hashtagMatches = remainingText.match(/#[a-zA-Z0-9]+/g);
    const keywordMatches = remainingText.match(/keywords?:|tags?:|topics?:/i);
    
    let tags = [];
    
    if (hashtagMatches) {
        tags = hashtagMatches.map(tag => tag.substring(1));
    } else if (keywordMatches) {
        const keywordStart = remainingText.indexOf(keywordMatches[0]) + keywordMatches[0].length;
        const keywordText = remainingText.substring(keywordStart).trim();
        tags = keywordText.split(/[,;]/).map(tag => tag.trim()).filter(tag => tag.length > 0);
    }
    
    // If we still don't have tags, generate some based on the description
    if (!tags.length) {
        // Extract potential keywords from description (words of 4+ characters that aren't common words)
        const commonWords = ['this', 'that', 'with', 'from', 'have', 'what', 'which', 'their', 'about', 'would', 'these', 'there'];
        const words = description.split(/\s+/)
            .filter(word => word.length >= 4)
            .map(word => word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
            .filter(word => !commonWords.includes(word));
        
        // Count word frequency and take the top 5-8 as tags
        const wordCounts = {};
        words.forEach(word => {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
        });
        
        tags = Object.entries(wordCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(entry => entry[0]);
    }
    
    return {
        description,
        tags: tags.slice(0, 8) // Limit to 8 tags max
    };
}

// Export the functions for use in other modules
export {
    enhanceWithOpenAI
}; 