import api from "./api";

const announcementService = {

    // Untuk dashboard HR
    getAll: async () => {
        const { data } =
            await api.get("/announcements");

        return data;
    },

    create: async (formData) => {

        const { data } =
            await api.post(
                "/announcements",
                formData,
                {
                    headers: {
                        "Content-Type":
                            "multipart/form-data",
                    },
                }
            );

        return data;
    },

    // Untuk slider aplikasi karyawan
    getActive: async () => {
        const { data } =
            await api.get(
                "/announcements/active"
            );

        return data;
    },

    updateStatus: async (id, is_active) => {
        const { data } = await api.patch(
            `/announcements/${id}/status`,
            { is_active }
        );

        return data;
    },

};

export default announcementService;