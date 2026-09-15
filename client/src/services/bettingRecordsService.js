import api from "../Components/axios/axios";

const getBettingRecords = (params) => {
  return api.get("/api/betting-records", { params });
};

const getBettingRecordDetails = (params) => {
  return api.get("/api/betting-records/details", { params });
};

export default {
  getBettingRecords,
  getBettingRecordDetails,
};
