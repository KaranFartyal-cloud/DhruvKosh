import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { ArrowLeft, BookOpen, Share2, Calendar } from 'lucide-react';
import Quiz from '../components/Quiz';

const PublicContentDetail = () => {
  const { id } = useParams();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/generated/public`);
        const item = res.data.find(c => c.id === parseInt(id));
        if (item) {
          setContent(item);
        } else {
          setError("Content not found");
        }
      } catch (err) {
        setError("Failed to load content");
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [id]);

  if (loading) return <div className="text-center p-20"><div className="animate-spin h-10 w-10 border-4 border-ncpor-accent border-t-transparent rounded-full mx-auto"></div></div>;
  if (error || !content) return <div className="text-center p-20 text-ncpor-warning bg-ncpor-warning/10 border border-ncpor-warning/20 max-w-lg mx-auto rounded-xl mt-12">{error || "Not found"}</div>;

  let parsedContent;
  try {
    parsedContent = JSON.parse(content.generated_text);
  } catch (e) {
    parsedContent = { body: content.generated_text };
  }

  const isArticle = content.content_category === 'website_article';
  const isExplainer = content.content_category === 'educational_explainer';
  const isQuiz = content.content_category === 'quiz';

  return (
    <div className="max-w-4xl mx-auto bg-ncpor-card rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-ncpor-border overflow-hidden font-sans">
      <div className="p-5 border-b border-ncpor-border flex items-center justify-between bg-ncpor-bgSecondary">
        <Link to="/" className="flex items-center text-sm font-medium text-ncpor-accent hover:text-ncpor-lightIce transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
        </Link>
        <button className="flex items-center text-sm font-medium text-ncpor-textMuted hover:text-ncpor-textPrimary transition-colors">
          <Share2 className="h-4 w-4 mr-2" /> Share
        </button>
      </div>
      
      <div className="p-8 md:p-12">
        <div className="flex items-center space-x-3 text-sm text-ncpor-textMuted mb-8 font-medium">
          <span className="bg-ncpor-accent/10 text-ncpor-accent border border-ncpor-accent/20 px-3 py-1 rounded-full uppercase tracking-wider text-[10px]">
            {content.content_category.replace('_', ' ')}
          </span>
          <span className="flex items-center tracking-wide"><Calendar className="h-4 w-4 mr-1.5" /> {new Date(content.published_at).toLocaleDateString()}</span>
        </div>
        
        <h1 className="text-3xl md:text-5xl font-bold font-display text-ncpor-textPrimary mb-6 leading-tight">
          {content.generated_title || (isArticle ? parsedContent.headline : parsedContent.title)}
        </h1>
        
        {isArticle && parsedContent.subheading && (
          <h2 className="text-xl text-ncpor-textSecondary mb-10 font-medium leading-relaxed border-l-4 border-ncpor-accent pl-4">
            {parsedContent.subheading}
          </h2>
        )}

        <div className="prose prose-lg max-w-none prose-invert prose-p:text-ncpor-textSecondary prose-headings:text-ncpor-textPrimary prose-headings:font-display prose-a:text-ncpor-accent text-ncpor-textSecondary">
          {isArticle && (
            <div className="whitespace-pre-line leading-relaxed">{parsedContent.body}</div>
          )}
          
          {isExplainer && (
            <div>
              <div className="whitespace-pre-line leading-relaxed mb-10">{parsedContent.explainer_text}</div>
              
              {parsedContent.fun_fact && (
                <div className="bg-ncpor-glaciology/10 border border-ncpor-glaciology/30 rounded-xl p-8 mb-10">
                  <h3 className="text-xl font-bold font-display text-ncpor-glaciology mb-3 flex items-center">
                    <BookOpen className="h-5 w-5 mr-2" /> Fun Fact
                  </h3>
                  <p className="text-ncpor-textPrimary italic leading-relaxed">{parsedContent.fun_fact}</p>
                </div>
              )}
              
              {parsedContent.glossary && parsedContent.glossary.length > 0 && (
                <div className="bg-ncpor-bgSecondary border border-ncpor-border rounded-xl p-8">
                  <h3 className="text-2xl font-bold font-display text-ncpor-textPrimary mb-6">Glossary</h3>
                  <dl className="space-y-6">
                    {parsedContent.glossary.map((g, idx) => (
                      <div key={idx} className="border-b border-ncpor-border/50 pb-4 last:border-0 last:pb-0">
                        <dt className="font-bold text-lg text-ncpor-accent mb-1">{g.term}</dt>
                        <dd className="text-ncpor-textSecondary leading-relaxed">{g.definition}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          )}

          {isQuiz && (
            <div className="mt-8">
              <Quiz questions={Array.isArray(parsedContent) ? parsedContent : parsedContent.questions} />
            </div>
          )}
        </div>

        {isArticle && parsedContent.suggested_tags && (
          <div className="mt-12 pt-8 border-t border-ncpor-border flex flex-wrap gap-2.5">
            {parsedContent.suggested_tags.map(tag => (
              <span key={tag} className="bg-ncpor-bgSecondary text-ncpor-textSecondary border border-ncpor-border px-4 py-1.5 rounded-full text-sm font-medium tracking-wide">#{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default PublicContentDetail;
