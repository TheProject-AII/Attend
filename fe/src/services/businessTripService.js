import api from "./api";

const businessTripService = {
  getContext: () => api.get("/business-trips/me/context"),

  create: (payload) => api.post("/business-trips", payload),

  history: () => api.get("/business-trips/history/me"),

  dashboard: () => api.get("/business-trips/dashboard/summary"),

  getBalance: () => api.get("/business-trips/balance/me"),

  submitSettlement: (id, payload) =>
    api.post(`/business-trips/${id}/settlement`, payload),

  uploadAttachments: (id, formData) =>
    api.post(`/business-trips/${id}/attachments`, formData),

  getAttachments: (id) => api.get(`/business-trips/${id}/attachments`),
};

export default businessTripService;
