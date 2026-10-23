import api from "./api";

const leaderService = {
  getLeaveApprovals(status = "PENDING_SUPERVISOR") {
    return api.get("/leader/leave", {
      params: {
        status,
      },
    });
  },

  reject(id, note) {
    return api.patch(`/leader/leave/${id}/reject`, {
      note,
    });
  },

  getLeaveDetail(id) {
    return api.get(`/leader/leave/${id}`);
  },

  approve(id, note, deductLeave = false) {
    return api.patch(`/leader/leave/${id}/approve`, {
      note,
      deduct_leave: deductLeave,
    });
  },

  reject(id, note) {
    return api.patch(`/leader/leave/${id}/reject`, {
      note,
    });
  },
  getAttendanceEditDetail(id) {
    return api.get(`/leader/attendance/${id}`);
  },

  approveAttendanceEdit(id, note) {
    return api.patch(`/leader/attendance/${id}/approve`, {
      note,
    });
  },

  rejectAttendanceEdit(id, note) {
    return api.patch(`/leader/attendance/${id}/reject`, {
      note,
    });
  },
};

export default leaderService;
