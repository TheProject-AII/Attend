import api from "./api";

const authService = {
  login: async (email, password) => {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

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
};

export default authService;
