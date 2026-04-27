/**
 * Service to interact with the APG API.
 * Adapted from Laravel implementation to Next.js/TypeScript.
 */

// In-memory cache for the APG token
let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

const APG_CONFIG = {
  username: 'PPORT2_APG',
  password: 'Pp0rt@2099!',
  clientId: 'PPORT2-APG',
  baseUrl: 'https://apg.pupuk-indonesia.com',
};

/**
 * Generate Access Token for APG API
 */
export async function generateApgToken(): Promise<string> {
  // Check cache (with 1 minute buffer)
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }

  const url = `${APG_CONFIG.baseUrl}/generatetoken`;
  
  // Use URLSearchParams for form-data (equivalent to Laravel's asForm)
  const body = new URLSearchParams();
  body.append('grant_type', 'password');
  body.append('username', APG_CONFIG.username);
  body.append('password', APG_CONFIG.password);
  body.append('client_id', APG_CONFIG.clientId);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to generate token: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const { access_token, expires_in } = data;
    
    cachedToken = access_token;
    // expires_in is usually in seconds
    tokenExpiry = Date.now() + (expires_in * 1000);

    return access_token;
  } catch (error: any) {
    console.error("APG Token Generation Error:", error.message);
    throw new Error('Failed to generate APG token');
  }
}

/**
 * Fetch products from APG API
 */
export async function getProductsFromApg(params: any = {}): Promise<any[]> {
  const token = await generateApgToken();
  const url = `${APG_CONFIG.baseUrl}/mst.api/product/populatedataforcomboall`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch products: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("APG Fetch Products Error:", error.message);
    throw new Error('Failed to fetch products from APG');
  }
}

/**
 * Fetch warehouses (plants) from APG API
 */
export async function getWarehousesFromApg(params: any = {}): Promise<any[]> {
  const token = await generateApgToken();
  const url = `${APG_CONFIG.baseUrl}/mst.api/plant/PopulateData`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch warehouses: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("APG Fetch Warehouses Error:", error.message);
    throw new Error('Failed to fetch warehouses from APG');
  }
}
