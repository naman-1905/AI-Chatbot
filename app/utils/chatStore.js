export function saveChatHistory(chatChannel, messages) {
  if (!chatChannel) return;
  const chats = JSON.parse(localStorage.getItem("chatHistories") || "{}");
  chats[chatChannel] = messages;
  localStorage.setItem("chatHistories", JSON.stringify(chats));
}

export function loadChatHistory(chatChannel) {
  const chats = JSON.parse(localStorage.getItem("chatHistories") || "{}");
  return chats[chatChannel] || [];
}

export function getAllChats() {
  return JSON.parse(localStorage.getItem("chatHistories") || "{}");
}