// src/Components/store/authSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../axios/axios";

// LocalStorage Key
const LS_KEY = "betting_app_auth_v1";

// Temporary user id for OTP flow
const TEMP_UID_KEY = "betting_app_temp_user_v1";

// Load saved auth data
const saved = (() => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : { user: null, token: null };
  } catch (e) {
    return { user: null, token: null };
  }
})();

// Load saved temporary user id (used for OTP verification)
const savedTempUserId = (() => {
  try {
    return localStorage.getItem(TEMP_UID_KEY) || null;
  } catch (e) {
    return null;
  }
})();

// ================================
// LOGIN USER
// ================================
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ username, password, rememberMe }, { rejectWithValue }) => {
    try {
      const res = await api.post("/api/auth/login", {
        username,
        password,
        rememberMe,
      });
      const { token, user } = res.data;
      localStorage.setItem(LS_KEY, JSON.stringify({ user, token }));
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Login failed");
    }
  },
);

// ================================
// REGISTER USER
// ================================
export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post("/api/auth/register", payload);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  },
);

// ================================
// FORGOT PASSWORD
// ================================
export const forgotPassword = createAsyncThunk(
  "auth/forgotPassword",
  async ({ email }, { rejectWithValue }) => {
    try {
      const res = await api.post("/api/auth/forgot-password", { email });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Something went wrong");
    }
  },
);

// ================================
// RESET PASSWORD
// ================================
export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async (
    { userId, otp, newPassword, confirmPassword },
    { rejectWithValue },
  ) => {
    try {
      const res = await api.post("/api/auth/reset-password", {
        userId,
        otp,
        newPassword,
        confirmPassword,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Something went wrong");
    }
  },
);

// ================================
// VERIFY OTP
// ================================
export const verifyOtp = createAsyncThunk(
  "auth/verifyOtp",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post("/api/auth/verify-otp", payload);
      const { token, user } = res.data;
      localStorage.setItem(LS_KEY, JSON.stringify({ user, token }));
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  },
);

// ================================
// FETCH PROFILE
// ================================
export const fetchProfile = createAsyncThunk(
  "auth/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/api/users/profile");
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Failed to fetch profile");
    }
  },
);

// ================================
// UPDATE PROFILE
// ================================
export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.patch("/api/users/profile", payload);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Failed to update profile");
    }
  },
);

// ================================
// SLICE
// ================================
const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: saved.user,
    token: saved.token,
    tempUserId: savedTempUserId,
    status: "idle",
    loading: false,
    error: null,
    message: null,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.status = "idle";
      state.loading = false;
      state.error = null;
      localStorage.removeItem(LS_KEY);
    },
    setToken: (state, action) => {
      state.token = action.payload;
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({
          user: state.user ?? saved.user,
          token: action.payload,
        }),
      );
    },
    setTempUserId: (state, action) => {
      state.tempUserId = action.payload;
      try {
        localStorage.setItem(TEMP_UID_KEY, String(action.payload));
      } catch (e) {}
    },
    clearTempUserId: (state) => {
      state.tempUserId = null;
      try {
        localStorage.removeItem(TEMP_UID_KEY);
      } catch (e) {}
    },
  },
  extraReducers: (builder) => {
    builder
      // LOGIN
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.loading = false;
        state.error = action.payload;
      })

      // REGISTER
      .addCase(registerUser.pending, (state) => {
        state.status = "loading";
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.status = "succeeded";
        state.loading = false;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = "failed";
        state.loading = false;
        state.error = action.payload;
      })

      // FORGOT PASSWORD
      .addCase(forgotPassword.pending, (state) => {
        state.status = "loading";
        state.loading = true;
        state.error = null;
        state.message = null;
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.loading = false;
        state.message = action.payload?.message || "Email sent";
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.status = "failed";
        state.loading = false;
        state.error = action.payload;
      })

      // RESET PASSWORD
      .addCase(resetPassword.pending, (state) => {
        state.status = "loading";
        state.loading = true;
        state.error = null;
        state.message = null;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.loading = false;
        state.message = action.payload?.message || "Password reset successful";
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.status = "failed";
        state.loading = false;
        state.error = action.payload;
      })

      // VERIFY OTP
      .addCase(verifyOtp.pending, (state) => {
        state.status = "loading";
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.status = "failed";
        state.loading = false;
        state.error = action.payload;
      })

      // FETCH PROFILE
      .addCase(fetchProfile.pending, (state) => {
        state.status = "loading";
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.loading = false;
        state.user = action.payload.user;
        if (state.token) {
          localStorage.setItem(
            LS_KEY,
            JSON.stringify({ user: action.payload.user, token: state.token }),
          );
        }
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.status = "failed";
        state.loading = false;
        state.error = action.payload;
      })

      // UPDATE PROFILE
      .addCase(updateProfile.pending, (state) => {
        state.status = "loading";
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.loading = false;
        state.user = action.payload.user;
        if (state.token) {
          localStorage.setItem(
            LS_KEY,
            JSON.stringify({ user: action.payload.user, token: state.token }),
          );
        }
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.status = "failed";
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// Export slice actions and reducer
export const { logout, setToken, setTempUserId, clearTempUserId } =
  authSlice.actions;
export default authSlice.reducer;

// ✅ Export all thunks explicitly
