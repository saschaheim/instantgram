const DEV = Boolean(process.env.DEV as unknown as boolean ?? false);

type UIClasses = {
  btn: string;
  btnPrimary: string;
  btnSuccess: string;
  modalOverlay: string;
  modal: string;
  modalContent: string;
  modalHeader: string;
  modalBody: string;
  modalFooter: string;
  modalButton: string;
  modalShow: string;
  modalVisible: string;
  modalDb: string;
  settings: string;
  loading: string;
  loadingSpinner: string;
  loadingText: string;
};

type UIIds = {
  bulkDownloadIndicator: string;
};

type UIAnimations = {
  loadingSpin: string;
};

const readableClasses: UIClasses = {
  btn: "instg-btn",
  btnPrimary: "instg-btn-primary",
  btnSuccess: "instg-btn-success",
  modalOverlay: "instg-modal-overlay",
  modal: "instg-modal",
  modalContent: "instg-modal-content",
  modalHeader: "instg-modal-header",
  modalBody: "instg-modal-body",
  modalFooter: "instg-modal-footer",
  modalButton: "instg-modal-button",
  modalShow: "instg-modal-show",
  modalVisible: "instg-modal-visible",
  modalDb: "instg-modal-db",
  settings: "instg-settings",
  loading: "instg-loading",
  loadingSpinner: "instg-loading-spinner",
  loadingText: "instg-loading-text",
};

const compactClasses: UIClasses = {
  btn: "a",
  btnPrimary: "b",
  btnSuccess: "c",
  modalOverlay: "d",
  modal: "e",
  modalContent: "f",
  modalHeader: "g",
  modalBody: "h",
  modalFooter: "i",
  modalButton: "j",
  modalShow: "k",
  modalVisible: "l",
  modalDb: "m",
  settings: "n",
  loading: "o",
  loadingSpinner: "p",
  loadingText: "q",
};

const readableIds: UIIds = {
  bulkDownloadIndicator: "instg-bulk-download-indicator",
};

const compactIds: UIIds = {
  bulkDownloadIndicator: "r",
};

const readableAnimations: UIAnimations = {
  loadingSpin: "instg-spin",
};

const compactAnimations: UIAnimations = {
  loadingSpin: "s",
};

export const uiClasses = DEV ? readableClasses : compactClasses;
export const uiIds = DEV ? readableIds : compactIds;
export const uiAnimations = DEV ? readableAnimations : compactAnimations;
