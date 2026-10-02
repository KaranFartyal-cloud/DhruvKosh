import client from './client';

export const getExpeditions = async () => {
  const { data } = await client.get('/api/expeditions');
<<<<<<< HEAD
  return Array.isArray(data) ? data : (data?.items || []);
=======
  // Normalize: handle array, {expeditions:[...]}, {items:[...]}, {data:[...]} etc.
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.expeditions)) return data.expeditions;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
>>>>>>> 9aace11c335f72408e69cde9fbc94238e194360a
};

export const getExpeditionFull = async (id) => {
  const { data } = await client.get(`/api/expeditions/${id}/full`);
  return data;
};

export const createExpedition = async (expeditionData) => {
  const { data } = await client.post('/api/expeditions', expeditionData);
  return data;
};

export const uploadReport = async ({ expeditionId, formData, onUploadProgress }) => {
  const { data } = await client.post(`/api/expeditions/${expeditionId}/reports`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress
  });
  return data;
};

export const uploadDataset = async ({ formData, onUploadProgress }) => {
  const { data } = await client.post('/api/datasets', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress
  });
  return data;
};

export const uploadPublication = async ({ formData, onUploadProgress }) => {
  const { data } = await client.post('/api/publications', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress
  });
  return data;
};

export const uploadMedia = async ({ expeditionId, formData, onUploadProgress }) => {
  const { data } = await client.post(`/api/expeditions/${expeditionId}/media`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress
  });
  return data;
};
