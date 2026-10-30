import api from "./api";

const attendanceService = {
  getToday: async () => {
    const { data } = await api.get("/attendance/today");
    return data;
  },

  checkIn: async (formData) => {
    const start = performance.now();

    try {
      const { data } = await api.post("/attendance/checkin", formData, {
        headers: {
          "Content-Type": undefined,
        },
      });

      const duration = ((performance.now() - start) / 1000).toFixed(2);

      console.log(`✅ CHECK-IN API: ${duration} detik`);

      return data;
    } catch (error) {
      console.error(
        "CHECK-IN ERROR DETAIL:",
        JSON.stringify(
          {
            message: error.message,
            status: error.response?.status,
            response: error.response?.data,
            code: error.code,
            url: error.config?.url,
            method: error.config?.method,
          },
          null,
          2,
        ),
      );

      const duration = ((performance.now() - start) / 1000).toFixed(2);

      console.error(`❌ CHECK-IN API failed after ${duration} seconds`);

      throw error;
    }
  },

  checkOut: async (formData) => {
    const { data } = await api.post("/attendance/checkout", formData, {
      headers: {
        "Content-Type": undefined,
      },
    });

    return data;
  },

  getHistory: async () => {
    const { data } = await api.get("/attendance/history");

    return data;
  },

  getSummary: async (params) => {
    const { data } = await api.get("/attendance/summary", {
      params,
    });

    return data;
  },
  getEmployeeAttendance: async (id, month, year) => {
    const { data } = await api.get(
      `/attendance/employee/${id}?month=${month}&year=${year}`,
    );

    return data;
  },
  getDailyAttendance: async (params) => {
    const { data } = await api.get("/attendance/daily", {
      params,
    });

    return data;
  },
  getDepartments: async () => {
    const { data } = await api.get("/attendance/departments");

    return data;
  },
  getEmployeeOfMonth: async () => {
    const { data } = await api.get("/attendance/employee-of-month");
    return data;
  },
  getAttendanceSummary: async (params) => {
    const { data } = await api.get("/attendance/attendance-summary", {
      params,
    });

    return data;
  },
  getEmployees: async () => {
    const { data } = await api.get("/auth/employees");

    return data;
  },
  getRoles: async () => {
    const response = await api.get("/auth/roles");
    return response.data;
  },
  createEmployee: async (formData) => {
    const { data } = await api.post("/auth/employees", formData);
    return data;
  },

  updateEmployee: async (id, formData) => {
    const { data } = await api.put(`/auth/employees/${id}`, formData);
    return data;
  },
  deactivateEmployee: async (id) => {
    const { data } = await api.patch(`/auth/employees/${id}/deactivate`);

    return data;
  },
  activateEmployee: async (id) => {
    const { data } = await api.patch(`/auth/employees/${id}/activate`);

    return data;
  },
  createEditRequest: async (payload) => {
    const { data } = await api.post("/attendance/edit-request", payload);

    return data;
  },
};

export default attendanceService;
