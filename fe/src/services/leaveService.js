import api from "./api";

export default {
  create(formData) {
    return api.post("/leave", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  history() {
    return api.get("/leave/history");
  },
};
