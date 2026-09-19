import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface RoomQrCodeProps {
  url: string;
}

export function RoomQrCode({ url }: RoomQrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(url, { margin: 1, width: 200 })
      .then((generated) => {
        if (!cancelled) setDataUrl(generated);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!dataUrl) return null;

  return (
    <img
      src={dataUrl}
      alt="Scan to join the room"
      width={200}
      height={200}
      className="rounded-button bg-white p-2"
    />
  );
}
