module.exports = {
  DATABASE_URL: 'postgres://localhost:5432/fsg',
  SESSION_SECRET: 'Optimus Prime is my real dad',
  TWITTER: {
    consumerKey: 'ugk5XtFncrqnO2hTLXeR9PhHJ',
    consumerSecret: 'zT1hga3BSb5dJ9WZEwCVGgBxSIdyrXJK7qo5q3Bonv9TcyGklg',
    callbackUrl: 'http://127.0.0.1:1337/auth/twitter/callback'
  },
  FACEBOOK: {
    clientID: '1787699538172271',
    clientSecret: '54c61d4745e559c66a563b8a94665a37',
    callbackURL: 'http://127.0.0.1:1337/auth/facebook/callback'
  },
  GOOGLE: {
    clientID: '328797692357-565thbkg4cmn2brrjj11u9njb63jagc4.apps.googleusercontent.com',
    clientSecret: 'uoJOYb5168YVwH6BoJUiNEl0',
    callbackURL: 'http://127.0.0.1:1337/auth/google/callback'
  },
  LOGGING: true,
  NATIVE: true
};
