import api from "./api";

const dashboardService = {
  getDashboard: async (period = 7) => {
    const { data } = await api.get(`/dashboard/admin?period=${period}`);

    return data;
  },
};

export default dashboardService;
