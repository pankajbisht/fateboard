// import { put, select, takeLatest } from "redux-saga/effects";
// import * as Page from "./Page.slice";

// const PAGE_SIZES = {
//   Default: { w: 1024, h: 600 },
//   Freehand: { w: 1920, h: 1080 },
//   A4: { w: 794, h: 1123 },
//   A5: { w: 794, h: 1123 },
//   Letter: { w: 816, h: 1056 },
//   Legal: { w: 816, h: 1344 },
// };

// // export const getPageDimensions = (format, orientation) => {
// //   const fmt = (format || "A4").toLowerCase();
// //   const orient = orientation || "LANDSCAPE";

// //   if (fmt === "freehand") {
// //     return { width: window.innerWidth * 2, height: window.innerHeight * 2, scale: 1 };
// //   }

// //   const size = PAGE_SIZES[fmt] || PAGE_SIZES["A4"];
// //   const width = orient === "portrait" ? size.w : size.h;
// //   const height = orient === "portrait" ? size.h : size.w;
// //   const scale = 800 / width; // normalize width

// //   return { width, height, scale };
// // };

// // function* applyPageSizeSaga(action) {
// //     console.log("setPageStateSaga called with action:...", action);
// //   const canvas = yield select(selectFabricCanvas);
// //   if (!canvas) return;

// //   const state = yield select((state) => state.page);
// //   const { format, orientation } = action.payload || state;
// //   const { width, height, scale } = getPageDimensions(format, orientation);

// //   // Fabric operations
// //   canvas.setWidth(width * scale);
// //   canvas.setHeight(height * scale);
// //   canvas.setZoom(scale);
// //   canvas.calcOffset();
// //   canvas.renderAll();

// //   if (typeof canvas.drawBackground === "function") canvas.drawBackground();

// //   // Update Redux state
// //   yield put(setPageDimensions({ scale, pageWidth: width, pageHeight: height }));
// // }

// // const selects = (state) => state.fateboard;

// // console.log(selects);


// function* applyPageSizeSaga(action) {
//     yield console.log("here");
// }

// function* setPageFormatSaga(action) {
//     // put(applyPageSize)
// }

// export default function* pageSaga() {
//   console.log("Registering setPageStateSaga listener");
//   yield takeLatest(Page.applyPageSize.type, applyPageSizeSaga);
//   yield takeLatest(Page.setPageFormat.type, setPageFormatSaga);
// }
// //
