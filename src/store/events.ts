import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { Meeting } from "../types";

const initialState: Meeting[] = [];

export const eventSlice = createSlice({
  name: "events",
  initialState,
  reducers: {
    createEvent: (state, action: PayloadAction<Meeting>) => {
      state.push(action.payload);
      return state;
    },
    loadEvents: (state, action: PayloadAction<Meeting[]>) => {
      state = action.payload;
      return state;
    },
    deleteEvent: (state, action: PayloadAction<number>) => {
      state = state.filter((item) => {
        return item.id !== action.payload;
      });
      return state;
    },
    editEvent: (state, action: PayloadAction<Meeting>) => {
      state = state.map((item) => {
        if (item.id === action.payload.id) {
          return action.payload;
        }
        return item;
      });
      return state;
    },
  },
});

export const { createEvent, deleteEvent, loadEvents, editEvent } =
  eventSlice.actions;

export const eventReducer = eventSlice.reducer;
