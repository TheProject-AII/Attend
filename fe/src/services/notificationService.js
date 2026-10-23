import api from "./api";

const notificationService = {
  getBadge() {
    return api.get("/notification/badge");
  },
  readPending() {
    return api.patch("/notification/read-pending");
  },
  readResult() {
    return api.patch("/notification/read-result");
  },
};

export default notificationService;
