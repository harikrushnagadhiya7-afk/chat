
# Chat Together

## Overview

Chat Together is a production-ready, real-time chat web application designed to run entirely on GitHub Pages without any server infrastructure. The application provides instant messaging capabilities using client-side JavaScript and third-party real-time messaging services. It features room-based chat, user presence indicators, typing notifications, and basic moderation tools, all while maintaining a simple, accessible user interface that works across devices.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The application follows a single-page application (SPA) pattern built with vanilla JavaScript, HTML, and CSS. The architecture centers around a main `ChatApp` class that manages all application state and interactions. Key design decisions include:

- **No build tools or frameworks**: Pure HTML/CSS/JavaScript for maximum simplicity and deployment ease
- **Component-based structure**: All functionality encapsulated in a single ChatApp class with clear method separation
- **Event-driven architecture**: DOM events and real-time message events drive all user interactions
- **Client-side routing**: URL fragments (#room=roomname) determine chat room without requiring server routing
- **Responsive design**: Mobile-first CSS with desktop enhancements using CSS Grid and Flexbox

### Real-time Messaging System
The application uses Ably Realtime as the primary pub/sub messaging service, with the architecture designed to potentially support Pusher Channels as an alternative:

- **Channel-based messaging**: Each chat room corresponds to an Ably channel for message isolation
- **Presence system**: Built-in user presence tracking shows online user counts and status
- **Typing indicators**: Debounced typing events prevent spam while providing real-time feedback
- **Message broadcasting**: All messages are published to the room channel and received by all connected clients

### Data Storage Strategy
The application deliberately avoids persistent data storage:

- **No message persistence**: Messages exist only during active sessions and disappear on refresh
- **Local storage only**: Username and user preferences stored in browser localStorage
- **Stateless design**: No server-side state management required
- **Session-based presence**: User presence tied to active WebSocket connections

### Security and Moderation
Basic client-side security measures are implemented:

- **Rate limiting**: Prevents message spam with configurable limits per time window
- **Profanity filtering**: Simple word list-based filter for inappropriate content
- **Input validation**: Message length limits and basic sanitization
- **Client-side only**: Security relies on API key restrictions rather than server validation

### Accessibility and User Experience
The application follows web accessibility standards:

- **ARIA roles and labels**: Proper semantic markup for screen readers
- **Keyboard navigation**: Full keyboard support including Enter to send messages
- **Theme support**: Automatic dark/light mode detection with manual override
- **Responsive layout**: Optimized for mobile and desktop viewing
- **High contrast support**: Color choices meet WCAG guidelines

## External Dependencies

### Real-time Messaging Service
- **Ably Realtime**: Primary WebSocket-based pub/sub messaging service
  - Provides real-time message delivery, presence, and typing indicators
  - Requires API key configuration for channel access
  - CDN delivery via `https://cdn.ably.com/lib/ably.min-1.js`
  - Free tier supports the application's requirements

### Deployment Platform
- **GitHub Pages**: Static site hosting platform
  - Serves HTML, CSS, and JavaScript files directly
  - Supports custom domains and HTTPS
  - No server configuration required
  - Integrates with GitHub repository for easy updates

### Browser APIs
- **localStorage**: For persisting username and user preferences
- **URL API**: For room-based routing using URL fragments
- **WebSocket**: Underlying protocol used by Ably for real-time connections
- **Intersection Observer**: For potential message scroll optimization
- **matchMedia**: For automatic dark/light theme detection

### Optional Integrations
- **Pusher Channels**: Alternative to Ably for real-time messaging
- **Custom CDN**: For serving static assets if needed
- **Analytics services**: Can be added via script tags for usage tracking
