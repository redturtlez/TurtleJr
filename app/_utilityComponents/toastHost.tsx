"use client";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/**
 * Mounts the shared toast container. Only render this in route areas that call `toast()`
 * (currently /todo, /budget and /health) so public pages don't download react-toastify.
 * Toasts fired before this mounts are queued by the library and shown once it registers.
 */
export default function ToastHost() {
  return (
    <ToastContainer
      position="bottom-right"
      autoClose={4200}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      pauseOnFocusLoss
      draggable
      pauseOnHover
      limit={3}
      theme="dark"
      className="app-toast-container"
      toastClassName="app-toast"
      bodyClassName="app-toast-body"
      progressClassName="app-toast-progress"
    />
  );
}
