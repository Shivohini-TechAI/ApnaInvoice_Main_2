import { API_URL } from '../utils/api';

function getToken() {
  return localStorage.getItem('token');
}

export const supabase: any = {
  from: () => ({
    select: () => ({
      eq: () => ({
        order: async () => ({ data: [], error: null }),
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: null, error: null }),
      }),
      order: async () => ({ data: [], error: null }),
    }),
    insert: () => ({
      select: () => ({
        single: async () => ({ data: null, error: null }),
      }),
    }),
    update: () => ({
      eq: () => ({
        eq: async () => ({ data: null, error: null }),
        select: () => ({
          single: async () => ({ data: null, error: null }),
        }),
      }),
    }),
    delete: () => ({
      eq: () => ({
        eq: async () => ({ data: null, error: null }),
      }),
    }),
  }),

  auth: {
    getUser: async () => ({
      data: { user: null },
      error: null,
    }),
  },

  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
      remove: async () => ({ error: null }),
    }),
  },

  functions: {
    invoke: async () => ({
      data: null,
      error: null,
    }),
  },
};

export const uploadFile = async (file: File, bucket: string, path: string) => {
  const token = getToken();

  if (!token) {
    throw new Error('User not authenticated');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', bucket);
  formData.append('path', path);

  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'File upload failed');
  }

  return {
    fileName: data.file.fileName,
    filePath: data.file.path,
    publicUrl: data.file.url,
    fileData: data.file,
  };
};

export const getFileUrl = (_bucket: string, path: string) => {
  if (!path) return '';

  if (path.startsWith('http')) return path;

  return `${API_URL.replace(/\/api$/, '')}${path}`;
};

export const deleteFile = async (_bucket: string, path: string) => {
  const token = getToken();

  if (!token) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(`${API_URL}/upload/delete`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ path }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'File delete failed');
  }

  return true;
};