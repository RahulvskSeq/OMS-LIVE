import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen:  true,
    activeModal:  null,
    modalData:    null,
  },
  reducers: {
    toggleSidebar(s)       { s.sidebarOpen = !s.sidebarOpen; },
    openModal(s, a)        { s.activeModal = a.payload.modal; s.modalData = a.payload.data || null; },
    closeModal(s)          { s.activeModal = null; s.modalData = null; },
  },
});

export const { toggleSidebar, openModal, closeModal } = uiSlice.actions;
export default uiSlice.reducer;
