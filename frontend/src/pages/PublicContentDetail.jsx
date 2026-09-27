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

  if (loading) return <div className="text-center p-20"><div className="animate-spin h-10 w-10 border-4 border-ocean-600 border-t-transparent rounded-full mx-auto"></div></div>;
  if (error || !content) return <div className="text-center p-20 text-red-500">{error || "Not found"}</div>;

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
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <Link to="/" className="flex items-center text-sm font-medium text-ocean-600 hover:text-ocean-800">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Home
        </Link>
        <button className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-700">
          <Share2 className="h-4 w-4 mr-1" /> Share
        </button>
      </div>
      
      <div className="p-8 md:p-12">
        <div className="flex items-center space-x-2 text-sm text-slate-500 mb-6">
          <span className="bg-ocean-100 text-ocean-800 px-3 py-1 rounded-full font-semibold uppercase tracking-wider text-[10px]">
            {content.content_category.replace('_', ' ')}
          </span>
          <span className="flex items-center"><Calendar className="h-4 w-4 mr-1" /> {new Date(content.published_at).toLocaleDateString()}</span>
        </div>
        
        <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight">
          {content.generated_title || (isArticle ? parsedContent.headline : parsedContent.title)}
        </h1>
        
        {isArticle && parsedContent.subheading && (
          <h2 className="text-xl text-slate-600 mb-8 font-medium leading-relaxed">
            {parsedContent.subheading}
          </h2>
        )}

        <div className="prose prose-lg max-w-none prose-ocean text-slate-700">
          {isArticle && (
            <div className="whitespace-pre-line leading-relaxed">{parsedContent.body}</div>
          )}
          
          {isExplainer && (
            <div>
              <div className="whitespace-pre-line leading-relaxed mb-10">{parsedContent.explainer_text}</div>
              
              {parsedContent.fun_fact && (
                <div className="bg-ice-50 border border-ice-200 rounded-xl p-6 mb-10">
                  <h3 className="text-xl font-bold text-ocean-800 mb-2 flex items-center">
                    <BookOpen className="h-5 w-5 mr-2" /> Fun Fact
                  </h3>
                  <p className="text-slate-700 italic">{parsedContent.fun_fact}</p>
                </div>
              )}
              
              {parsedContent.glossary && parsedContent.glossary.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-slate-800 mb-4">Glossary</h3>
                  <dl className="space-y-4">
                    {parsedContent.glossary.map((g, idx) => (
                      <div key={idx}>
                        <dt className="font-bold text-ocean-700">{g.term}</dt>
                        <dd className="text-slate-600 mt-1">{g.definition}</dd>
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
          <div className="mt-12 pt-6 border-t border-slate-200 flex flex-wrap gap-2">
            {parsedContent.suggested_tags.map(tag => (
              <span key={tag} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-medium">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default PublicContentDetail;
