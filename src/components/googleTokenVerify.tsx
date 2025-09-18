export async function verifyAccessToken(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const tokenInfo = await response.json();
      console.log('Token válido:', tokenInfo);
      return true;
    }
    
    return false;
  } catch (error) {
    return false;
  }
}
