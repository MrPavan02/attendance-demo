/**
 * API Configuration
 * Central configuration for all backend API calls
 */

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',,
  TIMEOUT: 30000, // 30 seconds
};

// API Endpoints
export const ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: `${API_CONFIG.BASE_URL}/auth/login`,
    REGISTER: `${API_CONFIG.BASE_URL}/auth/register`,
    ME: `${API_CONFIG.BASE_URL}/auth/me`,
    LOGOUT: `${API_CONFIG.BASE_URL}/auth/logout`,
    SETUP_PIN: `${API_CONFIG.BASE_URL}/auth/setup-pin`,
    VERIFY_PIN: `${API_CONFIG.BASE_URL}/auth/verify-pin`,
    DEVICE_PIN_STATUS: (employeeId: string, deviceId: string) => 
      `${API_CONFIG.BASE_URL}/auth/device-pin-status/${employeeId}/${deviceId}`,
  },
  
  // Attendance
  ATTENDANCE: {
    BASE: `${API_CONFIG.BASE_URL}/attendance`,
    CHECK_IN: `${API_CONFIG.BASE_URL}/attendance/check-in`,
    CHECK_OUT: `${API_CONFIG.BASE_URL}/attendance/check-out`,
    STATUS: (employeeId: string) => `${API_CONFIG.BASE_URL}/attendance/status/${employeeId}`,
    ENTRIES: `${API_CONFIG.BASE_URL}/attendance/entries`,
    LOCK: (date: string) => `${API_CONFIG.BASE_URL}/attendance/lock/${date}`,
  },
  
  // Employees
  EMPLOYEES: {
    LIST: `${API_CONFIG.BASE_URL}/employees`,
    BY_DEPARTMENT: (department: string) => `${API_CONFIG.BASE_URL}/employees/department/${department}`,
    BY_ID: (id: string) => `${API_CONFIG.BASE_URL}/employees/${id}`,
  },
  
  // Shifts
  SHIFTS: {
    LIST: `${API_CONFIG.BASE_URL}/shifts`,
    CREATE: `${API_CONFIG.BASE_URL}/shifts`,
    ASSIGN: `${API_CONFIG.BASE_URL}/shifts/assign`,
  },
  
  // Requests
  REQUESTS: {
    REGULARIZATION: `${API_CONFIG.BASE_URL}/requests/regularization`,
    SHIFT_CHANGE: `${API_CONFIG.BASE_URL}/requests/shift-change`,
    OVERTIME: `${API_CONFIG.BASE_URL}/requests/overtime`,
    PERMISSION: `${API_CONFIG.BASE_URL}/requests/permission`,
  },
  
  // Holidays
  HOLIDAYS: {
    LIST: `${API_CONFIG.BASE_URL}/holidays`,
    CREATE: `${API_CONFIG.BASE_URL}/holidays`,
    DELETE: (id: string) => `${API_CONFIG.BASE_URL}/holidays/${id}`,
  },
};

// Helper function to get authorization header
export const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Helper function to safely parse response as JSON
const parseJsonResponse = async (response: Response): Promise<any> => {
  const contentType = response.headers.get('content-type');
  
  // First check content-type header
  if (contentType && !contentType.includes('application/json')) {
    const text = await response.text();
    console.error(`[API Error] Expected JSON but got ${contentType}`);
    console.error(`[API Error] URL: ${response.url}`);
    console.error(`[API Error] Response preview: ${text.substring(0, 300)}`);
    
    if (contentType.includes('text/html')) {
      throw new Error(`Server returned HTML instead of JSON (Status: ${response.status}). Check if backend is running.`);
    }
    throw new Error(`Invalid response type: expected JSON but got ${contentType}`);
  }
  
  try {
    return await response.json();
  } catch (err: any) {
    // response.json() failed - likely HTML or invalid JSON
    try {
      const text = await response.clone().text();
      console.error('[API Error] Failed to parse response as JSON:', err);
      console.error('[API Error] Raw response:', text.substring(0, 300));
      
      // Check if it looks like HTML
      if (text.trim().startsWith('<')) {
        throw new Error(`Server returned HTML/XML instead of JSON (${response.status}): ${text.substring(0, 100).replace(/</g, '&lt;')}`);
      }
    } catch (textErr) {
      console.error('[API Error] Could not read response text:', textErr);
    }
    
    throw new Error('Server returned invalid JSON. Backend may have crashed.');
  }
};

// Helper function for API calls
export const apiCall = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (fetchErr: any) {
    console.error('[API Error] Fetch failed:', fetchErr);
    throw new Error(`Network error: ${fetchErr.message || 'Failed to reach server'}`);
  }

  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    
    // Try to parse error response as JSON first
    if (contentType?.includes('application/json')) {
      try {
        const error = await response.json();
        
        // Extract primary error message from various possible fields
        let errorMessage = error.detail || error.message || error.description;
        
        // Add nested details for better context
        let detailedMessage = errorMessage;
        
        if (error.details) {
          if (typeof error.details === 'string') {
            detailedMessage = errorMessage ? `${errorMessage}: ${error.details}` : error.details;
          } else if (error.details.reason) {
            detailedMessage = errorMessage ? `${errorMessage}: ${error.details.reason}` : error.details.reason;
          } else if (error.details.message) {
            detailedMessage = errorMessage ? `${errorMessage}: ${error.details.message}` : error.details.message;
          }
        }
        
        // Fallback to HTTP status
        if (!detailedMessage) {
          detailedMessage = `HTTP ${response.status}`;
        }
        
        throw new Error(detailedMessage);
      } catch (jsonErr: any) {
        // If JSON parse fails, check if it's an error we already threw
        if (jsonErr instanceof Error && jsonErr.message) {
          throw jsonErr;
        }
        // Otherwise it's a JSON parse error
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } else if (contentType?.includes('text/html')) {
      // Server returned HTML error page
      throw new Error(`Server error (${response.status}): Server returned HTML instead of JSON. Check if backend is running.`);
    } else {
      // Unknown content type in error response
      try {
        const text = await response.text();
        if (text.trim().startsWith('<')) {
          throw new Error(`Server error (${response.status}): Received HTML instead of JSON`);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (textErr: any) {
        if (textErr instanceof Error) {
          throw textErr;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }
  }

  return response;
};

export const safeParseJson = parseJsonResponse;
