import { useState, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export function usePickingApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('picking_jwt');
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }, []);

  const request = useCallback(async (path, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE_URL}${path}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          ...getHeaders(),
          ...options.headers,
        },
      });

      if (!response.ok) {
        let errMsg = `Request failed with status ${response.status}`;
        try {
          const data = await response.json();
          errMsg = data.message || data.error || errMsg;
        } catch {
          // ignore parsing error if response isn't JSON
        }
        throw new Error(errMsg);
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const json = await response.json();
        // If it's a standard JAX-RS success wrapper, unwrap it to return the inner data directly
        if (json && (json.status === 'OK' || json.statusDescription === 'OK' || json.statusCode === 200) && 'data' in json) {
          return json.data;
        }
        return json;
      }
      return null;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  const login = useCallback(async (username, password) => {
    // The standard rest-api endpoint for JWT is POST /rest/auth/token, which requires Basic Auth.
    const basicAuth = btoa(`${username}:${password}`);
    const data = await request('/rest/auth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
      },
    });
    if (data && (data.access_token || data.token)) {
      const token = data.access_token || data.token;
      localStorage.setItem('picking_jwt', token);
      return token;
    }
    throw new Error('Invalid token response from server');
  }, [request]);

  const logout = useCallback(() => {
    localStorage.removeItem('picking_jwt');
  }, []);

  const getOrdersToPick = useCallback(async (facilityId) => {
    const inParams = JSON.stringify({ facilityId });
    return await request(`/rest/services/getOrdersToPick?inParams=${encodeURIComponent(inParams)}`, {
      method: 'GET',
    });
  }, [request]);

  const createPicklist = useCallback(async (orderIds, facilityId) => {
    return await request('/rest/services/createPicklistFromOrders', {
      method: 'POST',
      body: JSON.stringify({ orderIdList: orderIds, facilityId }),
    });
  }, [request]);

  const getPicklistDetails = useCallback(async (picklistId) => {
    const inParams = JSON.stringify({ picklistId });
    return await request(`/rest/services/getPicklistDetails?inParams=${encodeURIComponent(inParams)}`, {
      method: 'GET',
    });
  }, [request]);

  const recordPick = useCallback(async (picklistBinId, orderItemSeqId, orderId, shipGroupSeqId, inventoryItemId, quantity) => {
    return await request('/rest/services/setPicklistItemToComplete', {
      method: 'POST',
      body: JSON.stringify({
        picklistBinId,
        orderItemSeqId,
        orderId,
        shipGroupSeqId,
        inventoryItemId,
        quantity,
      }),
    });
  }, [request]);

  return {
    loading,
    error,
    login,
    logout,
    getOrdersToPick,
    createPicklist,
    getPicklistDetails,
    recordPick,
  };
}
