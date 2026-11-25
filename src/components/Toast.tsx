"use client";
import { useStore } from "./Store";

export function Toast() {
  const { toastMsg } = useStore();
  return (
    <div className={`toast${toastMsg ? " show" : ""}`} role="status">
      {toastMsg && (<><i className={`dot ${toastMsg.dot}`} />{toastMsg.msg}</>)}
    </div>
  );
}
