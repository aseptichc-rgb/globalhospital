"use client";

interface FlagImageProps {
  countryCode: string;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: { width: 24, height: 18, imgWidth: 40 },
  md: { width: 40, height: 30, imgWidth: 80 },
  lg: { width: 64, height: 48, imgWidth: 160 },
};

export default function FlagImage({ countryCode, alt, size = "lg", className = "" }: FlagImageProps) {
  const { width, height, imgWidth } = SIZES[size];
  const code = countryCode.toLowerCase();

  return (
    <img
      src={`https://flagcdn.com/w${imgWidth}/${code}.png`}
      srcSet={`https://flagcdn.com/w${imgWidth * 2}/${code}.png 2x`}
      width={width}
      height={height}
      alt={alt}
      className={`inline-block object-cover rounded-sm ${className}`}
      loading="lazy"
    />
  );
}
