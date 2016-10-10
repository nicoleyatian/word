module.exports = {
  DATABASE_URL: 'postgres://localhost:5432/fsg',
  SESSION_SECRET: 'Darth Vader is my real dad',
  TWITTER: {
    consumerKey: '',
    consumerSecret: '',
    callbackUrl: 'http://127.0.0.1:1337/auth/twitter/callback'
  },
  FACEBOOK: {
    clientID: '',
    clientSecret: '',
    callbackURL: 'http://127.0.0.1:1337/auth/facebook/callback'
  },
  GOOGLE: {
    clientID: '',
    clientSecret: '',
    callbackURL: 'http://127.0.0.1:1337/auth/google/callback'
  },
  LOGGING: true,
  NATIVE: true
};
