# 🎲 Domino Score

A modern, feature-rich web application for tracking domino game scores with real-time gameplay, leaderboards, and premium features.

## 🌟 Features

### Core Functionality
- **Real-time Score Tracking**: Track scores for multiple players in real-time
- **Game History**: Complete history of all your domino games
- **Leaderboards**: Competitive rankings and statistics
- **Player Management**: Add, edit, and manage players
- **Team Support**: Create and manage teams for group play
- **Multiple Game Modes**: Support for various domino game types

### Premium Features
- **Advanced Analytics**: Detailed game statistics and insights
- **Export Functionality**: Export game data and reports
- **Custom Game Rules**: Configure custom scoring rules
- **Priority Support**: Get help when you need it

### Technical Features
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Dark Mode**: Toggle between light and dark themes
- **Offline Support**: Continue playing even without internet
- **Real-time Sync**: Automatic synchronization across devices
- **Secure Authentication**: User accounts with secure login

## 🚀 Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn package manager
- Supabase account (for backend services)
- Stripe account (for payment processing, optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/samson623/Domino-Score.git
   cd Domino-Score
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Copy the environment sample file:
   ```bash
   cp env-sample.txt .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE=your_supabase_service_role_key
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Stripe Configuration (Optional)
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   ```

4. **Database Setup**
   
   Run the database schema in your Supabase project:
   ```sql
   -- Execute the contents of database/schema.sql in your Supabase SQL editor
   ```

5. **Development Server**
   ```bash
   # For local development
   npx vercel dev
   
   # Or serve the static files
   npx serve .
   ```

6. **Open your browser**
   
   Navigate to `http://localhost:3000` (or the port shown in your terminal)

## 📖 Usage

### Getting Started with Your First Game

1. **Sign Up/Sign In**
   - Create an account or sign in to an existing one
   - Your games and scores will be saved to your account

2. **Add Players**
   - Navigate to the "Players" section
   - Add the players who will be participating in your game

3. **Start a New Game**
   - Click "New Game" from the home screen
   - Select your players and game type
   - Begin tracking scores in real-time

4. **Track Scores**
   - Use the intuitive score input interface
   - Scores are automatically saved and synchronized
   - View live leaderboards during gameplay

5. **Review Game History**
   - Access complete game history in the "History" section
   - View detailed statistics and analytics
   - Export game data for external analysis

### Advanced Features

- **Teams**: Create teams for group competitions
- **Custom Rules**: Configure scoring rules for different game variants
- **Analytics**: View detailed performance metrics and trends
- **Export**: Download game data in various formats

## 🛠️ Development

### Project Structure

```
Domino-Score/
├── api/                    # Vercel serverless functions
│   ├── auth/              # Authentication endpoints
│   ├── games/             # Game management endpoints
│   └── users/             # User management endpoints
├── database/              # Database schema and migrations
├── public/                # Static assets
├── index.html             # Main application file
├── login.html             # Login page
├── signup.html            # Registration page
├── package.json           # Dependencies and scripts
├── vercel.json            # Vercel deployment configuration
└── README.md              # This file
```

### Technology Stack

- **Frontend**: HTML5, CSS3 (Tailwind CSS), Vanilla JavaScript
- **Backend**: Vercel Serverless Functions (Node.js/TypeScript)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe (optional)
- **Deployment**: Vercel
- **Charts**: Chart.js
- **Icons**: Font Awesome

### API Endpoints

- `POST /api/auth/login` - User authentication
- `POST /api/auth/signup` - User registration
- `GET /api/auth/session` - Get current user session
- `GET /api/games` - List user's games
- `POST /api/games` - Create new game
- `GET /api/games/[id]` - Get specific game
- `PUT /api/games/[id]` - Update game
- `GET /api/leaderboard` - Get leaderboard data
- `GET /api/users/profile` - Get user profile

### Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed
4. **Commit your changes**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
5. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Open a Pull Request**

### Code Style Guidelines

- Use meaningful variable and function names
- Comment complex logic
- Follow existing indentation and formatting
- Use TypeScript for API endpoints
- Ensure responsive design for all new UI components

### Testing

```bash
# Run tests (when available)
npm test

# Run linting
npm run lint
```

## 🚀 Deployment

### Vercel Deployment

1. **Connect to Vercel**
   ```bash
   npx vercel
   ```

2. **Configure Environment Variables**
   - Add all environment variables in the Vercel dashboard
   - Ensure Supabase and Stripe configurations are correct

3. **Deploy**
   ```bash
   npx vercel --prod
   ```

### Manual Deployment

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy to your hosting provider**
   - Upload the built files to your web server
   - Configure environment variables
   - Set up SSL certificate

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🔒 Security

- All user data is encrypted in transit and at rest
- Authentication is handled securely through Supabase
- Payment processing is secured through Stripe
- Regular security updates and monitoring

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🤝 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs and request features via GitHub Issues
- **Community**: Join our community discussions
- **Premium Support**: Available for Pro subscribers

## 🙏 Acknowledgments

- Thanks to all contributors who have helped improve this project
- Built with amazing open-source libraries and tools
- Special thanks to the domino gaming community for feedback and suggestions

## 📊 Project Status

- ✅ Core functionality complete
- ✅ Authentication system
- ✅ Real-time score tracking
- ✅ Responsive design
- ✅ Payment integration
- 🔄 Advanced analytics (in progress)
- 📋 Mobile app (planned)

---

**Made with ❤️ for domino enthusiasts worldwide**

For more information, visit our [website](https://domino-score.vercel.app) or check out the [live demo](https://domino-score.vercel.app).