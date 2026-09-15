import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import promotionReducer from "./promotionSlice";
import casinoGameReducer from "./casinoGameSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    promotionSelection: promotionReducer,
    casinoGame: casinoGameReducer,
  },
});

export default store;
