'use client';

import React, { useState, useRef } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UploadCloud, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface MediaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  websiteId: string;
  onUploaded: () => void;
}

export function MediaUploadModal({ isOpen, onClose, websiteId, onUploaded }: MediaUploadModalProps) {
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [altText, setAltText] = useState('');
  const [caption, setCaption] = useState('');
  const [folder, setFolder] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    if (!title) {
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (uploadMode === 'file') {
        if (!file) {
          setError('Please select a file to upload');
          setLoading(false);
          return;
        }

        const formData = new FormData();
        formData.append('file', file);
        if (title) formData.append('title', title);
        if (altText) formData.append('altText', altText);
        if (caption) formData.append('caption', caption);
        if (folder) formData.append('folder', folder);

        const res = await fetch(`/api/websites/${websiteId}/media`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          onUploaded();
          onClose();
          resetForm();
        } else {
          const json = await res.json();
          setError(json.error?.message || 'Upload failed');
        }
      } else {
        if (!url) {
          setError('Please provide an image URL');
          setLoading(false);
          return;
        }

        const filename = url.split('/').pop()?.split('?')[0] || 'external-asset.jpg';
        const ext = filename.split('.').pop() || 'jpg';

        const res = await fetch(`/api/websites/${websiteId}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            filename,
            title: title || filename,
            altText: altText || null,
            caption: caption || null,
            folder: folder || null,
            format: ext,
            sizeBytes: 150000,
            width: 1200,
            height: 800,
          }),
        });

        if (res.ok) {
          onUploaded();
          onClose();
          resetForm();
        } else {
          const json = await res.json();
          setError(json.error?.message || 'Upload failed');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error uploading media');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setUrl('');
    setTitle('');
    setAltText('');
    setCaption('');
    setFolder('');
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Media Asset"
      description="Add images or assets with extracted dimensions and metadata."
      maxWidth="md"
    >
      <form onSubmit={handleUpload} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-2 border-b border-border pb-2 text-xs">
          <button
            type="button"
            onClick={() => setUploadMode('file')}
            className={`px-3 py-1 rounded font-medium ${
              uploadMode === 'file' ? 'bg-brand text-white font-semibold' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Local File Upload
          </button>
          <button
            type="button"
            onClick={() => setUploadMode('url')}
            className={`px-3 py-1 rounded font-medium ${
              uploadMode === 'url' ? 'bg-brand text-white font-semibold' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Import by URL
          </button>
        </div>

        {uploadMode === 'file' ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-6 border-2 border-dashed border-border rounded-xl text-center cursor-pointer hover:border-brand/50 hover:bg-brand/5 transition-all"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              accept="image/*,.pdf,.svg"
              className="hidden"
            />
            <UploadCloud className="w-8 h-8 mx-auto mb-2 text-brand" />
            {file ? (
              <div>
                <p className="text-xs font-semibold text-text-primary">{file.name}</p>
                <p className="text-[10px] text-text-tertiary mt-0.5">
                  {(file.size / 1024).toFixed(1)} KB • Click to change
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold text-text-primary">Click or drop file to upload</p>
                <p className="text-[10px] text-text-tertiary mt-0.5">PNG, JPG, WEBP, SVG or PDF</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Asset URL *</label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://images.example.com/photo.jpg"
              required
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">Asset Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Hero Banner Sunset"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">Alt Text (Accessibility & SEO)</label>
          <Input
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Describe the image for screen readers and SEO..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Folder / Category</label>
            <Input
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              placeholder="e.g. banners, products"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Caption</label>
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Optional photo caption"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={loading || (uploadMode === 'file' && !file) || (uploadMode === 'url' && !url)}>
            {loading ? 'Uploading...' : 'Save Asset'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
