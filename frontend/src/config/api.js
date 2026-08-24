const configuredApiUrl = import.meta.env.VITE_API_URL;

export const API_BASE_URL = configuredApiUrl
  ? configuredApiUrl.replace(/\/$/, '')
  : '/api';

export const API_ORIGIN = new URL(API_BASE_URL, window.location.origin).origin;

export const websocketUrl = (path) => {
  const { protocol, host } = new URL(API_BASE_URL, window.location.origin);
  const websocketProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  return `${websocketProtocol}//${host}${path}`;
};