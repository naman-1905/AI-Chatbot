// Utility functions for managing chat history in localStorage

/**
 * Save chat history for a specific channel
 * @param {string} chatChannel - The chat channel ID
 * @param {Array} messages - Array of message objects
 */
export function saveChatHistory(chatChannel, messages) {
  if (!chatChannel) return;
  
  try {
    const chats = JSON.parse(localStorage.getItem("chatHistory") || "{}");
    chats[chatChannel] = messages;
    localStorage.setItem("chatHistory", JSON.stringify(chats));
  } catch (error) {
    console.error("Error saving chat history:", error);
  }
}

/**
 * Load chat history for a specific channel
 * @param {string} chatChannel - The chat channel ID
 * @returns {Array} Array of message objects
 */
export function loadChatHistory(chatChannel) {
  if (!chatChannel) return [];
  
  try {
    const chats = JSON.parse(localStorage.getItem("chatHistory") || "{}");
    return chats[chatChannel] || [];
  } catch (error) {
    console.error("Error loading chat history:", error);
    return [];
  }
}

/**
 * Get all chat channels and their messages
 * @returns {Object} Object with channel IDs as keys and message arrays as values
 */
export function getAllChats() {
  try {
    return JSON.parse(localStorage.getItem("chatHistory") || "{}");
  } catch (error) {
    console.error("Error getting all chats:", error);
    return {};
  }
}

/**
 * Delete a specific chat channel
 * @param {string} chatChannel - The chat channel ID to delete
 * @returns {boolean} True if deletion was successful
 */
export function deleteChatHistory(chatChannel) {
  if (!chatChannel) return false;
  
  try {
    const chats = JSON.parse(localStorage.getItem("chatHistory") || "{}");
    if (chats[chatChannel]) {
      delete chats[chatChannel];
      localStorage.setItem("chatHistory", JSON.stringify(chats));
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error deleting chat history:", error);
    return false;
  }
}

/**
 * Clear all chat history
 * @returns {boolean} True if clearing was successful
 */
export function clearAllChats() {
  try {
    localStorage.setItem("chatHistory", "{}");
    return true;
  } catch (error) {
    console.error("Error clearing all chats:", error);
    return false;
  }
}

/**
 * Get chat statistics
 * @param {string} chatChannel - The chat channel ID
 * @returns {Object} Statistics object with message count and word count
 */
export function getChatStats(chatChannel) {
  const messages = loadChatHistory(chatChannel);
  
  return {
    messageCount: messages.length,
    wordCount: messages.reduce((sum, msg) => {
      return sum + (msg.text?.split(/\s+/).length || 0);
    }, 0),
    characterCount: messages.reduce((sum, msg) => {
      return sum + (msg.text?.length || 0);
    }, 0)
  };
}

/**
 * Get all chat channels with metadata
 * @returns {Array} Array of chat objects with metadata
 */
export function getAllChatsWithMetadata() {
  const chats = getAllChats();
  
  return Object.entries(chats)
    .filter(([channel, messages]) => channel && Array.isArray(messages))
    .map(([channel, messages]) => ({
      chat_channel: channel,
      total_messages: messages.length,
      word_count: messages.reduce((sum, m) => sum + (m.text?.split(/\s+/).length || 0), 0),
      character_count: messages.reduce((sum, m) => sum + (m.text?.length || 0), 0),
      last_message: messages[messages.length - 1]?.text || "",
      last_timestamp: messages[messages.length - 1]?.timestamp || null,
      messages: messages
    }))
    .sort((a, b) => {
      // Sort by last timestamp, most recent first
      const timeA = a.last_timestamp ? new Date(a.last_timestamp).getTime() : 0;
      const timeB = b.last_timestamp ? new Date(b.last_timestamp).getTime() : 0;
      return timeB - timeA;
    });
}

/**
 * Export chat history as JSON
 * @param {string} chatChannel - Optional channel ID. If not provided, exports all chats
 * @returns {string} JSON string of chat data
 */
export function exportChatHistory(chatChannel = null) {
  try {
    if (chatChannel) {
      const messages = loadChatHistory(chatChannel);
      return JSON.stringify({ [chatChannel]: messages }, null, 2);
    } else {
      const allChats = getAllChats();
      return JSON.stringify(allChats, null, 2);
    }
  } catch (error) {
    console.error("Error exporting chat history:", error);
    return "{}";
  }
}

/**
 * Import chat history from JSON
 * @param {string} jsonData - JSON string containing chat data
 * @param {boolean} merge - If true, merge with existing data. If false, replace
 * @returns {boolean} True if import was successful
 */
export function importChatHistory(jsonData, merge = true) {
  try {
    const importedChats = JSON.parse(jsonData);
    
    if (merge) {
      const existingChats = getAllChats();
      const mergedChats = { ...existingChats, ...importedChats };
      localStorage.setItem("chatHistory", JSON.stringify(mergedChats));
    } else {
      localStorage.setItem("chatHistory", JSON.stringify(importedChats));
    }
    
    return true;
  } catch (error) {
    console.error("Error importing chat history:", error);
    return false;
  }
}