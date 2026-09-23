import Image from "next/image";

export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <Image src="/logo.png" alt="DealerOne" width={size} height={size} priority />
      <span className="text-lg font-bold tracking-tight">DealerOne</span>
    </div>
  );
}
