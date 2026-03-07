const ACCESS = "cortex_access";
const REFRESH = "cortex_refresh";

export const tokens = {
  getAccess: () => localStorage.getItem(ACCESS) || "",
  getRefresh: () => localStorage.getItem(REFRESH) || "",
  set: ({ access_token, refresh_token }) => {
    if (access_token) localStorage.setItem(ACCESS, access_token);
    if (refresh_token) localStorage.setItem(REFRESH, refresh_token);
  },
  clear: () => {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  },
};