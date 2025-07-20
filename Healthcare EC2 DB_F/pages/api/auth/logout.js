// pages/api/auth/logout.js
import cookie from 'cookie';

export default function handler(req, res) {
  const COGNITO_DOMAIN = process.env.COGNITO_DOMAIN;
  const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID;
  const LOGOUT_URI = process.env.LOGOUT_URI || 'http://localhost:3000/';

  const isProd = process.env.NODE_ENV === 'production';

  // Clear the cookies first
  res.setHeader('Set-Cookie', [
    cookie.serialize('id_token', '', {
      httpOnly: true,
      secure: isProd,
      path: '/',
      expires: new Date(0),
    }),
    cookie.serialize('access_token', '', {
      httpOnly: true,
      secure: isProd,
      path: '/',
      expires: new Date(0),
    }),
  ]);

  // Redirect to Cognito hosted logout
  const cognitoLogoutUrl = `${COGNITO_DOMAIN}/logout?client_id=${COGNITO_CLIENT_ID}&logout_uri=${encodeURIComponent(LOGOUT_URI)}`;

  res.writeHead(302, { Location: cognitoLogoutUrl });
  res.end();
}
