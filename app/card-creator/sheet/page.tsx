import type { Metadata } from "next";
import SheetEditor from "./SheetEditor";

export const metadata: Metadata = {
  title: "Card Sheet Maker",
  description: "Arrange up to 9 card images into a print-ready 3 × 3 PDF with 2 mm bleed. Everything stays in your browser.",
};

export default function CardSheetPage() {
  return <SheetEditor />;
}
