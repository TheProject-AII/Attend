import api from "./api";

const officeService = {

    async getOffice() {

        const { data } =
            await api.get("/office/current");

        return data.data;

    }

};

export default officeService;