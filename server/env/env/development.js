module.exports = {
  DATABASE_URL: 'postgres://localhost:5432/fsg',
  SESSION_SECRET: 'Darth Vader is my real dad',
  TWITTER: {
    consumerKey: 'this is not a consumerKey',
    consumerSecret: 'this is not a consumerSecret',
    callbackUrl: 'http://127.0.0.1:1337/auth/twitter/callback'
  },
  FACEBOOK: {
    clientID: 'this is not a clientID',
    clientSecret: 'this is not a clientSecret',
    callbackURL: 'http://127.0.0.1:1337/auth/facebook/callback'
  },
  GOOGLE: {
    clientID: 'this is not a clientID',
    clientSecret: 'this is not a clientSecret',
    callbackURL: 'http://127.0.0.1:1337/auth/google/callback'
  },
  LOGGING: true,
  NATIVE: true
};