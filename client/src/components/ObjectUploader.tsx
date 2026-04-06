import { useState, useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters?: (file: { name: string; size: number | null; type?: string }) => Promise<{
    method: string;
    url: string;
    headers: Record<string, string>;
  }>;
  onComplete?: (result: { successful: Array<{ name: string; type: string; size: number; uploadURL?: string }> }) => void;
  buttonClassName?: string;
  children?: ReactNode;
}

/**
 * Lightweight file uploader stub.
 * Replace with full Uppy-based uploader when @uppy/* packages are installed.
 */
export function ObjectUploader({
  maxNumberOfFiles = 10,
  maxFileSize = 50 * 1024 * 1024,
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    const successful: Array<{ name: string; type: string; size: number; uploadURL?: string }> = [];

    for (let i = 0; i < Math.min(files.length, maxNumberOfFiles); i++) {
      const file = files[i];
      if (file.size > maxFileSize) continue;

      try {
        if (onGetUploadParameters) {
          const params = await onGetUploadParameters({ name: file.name, size: file.size, type: file.type });
          await fetch(params.url, {
            method: params.method,
            headers: params.headers,
            body: file,
          });
          successful.push({ name: file.name, type: file.type, size: file.size, uploadURL: params.url });
        } else {
          successful.push({ name: file.name, type: file.type, size: file.size });
        }
      } catch (err) {
        console.error(`Upload failed for ${file.name}:`, err);
      }
    }

    onComplete?.({ successful });
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        accept=".glb,.gltf,.fbx,.obj,.stl,.png,.jpg,.jpeg,.webp,.mp3,.wav,.ogg,.js,.ts,.json"
      />
      <Button
        variant="ghost"
        size="icon"
        className={buttonClassName}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="Upload Assets"
      >
        {children}
      </Button>
    </>
  );
}
