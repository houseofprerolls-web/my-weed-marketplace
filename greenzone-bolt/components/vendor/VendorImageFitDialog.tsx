'use client';

import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Loader2 } from 'lucide-react';
import { getCroppedImageBlob } from '@/lib/getCroppedImageBlob';

export type VendorImageFitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string | null;
  aspect: number;
  title: string;
  description?: string;
  /** Cap longest edge of output (JPEG) to keep uploads reasonable */
  maxOutputLongEdge?: number;
  /** Base name for the uploaded file (extension replaced with .jpg) */
  outputBaseName?: string;
  onApply: (file: File) => void | Promise<void>;
};

export function VendorImageFitDialog({
  open,
  onOpenChange,
  imageSrc,
  aspect,
  title,
  description,
  maxOutputLongEdge = 2048,
  outputBaseName = 'photo',
  onApply,
}: VendorImageFitDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (open && imageSrc) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  }, [open, imageSrc]);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleApply() {
    if (!imageSrc || !croppedAreaPixels) return;
    setApplying(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, maxOutputLongEdge);
      const base = outputBaseName.replace(/\.[^.]+$/, '').replace(/[^\w\-]+/g, '_').slice(0, 80) || 'photo';
      const file = new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
      await onApply(file);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
    } finally {
      setApplying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,720px)] max-w-lg overflow-y-auto border-green-900/40 bg-gray-950 text-white sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-gray-400">{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <p className="text-xs text-gray-500">
          Drag to reposition. Pinch or use zoom to frame what you want; we save the area inside the frame.
        </p>

        <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-lg bg-background ring-1 ring-green-900/40">
          <div className="relative h-[min(48vh,300px)] w-full sm:h-[min(52vh,340px)]">
            {imageSrc ? (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                showGrid={false}
              />
            ) : null}
          </div>
        </div>

        <div className="space-y-2 px-0.5">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Zoom</span>
            <span className="font-mono text-xs text-gray-500">{zoom.toFixed(2)}×</span>
          </div>
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.02}
            onValueChange={(v) => setZoom(v[0] ?? 1)}
            className="py-1"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" className="border-gray-600 text-gray-200" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-green-600 text-white hover:bg-green-700"
            disabled={!imageSrc || !croppedAreaPixels || applying}
            onClick={() => void handleApply()}
          >
            {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Use this crop'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
