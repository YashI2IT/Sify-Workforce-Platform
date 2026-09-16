/**
 * authService.ts
 *
 * Frontend integration with the company UMS (User Management Service).
 *
 * CONFIRMED CONTRACT (2026-09-16 — live UMS diagnostic):
 *   UMS base: https://apidev.sifymodernization.digital/user-mgt/api
 *   AppId header: x-app-id: Project-Management
 *
 *   POST /user/login
 *   Request: { email, password }
 *   Response: {
 *     data: {
 *       accessToken: string,
 *       refreshToken: string,
 *       idToken: string,        // Keycloak ID token (RS256 signed)
 *       expiresIn: number,      // seconds (300 = 5 min)
 *       user: {
 *         id: string,           // UMS user UUID (= Keycloak sub claim)
 *         email: string,
 *         firstName: string,
 *         lastName: string,
 *         username: string,
 *         role: object,         // UMS role object — empty {} until assigned
 *       },
 *       app: {
 *         appId: string,        // "Project-Management"
 *         appName: string,
 *         provider: string,     // "keycloak"
 *       }
 *     }
 *   }
 *
 *   POST /user/validate-token (Authorization: Bearer <accessToken>)
 *   Response: {
 *     data: {
 *       valid: boolean,
 *       user: { id, email, username, role, template },
 *       token: { issuer, subject, issuedAt, expiresAt },
 *       app: { appId, appName, provider }
 *     }
 *   }
 *
 * Keycloak:
 *   Host: http://1.6.37.35/keycloak
 *   Realm: Project-Management
 *   Issuer: http://1.6.37.35/keycloak/realms/Project-Management
 *   Audience: Project-Management
 *   Algorithm: RS256
 *   JWKS: http://1.6.37.35/keycloak/realms/Project-Management/protocol/openid-connect/certs
 */

import { apiClient } from '../lib/apiClient';
import { authStorage } from '../lib/authUtils';

export interface UmsUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  role: Record<string, unknown>;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  email: string;
  username: string;
}

function extractLoginResult(responseData: any): LoginResult {
  // Response shape: { data: { accessToken, refreshToken, expiresIn, user: { id, email, ... } } }
  const d = responseData?.data;
  if (!d || !d.accessToken) {
    throw new Error('UMS login response missing data.accessToken. Check UMS endpoint and x-app-id header.');
  }
  return {
    accessToken: d.accessToken,
    refreshToken: d.refreshToken || '',
    expiresIn: d.expiresIn || 300,
    userId: d.user?.id || '',
    email: d.user?.email || '',
    username: d.user?.username || '',
  };
}

export const authService = {
  register: async (credentials: { email: string; password: string; username: string }): Promise<void> => {
    await apiClient('/user/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }, true /* useAuthService */);
  },

  login: async (credentials: { email: string; password: string }): Promise<LoginResult> => {
    const response = await apiClient('/user/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }, true /* useAuthService */);
    return extractLoginResult(response);
  },

  refreshToken: async (refreshToken: string): Promise<LoginResult> => {
    const response = await apiClient('/user/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }, true);
    return extractLoginResult(response);
  },

  logout: async (refreshToken: string): Promise<void> => {
    await apiClient('/user/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }, true);
  },

  /**
   * Validate the stored access token via UMS.
   * Used by the backend guard — NOT called client-side normally.
   * Provided here for reference and potential frontend session check.
   */
  validateToken: async (accessToken: string): Promise<boolean> => {
    try {
      const response = await apiClient('/user/validate-token', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      }, true);
      return response?.data?.valid === true;
    } catch {
      return false;
    }
  },

  /**
   * Attempt to restore a valid session from stored tokens.
   * Returns LoginResult if token is still valid, null otherwise.
   */
  restoreSession: async (): Promise<LoginResult | null> => {
    const accessToken = authStorage.getAccessToken();
    const refreshTokenVal = authStorage.getRefreshToken();
    if (!accessToken) return null;

    try {
      const valid = await authService.validateToken(accessToken);
      if (valid) {
        // Token still valid — reconstruct a minimal LoginResult
        // (we don't have user fields without re-validating, but that's fine)
        return {
          accessToken,
          refreshToken: refreshTokenVal || '',
          expiresIn: 0,
          userId: '',
          email: '',
          username: '',
        };
      }
    } catch {
      // Token expired — try refresh
    }

    if (refreshTokenVal) {
      try {
        return await authService.refreshToken(refreshTokenVal);
      } catch {
        return null;
      }
    }
    return null;
  },
};
