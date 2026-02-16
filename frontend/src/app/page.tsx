"use client";

import { redirect } from "next/navigation";
import { defaultNavItem } from "./nav-items";
export default function DefaultPage() {
  redirect(`/${defaultNavItem}`);
}
