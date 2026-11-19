import api from "./api";

const paySlipService = {
  getAvailablePeriods: () => api.get("/payroll/pay-slip/available-periods"),
  getMyRequests: () => api.get("/payroll/pay-slip/my-requests"),
  createRequest: (payload) => api.post("/payroll/pay-slip/requests", payload),
  downloadSlip: (requestId) =>
    api.get(`/payroll/pay-slip/requests/${requestId}/download`, {
      responseType: "blob",
    }),
};

export default paySlipService;
