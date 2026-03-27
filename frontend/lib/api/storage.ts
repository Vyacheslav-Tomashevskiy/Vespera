import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface FileMetadata {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  s3Key: string;
  createdAt: string;
  updatedAt: string;
}

export const storageApi = {
  listFiles: async (): Promise<FileMetadata[]> => {
    const response = await axios.get(`${API_BASE_URL}/storage`);
    return response.data;
  },

  getUploadUrl: async (fileName: string, fileSize: number, fileType: string): Promise<{ url: string; key: string }> => {
    const response = await axios.post(`${API_BASE_URL}/storage/upload-url`, {
      fileName,
      fileSize,
      fileType,
    });
    return response.data;
  },

  getDownloadUrl: async (key: string): Promise<string> => {
    const response = await axios.get(`${API_BASE_URL}/storage/download-url`, {
      params: { key },
    });
    return response.data.url;
  },

  updateMetadata: async (key: string, fileName: string): Promise<FileMetadata> => {
    const response = await axios.patch(`${API_BASE_URL}/storage`, { fileName }, {
      params: { key },
    });
    return response.data;
  },

  deleteFile: async (key: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/storage`, {
      params: { key },
    });
  },

  uploadToS3: async (url: string, file: File): Promise<void> => {
    await axios.put(url, file, {
      headers: {
        'Content-Type': file.type,
      },
    });
  },
};
