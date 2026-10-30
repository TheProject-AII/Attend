import api from "./api";

const authService = {
  login: async (email, password) => {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    console.log("[LOGIN] status:", response.status);
    console.log("[LOGIN] content-type:", response.headers["content-type"]);
    console.log(
      "[LOGIN] response:",
      typeof response.data === "string"
        ? response.data.slice(0, 300)
        : response.data,
    );

    return response.data;
  },

  logout: async (token) => {
    const response = await api.post(
      "/auth/logout",
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return response.data;
  },

  getMe: async (token) => {
    const response = await api.get("/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  },
  getHRGALeader: async () => {
    const response = await api.get("/auth/hrga-leader");
    return response.data;
  },
  forgotPassword: async (email, nik_last4) => {
    const response = await api.post("/auth/forgot-password", {
      email,
      nik_last4,
    });

    return response.data;
  },

  resetPassword: async (token, password, password_confirmation) => {
    const response = await api.post("/auth/reset-password", {
      token,
      password,
      password_confirmation,
    });

    return response.data;
  },
  changePassword: async (current_password, new_password, confirm_password) => {
    const response = await api.post("/auth/change-password", {
      current_password,
      new_password,
      confirm_password,
    });

    return response.data;
  },
};

export default authService;
