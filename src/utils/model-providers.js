/**
 * Utility functions for fetching available models from AI providers
 */

/**
 * Fetches available models from OpenAI
 * 
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<string[]>} - List of model IDs
 */
async function fetchOpenAIModels(apiKey) {
    if (!apiKey) {
        return getDefaultOpenAIModels();
    }

    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch OpenAI models');
        }

        const data = await response.json();
        const models = data.data || [];
        
        // Filter for chat-capable models (typically GPT models)
        const chatModels = models
            .filter(model => 
                model.id.includes('gpt') && 
                !model.id.includes('instruct') && 
                (model.id.includes('3.5') || model.id.includes('4'))
            )
            .map(model => model.id)
            .sort();
            
        return chatModels.length > 0 ? chatModels : getDefaultOpenAIModels();
    } catch (error) {
        console.error('Error fetching OpenAI models:', error);
        return getDefaultOpenAIModels();
    }
}

/**
 * Returns a default list of OpenAI models when the API call fails
 * 
 * @returns {string[]} - Default list of OpenAI model IDs
 */
function getDefaultOpenAIModels() {
    return [
        'gpt-4-1106-preview', // 4.1nano
        'gpt-4-vision-preview',
        'gpt-4',
        'gpt-3.5-turbo'
    ];
}

/**
 * Fetches available models from Google Gemini API using the models.list endpoint
 * 
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<Array<{id: string, name: string}>>} - List of Gemini models with display names
 */
async function fetchGeminiModels(apiKey) {
    if (!apiKey) {
        return getDefaultGeminiModels();
    }

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=50`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch Gemini models');
        }

        const data = await response.json();
        const models = data.models || [];
        
        // Filter for Gemini models and prepare them for display
        const geminiModels = models
            .filter(model => model.name.includes('gemini'))
            .map(model => {
                // Extract model ID from full name (e.g., "models/gemini-pro" -> "gemini-pro")
                const id = model.name.split('/').pop();
                
                // Create a friendly display name
                let displayName = id;
                if (id.includes('1.5-flash')) {
                    displayName = `${id} - Fastest multimodal model`;
                } else if (id.includes('1.5-pro')) {
                    displayName = `${id} - Best performing model with 2M token context`;
                } else if (id.includes('pro-vision')) {
                    displayName = `${id} - Model with vision capabilities`;
                } else if (id.includes('pro')) {
                    displayName = `${id} - Standard model for text generation`;
                }
                
                return {
                    id: id,
                    name: displayName
                };
            })
            .sort((a, b) => {
                // Sort to put 1.5 models first, then other models
                const aHas15 = a.id.includes('1.5');
                const bHas15 = b.id.includes('1.5');
                
                if (aHas15 && !bHas15) return -1;
                if (!aHas15 && bHas15) return 1;
                
                // Secondary sort by name
                return a.id.localeCompare(b.id);
            });
            
        return geminiModels.length > 0 ? geminiModels : getDefaultGeminiModels();
    } catch (error) {
        console.error('Error fetching Gemini models:', error);
        return getDefaultGeminiModels();
    }
}

/**
 * Returns a default list of Gemini models when the API call fails
 * 
 * @returns {Array<{id: string, name: string}>} - Default list of Gemini models
 */
function getDefaultGeminiModels() {
    return [
        {
            id: 'gemini-1.5-flash',
            name: 'gemini-1.5-flash - Fastest multimodal model'
        },
        {
            id: 'gemini-1.5-pro',
            name: 'gemini-1.5-pro - Best performing model with 2M token context'
        },
        {
            id: 'gemini-pro',
            name: 'gemini-pro - Standard model for text generation'
        },
        {
            id: 'gemini-pro-vision',
            name: 'gemini-pro-vision - Model with vision capabilities'
        }
    ];
}

/**
 * Handles model fetching for both providers
 * 
 * @param {string} provider - 'openai' or 'gemini'
 * @param {string} apiKey - API key for the selected provider
 * @returns {Promise<string[]>} - List of available model IDs
 */
async function fetchModelsForProvider(provider, apiKey) {
    switch (provider) {
        case 'openai':
            return await fetchOpenAIModels(apiKey);
        case 'gemini':
            const models = await fetchGeminiModels(apiKey);
            return models.map(model => model.id); // Return just the IDs for consistency
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}

// Export the functions
export {
    fetchOpenAIModels,
    fetchGeminiModels,
    fetchModelsForProvider
}; 