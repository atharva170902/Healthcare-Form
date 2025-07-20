// pages/api/auth/callback.js
import axios from 'axios';
import cookie from 'cookie';

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  try {
    const cognitoDomain = process.env.COGNITO_DOMAIN;
    const redirectUri = process.env.CALLBACK_URI;
    const clientId = process.env.COGNITO_CLIENT_ID;

    console.log('In api/auth/callback.js Authorization Code:', code);
      console.log('In api/auth/callback.js Cognito Domain:', cognitoDomain);
      console.log('In api/auth/callback.js Redirect URI:', redirectUri);

    const tokenRes = await axios.post(
      `${cognitoDomain}/oauth2/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        code,
        redirect_uri: redirectUri,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { id_token, access_token } = tokenRes.data;

    // Set cookies
    res.setHeader('Set-Cookie', [
      cookie.serialize('id_token', id_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'Lax',
      }),
      cookie.serialize('access_token', access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'Lax',
      }),
    ]);

    return res.redirect('/auth/success');

  } catch (error) {
    console.error('Token exchange failed:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to exchange token' });
  }
}
