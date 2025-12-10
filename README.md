
# Chat Together

A simple, production-ready real-time chat web application that runs entirely on GitHub Pages. No server code required - just pure HTML, CSS, and vanilla JavaScript with Ably Realtime for pub/sub messaging.

## Features

- 🚀 **Real-time messaging** - Instant message delivery using Ably Realtime
- 👥 **Room-based chat** - Create and join different chat rooms via URL
- 🟢 **Online presence** - See who's currently in the room
- ⌨️ **Typing indicators** - See when others are typing
- 📱 **Responsive design** - Works great on mobile and desktop
- 🌙 **Dark/light theme** - Automatic theme switching with manual override
- ♿ **Accessible** - ARIA roles, keyboard navigation, high contrast support
- 🛡️ **Basic moderation** - Client-side profanity filter and rate limiting
- 💾 **No persistence** - Messages don't persist after refresh (by design)

## How It Works

This is a client-side only application that uses:
- **Ably Realtime** for real-time pub/sub messaging and presence
- **localStorage** for username and settings
- **URL fragments** for room routing (`/#room=roomname`)

No database, no server code, no build tools - just open `index.html` in a browser!

## Contributing

This is a simple project perfect for learning! Feel free to:

- Add emoji reactions
- Implement message replies
- Add file/image sharing
- Create user avatars
- Add sound notifications
- Implement message history

## License

MIT License - feel free to use this code for any purpose.

## Support

- [Ably Documentation](https://ably.com/docs)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)

---

Built with ❤️ using vanilla JavaScript and Ably Realtime.
