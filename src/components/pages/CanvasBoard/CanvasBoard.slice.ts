import { createSlice } from "@reduxjs/toolkit";
import { act } from "react";

const initialState = {
  canvas: null,
  activeTool: "select",
};

const canvasSlice = createSlice({
  name: "fateboard",
  initialState: initialState,
  reducers: {
    init: (state, action) => {
      if (!state.canvas) {
        state.canvas = action.payload;
      }
    },
    set: (state, action) => {
      state.canvas = action.payload;
    },
    clear: (state) => {
      state.canvas = null;
    },
  },
});

export const { init, clear, set } = canvasSlice.actions;

export default canvasSlice;
