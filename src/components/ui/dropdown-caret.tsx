"use client";

import { CaretDown } from "@phosphor-icons/react";

// One glyph, weight and size for the searchable department field and all selects.
export function DropdownCaret() {
  return <CaretDown size={16} weight="regular" aria-hidden="true" />;
}
