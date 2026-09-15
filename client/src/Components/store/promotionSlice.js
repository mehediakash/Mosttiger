import { createSlice } from "@reduxjs/toolkit";

const LS_KEY = "betting_app_selected_promotion_v1";

const loadSavedPromotion = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};

const savePromotion = (promotion) => {
  try {
    if (promotion) {
      localStorage.setItem(LS_KEY, JSON.stringify(promotion));
    } else {
      localStorage.removeItem(LS_KEY);
    }
  } catch (error) {
    // ignore storage errors
  }
};

const promotionSlice = createSlice({
  name: "promotionSelection",
  initialState: {
    selectedPromotion: loadSavedPromotion(),
  },
  reducers: {
    setSelectedPromotion: (state, action) => {
      state.selectedPromotion = action.payload || null;
      savePromotion(state.selectedPromotion);
    },
    clearSelectedPromotion: (state) => {
      state.selectedPromotion = null;
      savePromotion(null);
    },
  },
});

export const { setSelectedPromotion, clearSelectedPromotion } =
  promotionSlice.actions;
export default promotionSlice.reducer;
