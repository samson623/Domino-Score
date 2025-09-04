# Google Sign-In Setup Guide

This guide explains how to complete the Google Sign-In implementation for the Domino Score application.

## What's Been Implemented

✅ **Frontend Integration**
- Added Google Sign-In buttons to both login.html and signup.html
- Implemented client-side OAuth flow using Supabase Auth
- Added proper error handling and loading states
- Styled buttons with Google's official branding

✅ **Backend API**
- Created `/api/auth/google.ts` endpoint for handling OAuth callbacks
- Automatic user profile creation for new Google users
- Proper error handling and session management

## Required Configuration

To complete the setup, you need to configure Google OAuth in your Supabase project:

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure the OAuth consent screen:
   - Application name: "Domino Score"
   - User support email: Your email
   - Developer contact information: Your email
6. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Name: "Domino Score Web Client"
   - Authorized JavaScript origins:
     - `http://localhost:8000` (for development)
     - `https://domino-score-2hpufdk7q-dees-projects-6dbcda66.vercel.app` (for production)
     - `https://your-custom-domain.com` (if using custom domain)
   - Authorized redirect URIs:
     - `https://your-supabase-project.supabase.co/auth/v1/callback`
     - Note: The redirect URI should match your Supabase project URL exactly

### 2. Supabase Configuration

1. Go to your Supabase Dashboard
2. Navigate to Authentication → Providers
3. Enable Google provider
4. Add your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
5. Configure redirect URLs:
   - Add `http://localhost:8000/` for development
   - Add `https://domino-score-2hpufdk7q-dees-projects-6dbcda66.vercel.app/` for production
   - Add your custom domain if applicable

### 3. Environment Variables

Ensure your environment variables are properly set:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE=your_service_role_key
```

## How It Works

### Authentication Flow

1. **User clicks "Continue with Google"**
   - Frontend calls `supabase.auth.signInWithOAuth()`
   - User is redirected to Google's OAuth consent screen

2. **Google OAuth Process**
   - User grants permissions
   - Google redirects back to Supabase with authorization code
   - Supabase exchanges code for user tokens

3. **User Profile Creation**
   - If it's a new user, the system automatically creates a profile
   - Profile includes: username, full name, email, and avatar URL
   - Username is generated from Google display name or email

4. **Session Management**
   - User is automatically signed in
   - Session is managed by Supabase Auth
   - User is redirected to the main application

### Database Schema

The `user_profiles` table should include these fields for Google users:

```sql
- user_id (UUID, references auth.users)
- username (TEXT)
- full_name (TEXT)
- email (TEXT)
- avatar_url (TEXT) -- Google profile picture
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## Testing

1. **Development Testing**:
   - Start your local server: `python -m http.server 8000`
   - Navigate to `http://localhost:8000/login.html`
   - Click "Continue with Google"
   - Complete the OAuth flow

2. **Verify User Creation**:
   - Check Supabase Auth dashboard for new user
   - Verify user profile was created in `user_profiles` table
   - Confirm avatar URL and other Google data was saved

## Troubleshooting

### Common Issues

1. **"OAuth client not found" error**
   - Verify Google Client ID is correct in Supabase
   - Check that redirect URLs match exactly

2. **"Redirect URI mismatch" error**
   - Ensure redirect URLs in Google Console match Supabase callback URL
   - Format: `https://your-project.supabase.co/auth/v1/callback`

3. **User profile not created**
   - Check database permissions for `user_profiles` table
   - Verify the API endpoint is accessible
   - Check server logs for errors

4. **"Authentication not initialized" error**
   - Verify Supabase environment variables are set
   - Check that `/api/public-env` endpoint is working
   - Ensure Supabase client is properly initialized

## Security Considerations

- Never expose your Google Client Secret in frontend code
- Use HTTPS in production for OAuth redirects
- Validate user data from Google before saving to database
- Implement proper CORS settings for your domain
- Consider implementing rate limiting for auth endpoints

## Next Steps

1. Configure Google OAuth in Supabase Dashboard
2. Test the complete authentication flow
3. Deploy to production with proper HTTPS setup
4. Monitor authentication metrics and user feedback

---

**Note**: This implementation uses Supabase Auth's built-in OAuth handling, which provides secure token management and automatic session handling.