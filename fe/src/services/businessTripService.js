import api from "./api";

const businessTripService = {
  getContext: () => api.get("/business-trips/me/context"),

  create: (payload) => api.post("/business-trips", payload),

  history: () => api.get("/business-trips/history/me"),

  dashboard: () => api.get("/business-trips/dashboard/summary"),

  getBalance: () => api.get("/business-trips/balance/me"),

  // Manager Approval
  getManagerApprovals: () => api.get("/business-trips/approvals/manager"),

  getApprovalDetail: (id) => api.get(`/business-trips/approvals/${id}`),

  managerAction: (id, payload) =>
    api.post(`/business-trips/approvals/${id}/manager-action`, payload),

  submitSettlement: (id, payload) =>
    api.post(`/business-trips/${id}/settlement`, payload),

  uploadAttachments: (id, formData) =>
    api.post(`/business-trips/${id}/attachments`, formData),

  getAttachments: (id) => api.get(`/business-trips/${id}/attachments`),
  // HR Approval
  getHRApprovals: () => api.get("/business-trips/approvals/hr"),

  hrAction: (id, payload) =>
    api.post(`/business-trips/approvals/${id}/hr-action`, payload),

  // Director Approval
  getDirectorApprovals: () => api.get("/business-trips/approvals/director"),

  directorAction: (id, payload) =>
    api.post(`/business-trips/approvals/${id}/director-action`, payload),
};

export default businessTripService;
