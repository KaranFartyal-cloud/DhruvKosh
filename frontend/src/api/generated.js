import client from './client';

export const generateContent = async (expeditionId) => {
  const { data } = await client.post(`/api/generated/generate/${expeditionId}`);
  return data;
};

export const getGeneratedContent = async (expeditionId) => {
  const { data } = await client.get(`/api/generated/expedition/${expeditionId}/content`);
  
  // Format to match the generation format for the UI
  if (data && (data.social_posts.length > 0 || data.website_articles.length > 0)) {
    return {
      social_posts: {
        twitter: data.social_posts.find(p => p.platform === 'twitter')?.generated_text || '',
        instagram: data.social_posts.find(p => p.platform === 'instagram')?.generated_text || '',
        linkedin: data.social_posts.find(p => p.platform === 'linkedin')?.generated_text || ''
      },
      website_article: data.website_articles.length > 0 ? JSON.parse(data.website_articles[0].generated_text) : null,
      educational_explainer: data.educational_explainers.length > 0 ? JSON.parse(data.educational_explainers.find(e => !e.generated_text.includes('quiz'))?.generated_text || '{}') : null,
      quiz: data.educational_explainers.length > 0 ? JSON.parse(data.educational_explainers.find(e => e.generated_text.includes('quiz'))?.generated_text || '[]') : []
    };
  }
  return null;
};

export const getPublicContent = async () => {
  const { data } = await client.get('/api/generated/public');
  return data;
};
