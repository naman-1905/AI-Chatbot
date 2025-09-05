# Personal AI Chatbot

A locally-hosted AI chatbot with a frontend built using Next.js and Tailwind CSS, powered by Google Gemma's 1 Billion parameter model running on your discrete GPU.

## Features

- Fully local deployment – no cloud dependency.
- Responsive and modern frontend with Next.js and Tailwind CSS.
- Leverages Gemma 1B model for efficient and fast AI responses.
- Runs directly on your discrete GPU for optimal performance.
- Personalized using context data.

## Usage

- You can ask the AI about me via the frontend interface: [https://chat.halfskirmish.com](https://chat.halfskirmish.com)
- Designed for learning and personal projects.

## Tech Stack

- **Frontend:** Next.js, Tailwind CSS
- **AI Model:** Gemma 1 Billion parameters
- **Hardware:** Hosted on a personal secondary system running a GTX 1650

## Homescreen

![UI](/images/ui.png)
---

## New Chat and Greeting

- Integrated a Greeting API (/chat/greeting)
- The API gets called whenever a user starts a new chat
- A New Chat gets started whenever the user reloads the page
  
![New Chat](/images/greeting.png)
---

## Chat History

- Integrated the history API to fetch the history the data for the chat channels
(/chat/history)
- As a fallback, the chats are also stored in the localStorage, so as to reduce the load on the backend for API calls.

- API Request looks like this :-

```
{
  "admin": "string",
  "chat_channel": "string",
  "user_id": "string",
  "limit": 50
}
```

- Example API Response:-
```
{
  "success": true,
  "admin": "string",
  "chat_channel": "string",
  "user_id": "string",
  "total_messages": 0,
  "word_count": 0,
  "messages": []
}
```


   ![Chat History](/images/ChatHistory.png)
  ---

## Chat Channels

- A user can switch between two different chat channels with this feature, preserving the chat on a particular topic
  
<p align="center">
  <img src="/images/ChatChannel.png" alt="Chat History" />
</p>


---

## Delete Chat History
- Added a Delete feature which deletes all the messages in a particular chat channel

- Request URL
(/chat/history/{admin}/{user_id}/{chat_channel})

- This takes the admin name, user_id and chat_channel id and performs a DELETE Operation on all the messages of that chat_channel in the database.

- Example Response
```
{
  "success": true,
  "message": "Chat history cleared for naman:abc:abc",
  "data": {
    "admin": "naman",
    "user_id": "abc",
    "chat_channel": "abc_123",
    "messages_deleted": 0,
    "cleared_at": "2025-09-05T15:00:16.784292"
  }
}
```

<p align="center">
  <img src="/images/delete_feature.png" alt="Delete Chat" />
</p>

