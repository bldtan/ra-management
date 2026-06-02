import axios from 'axios';
import { toast } from 'sonner';

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
});

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const status = error.response?.status;
    const message: string = error.response?.data?.error ?? 'Something went wrong';
    if (status === 401) {
      if (onUnauthorized) onUnauthorized();
    } else if (status && status >= 400) {
      // Errors: no auto-dismiss (SPEC §22).
      toast.error(message, { duration: Infinity });
    }
    return Promise.reject(error);
  },
);
