import api from "./api";

const infoService = {

    async getAll() {

        const { data } = await api.get("/attendance/info");

        return data;

    }

};

export default infoService;