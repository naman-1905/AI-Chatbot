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
- Integrated a Greeting API (/greeting)
- The API gets called whenever a user starts a new chat
- A New Chat gets started whenever the user reloads the page
  
![New Chat](/images/greeting.png)
---

## Chat History

- Added Chat Channels to locally store the data for the chat channels

   ![Chat History](/images/ChatHistory.png)
  ---
- A user can switch between two different chat channels with this feature, preserving the chat on a particular topic
  
<p align="center">
  <img src="/images/ChatChannel.png" alt="Chat History" />
</p>

