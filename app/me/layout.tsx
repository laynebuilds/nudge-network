import type { ReactNode } from "react";
import "../app.css";

export default function Layout({ children }: { children: ReactNode }) {
  return <main>{children}</main>;
}
