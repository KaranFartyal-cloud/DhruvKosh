import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FileText, BookOpen, ArrowRight } from 'lucide-react';
import * as api from '../api/generated';

const PublicHome = () => {
  const { data: contentList, isLoading, isError } = useQuery({
    queryKey: ['publicContent'],
    queryFn: api.getPublicContent
  });

  const articles = contentList?.filter(c => c.content_category === 'website_article') || [];
  const explainers = contentList?.filter(c => c.content_category === 'educational_explainer') || [];

  return (
    <div>
      <div className="bg-ocean-900 rounded-2xl p-12 text-center text-white mb-12 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold font-serif mb-4">Discover India's Polar Frontier</h1>
          <p className="text-xl text-ocean-100 max-w-2xl mx-auto mb-8">
            Explore the latest scientific findings, educational resources, and stories from our expeditions to Antarctica, the Arctic, and the Himalayas.
          </p>
          <a href="#latest" className="bg-white text-ocean-900 px-6 py-3 rounded-full font-bold shadow-lg hover:bg-ice-100 transition-colors inline-block">
            Start Exploring
          </a>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center p-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ocean-600 mx-auto"></div>
          <p className="text-slate-500 mt-4 font-medium">Loading polar content...</p>
        </div>
      ) : isError ? (
        <div className="text-center p-20 text-red-500 bg-red-50 rounded-xl border border-red-100">
          Failed to load content. Please try again later.
        </div>
      ) : contentList?.length === 0 ? (
        <div className="text-center p-20 bg-white rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-700 mb-2">No Published Content Yet</h2>
          <p className="text-slate-500">Check back later for exciting stories from the poles.</p>
        </div>
      ) : (
        <div id="latest" className="space-y-16">
          {articles.length > 0 && (
            <section>
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-ocean-100 p-2 rounded-lg text-ocean-700"><FileText className="h-6 w-6" /></div>
                <h2 className="text-3xl font-bold font-serif text-slate-800">Latest News & Articles</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map(article => {
                  let data = {};
                  try { data = JSON.parse(article.generated_text); } catch(e){}
                  return (
                    <Link to={`/content/${article.id}`} key={article.id} className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full group">
                      <div className="h-40 bg-ice-100 border-b border-ice-200 relative overflow-hidden flex items-center justify-center">
                        <FileText className="h-12 w-12 text-ice-300 group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <div className="p-6 flex-grow flex flex-col">
                        <div className="flex items-center text-xs text-slate-500 mb-2">
                          <span className="font-semibold text-ocean-600">News</span>
                          <span className="mx-2">•</span>
                          <span>{new Date(article.published_at || article.created_at).toLocaleDateString()}</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2 font-serif leading-tight group-hover:text-ocean-700 transition-colors">{data.headline || article.generated_title}</h3>
                        <p className="text-slate-600 line-clamp-3 text-sm mb-4 flex-grow">{data.subheading || data.body}</p>
                        <div className="text-ocean-600 font-medium text-sm flex items-center mt-auto">
                          Read full article <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {explainers.length > 0 && (
            <section>
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-teal-100 p-2 rounded-lg text-teal-700"><BookOpen className="h-6 w-6" /></div>
                <h2 className="text-3xl font-bold font-serif text-slate-800">Learn & Explore</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {explainers.map(explainer => {
                  let data = {};
                  try { data = JSON.parse(explainer.generated_text); } catch(e){}
                  const isQuiz = Array.isArray(data);
                  return (
                    <Link to={`/content/${explainer.id}`} key={explainer.id} className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full group">
                      <div className="p-6 flex-grow flex flex-col">
                        <div className="flex items-center text-xs text-slate-500 mb-3">
                          <span className="bg-teal-50 text-teal-700 px-2 py-1 rounded font-bold uppercase">{isQuiz ? 'Interactive Quiz' : 'Educational'}</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2 leading-tight group-hover:text-teal-700 transition-colors">{data.title || explainer.generated_title}</h3>
                        <p className="text-slate-600 line-clamp-3 text-sm mb-4 flex-grow">{isQuiz ? `Test your knowledge with these ${data.length} questions.` : data.explainer_text}</p>
                        <div className="text-teal-600 font-medium text-sm flex items-center mt-auto">
                          {isQuiz ? 'Start Quiz' : 'Read Explainer'} <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
export default PublicHome;
