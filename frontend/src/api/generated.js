import client from './client';

export const generateContent = async (expeditionId) => {
  const { data } = await client.post(`/api/generated/generate/${expeditionId}`, ["en", "hi"]);
  return data;
};

export const getGeneratedContent = async (expeditionId) => {
  const { data } = await client.get(`/api/generated/expedition/${expeditionId}/content`);
  
  if (!data || (data.social_posts.length === 0 && data.website_articles.length === 0)) return null;
  
  const processLanguage = (lang) => {
    const wa = data.website_articles.find(a => a.language === lang);
    const ee = data.educational_explainers.find(e => e.language === lang && !e.generated_title.includes('Quiz') && !e.generated_title.includes('क्विज़'));
    const quiz = data.educational_explainers.find(e => e.language === lang && (e.generated_title.includes('Quiz') || e.generated_title.includes('क्विज़')));
    
    return {
      social_posts: {
        twitter: data.social_posts.find(p => p.platform === 'twitter' && p.language === lang),
        instagram: data.social_posts.find(p => p.platform === 'instagram' && p.language === lang),
        linkedin: data.social_posts.find(p => p.platform === 'linkedin' && p.language === lang)
      },
      website_article: wa,
      educational_explainer: ee,
      quiz: quiz ? JSON.parse(quiz.generated_text) : []
    }
  };

  return {
    en: processLanguage('en'),
    hi: processLanguage('hi')
  };
};

export const getPublicContent = async () => {
  const { data } = await client.get('/api/generated/public');
  return data;
};
