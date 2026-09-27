import Image from "next/image";
import { BRAND_ICON } from "@/lib/brand";

export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <Image
      className="brand-mark"
      src={BRAND_ICON}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
    />
  );
}
