'use client';

import React, { useState, useRef } from 'react';
import { PropertyData, PhotoData } from '@/store/wizard-store';
import { Image as ImageIcon, Upload, X, Loader2, GripVertical, AlertCircle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface StepProps {
  data: PropertyData;
  onChange: (data: Partial<PropertyData>) => void;
  errors: Record<string, string>;
}

export const Step5Photos: React.FC<StepProps> = ({ data, onChange, errors }) => {
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const photos = data.photos || [];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (photos.length + files.length > 20) {
      toast.error('Maximum 20 photos allowed');
      return;
    }

    const newPhotos: PhotoData[] = [...photos];

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10MB limit`);
        continue;
      }

      const fileId = Math.random().toString(36).substring(7);
      setUploadingFiles(prev => ({ ...prev, [fileId]: 0 }));

      try {
        const formData = new FormData();
        formData.append('file', file);

        // Simple mock of progress then real upload
        // In a real app, use axios onUploadProgress
        // I'll check if there's an existing upload endpoint. 
        // Backend has @aws-sdk/client-s3, maybe it has a dedicated /uploads endpoint?
        // Let's assume there's one or I'll create one.
        // Wait, the backend has /storage module. Let's check it.
        
        const response = await axios.post('/api/storage/upload', formData, {
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
            setUploadingFiles(prev => ({ ...prev, [fileId]: percent }));
          }
        });

        newPhotos.push({
          url: response.data.url,
          caption: '',
          order: newPhotos.length
        });
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
      } finally {
        setUploadingFiles(prev => {
          const next = { ...prev };
          delete next[fileId];
          return next;
        });
      }
    }

    onChange({ photos: newPhotos });
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index).map((p, i) => ({ ...p, order: i }));
    onChange({ photos: newPhotos });
  };

  const updateCaption = (index: number, caption: string) => {
    const newPhotos = [...photos];
    newPhotos[index] = { ...newPhotos[index], caption };
    onChange({ photos: newPhotos });
  };

  // Drag and Drop Handlers
  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const newPhotos = [...photos];
      const draggedItemContent = newPhotos[dragItem.current];
      newPhotos.splice(dragItem.current, 1);
      newPhotos.splice(dragOverItem.current, 0, draggedItemContent);
      
      const reordered = newPhotos.map((p, i) => ({ ...p, order: i }));
      onChange({ photos: reordered });
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  return (
    <div className="space-y-8 animate-slide-in">
      <div className="flex items-center justify-between mb-6">
        <label className="text-xl font-bold flex items-center text-neutral-900 dark:text-neutral-100">
          <ImageIcon className="mr-3 text-brand-blue" />
          Property Photos
        </label>
        
        <div className="flex flex-col items-end">
          <span className={`text-xs font-bold uppercase transition-colors
            ${photos.length < 3 ? 'text-red-500' : 'text-green-500'}`}>
            {photos.length} / 20 Photos
          </span>
          <span className="text-[10px] text-neutral-400 font-medium">At least 3 required</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {/* Upload Button */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="aspect-square border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl flex flex-col items-center justify-center space-y-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all hover:border-brand-blue/50 group"
        >
          <div className="bg-brand-blue/10 p-3 rounded-full text-brand-blue group-hover:scale-110 transition-transform">
            <Upload size={24} />
          </div>
          <p className="text-sm font-bold text-neutral-600 dark:text-neutral-400">Add Photos</p>
          <span className="text-[10px] text-neutral-400">Drag & drop or browse</span>
          <input 
            type="file" 
            ref={fileInputRef} 
            multiple 
            accept="image/png, image/jpeg, image/webp" 
            className="hidden" 
            onChange={handleFileUpload}
          />
        </div>

        {/* Existing Photos */}
        {photos.map((photo, index) => (
          <div 
            key={index}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className="group relative aspect-square bg-neutral-100 dark:bg-neutral-800 rounded-3xl overflow-hidden border border-neutral-100 dark:border-neutral-700 hover:shadow-xl transition-all"
          >
            <img 
              src={photo.url} 
              alt={`Photo ${index + 1}`} 
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            
            <div className="absolute top-2 right-2 flex space-x-2">
              <button 
                onClick={() => removePhoto(index)}
                className="bg-black/50 backdrop-blur-md p-2 rounded-lg text-white hover:bg-red-500 transition-colors shadow-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="absolute top-2 left-2">
              <div className="bg-black/50 backdrop-blur-md p-2 rounded-lg text-white cursor-grab active:cursor-grabbing shadow-lg">
                <GripVertical size={16} />
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
              <input 
                type="text" 
                placeholder="Add caption..." 
                value={photo.caption || ''} 
                onChange={(e) => updateCaption(index, e.target.value)}
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/50 focus:outline-none focus:bg-white/20 transition-all font-medium"
              />
            </div>
            
            {index === 0 && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-brand-blue/90 backdrop-blur-md text-[10px] font-bold text-white px-3 py-1 rounded-full shadow-lg">
                Cover Photo
              </div>
            )}
          </div>
        ))}

        {/* Uploading Files Placeholders */}
        {Object.entries(uploadingFiles).map(([id, progress]) => (
          <div key={id} className="aspect-square bg-neutral-50 dark:bg-neutral-900 border-2 border-neutral-100 dark:border-neutral-800 rounded-3xl flex flex-col items-center justify-center p-6 space-y-4">
            <div className="relative w-16 h-16 rounded-full border-4 border-neutral-200 dark:border-neutral-800 overflow-hidden flex items-center justify-center">
              <div 
                className="absolute bottom-0 left-0 right-0 bg-brand-blue/20 transition-all duration-300" 
                style={{ height: `${progress}%` }} 
              />
              <Loader2 size={24} className="animate-spin text-brand-blue relative" />
            </div>
            <p className="text-xs font-bold text-brand-blue tracking-tighter uppercase">{progress}% Uploading</p>
          </div>
        ))}
      </div>

      {errors.photos && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-2xl p-4 flex items-start space-x-3 text-red-600 dark:text-red-400 mt-6 animate-slide-in">
          <AlertCircle size={20} className="mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">Required Photos</p>
            <p className="opacity-80">You need to upload at least 3 photos of the property to continue.</p>
          </div>
        </div>
      )}
    </div>
  );
};
