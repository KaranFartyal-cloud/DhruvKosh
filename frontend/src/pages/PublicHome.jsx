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
    <div className="font-sans">
      <div className="bg-gradient-to-br from-ncpor-card to-ncpor-bgSecondary border border-ncpor-border rounded-2xl p-12 text-center text-ncpor-textPrimary mb-12 shadow-[0_8px_30px_rgb(0,0,0,0.4)] relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, #45D6C2 0%, transparent 70%)' }}></div>
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold font-display mb-4">Discover India's Polar Frontier</h1>
          <p className="text-xl text-ncpor-textSecondary max-w-2xl mx-auto mb-8">
            Explore the latest scientific findings, educational resources, and stories from our expeditions to Antarctica, the Arctic, and the Himalayas.
          </p>
          <a href="#latest" className="bg-ncpor-accent text-ncpor-bg px-6 py-3 rounded-full font-bold shadow-[0_0_15px_rgba(69,214,194,0.15)] hover:bg-ncpor-lightIce hover:shadow-[0_0_25px_rgba(69,214,194,0.3)] transition-all inline-block hover:-translate-y-0.5 duration-200">
            Start Exploring
          </a>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center p-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ncpor-accent mx-auto"></div>
          <p className="text-ncpor-textMuted mt-4 font-medium tracking-wide uppercase text-sm">Loading polar content...</p>
        </div>
      ) : isError ? (
        <div className="text-center p-20 text-ncpor-warning bg-ncpor-warning/10 rounded-xl border border-ncpor-warning/20">
          Failed to load content. Please try again later.
        </div>
      ) : contentList?.length === 0 ? (
        <div className="text-center p-20 bg-ncpor-card rounded-xl shadow-lg border border-ncpor-border">
          <h2 className="text-xl font-bold text-ncpor-textPrimary mb-2 font-display">No Published Content Yet</h2>
          <p className="text-ncpor-textSecondary">Check back later for exciting stories from the poles.</p>
        </div>
      ) : (
        <div id="latest" className="space-y-16">
          {articles.length > 0 && (
            <section>
              <div className="flex items-center space-x-3 mb-8">
                <div className="bg-ncpor-accent/10 p-2.5 rounded-lg text-ncpor-accent border border-ncpor-accent/20"><FileText className="h-6 w-6" /></div>
                <h2 className="text-3xl font-bold font-display text-ncpor-textPrimary">Latest News & Articles</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map(article => {
                  let data = {};
                  try { data = JSON.parse(article.generated_text); } catch(e){}
                  return (
                    <Link to={`/content/${article.id}`} key={article.id} className="bg-ncpor-card rounded-xl border border-ncpor-border hover:border-ncpor-accent/50 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all overflow-hidden flex flex-col h-full group duration-300">
                      <div className="h-40 bg-ncpor-bgSecondary relative overflow-hidden flex items-center justify-center border-b border-ncpor-border">
                        <FileText className="h-12 w-12 text-ncpor-textMuted group-hover:scale-110 group-hover:text-ncpor-accent/50 transition-all duration-500" />
                      </div>
                      <div className="p-6 flex-grow flex flex-col">
                        <div className="flex items-center text-xs text-ncpor-textMuted mb-3 tracking-wider uppercase font-medium">
                          <span className="text-ncpor-accent">News</span>
                          <span className="mx-2">•</span>
                          <span>{new Date(article.published_at || article.created_at).toLocaleDateString()}</span>
                        </div>
                        <h3 className="text-xl font-bold text-ncpor-textPrimary mb-3 font-display leading-tight group-hover:text-ncpor-accent transition-colors">{data.headline || article.generated_title}</h3>
                        <p className="text-ncpor-textSecondary line-clamp-3 text-sm mb-6 flex-grow leading-relaxed">{data.subheading || data.body}</p>
                        <div className="text-ncpor-accent font-medium text-sm flex items-center mt-auto">
                          Read full article <ArrowRight className="h-4 w-4 ml-1.5 group-hover:translate-x-1.5 transition-transform" />
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
              <div className="flex items-center space-x-3 mb-8">
                <div className="bg-ncpor-glaciology/10 p-2.5 rounded-lg text-ncpor-glaciology border border-ncpor-glaciology/20"><BookOpen className="h-6 w-6" /></div>
                <h2 className="text-3xl font-bold font-display text-ncpor-textPrimary">Learn & Explore</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {explainers.map(explainer => {
                  let data = {};
                  try { data = JSON.parse(explainer.generated_text); } catch(e){}
                  const isQuiz = Array.isArray(data);
                  return (
                    <Link to={`/content/${explainer.id}`} key={explainer.id} className="bg-ncpor-card rounded-xl border border-ncpor-border hover:border-ncpor-glaciology/50 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all overflow-hidden flex flex-col h-full group duration-300">
                      <div className="p-6 flex-grow flex flex-col">
                        <div className="flex items-center text-xs mb-4">
                          <span className="bg-ncpor-glaciology/10 text-ncpor-glaciology border border-ncpor-glaciology/20 px-2.5 py-1 rounded tracking-wider font-semibold uppercase">{isQuiz ? 'Interactive Quiz' : 'Educational'}</span>
                        </div>
                        <h3 className="text-xl font-bold text-ncpor-textPrimary mb-3 font-display leading-tight group-hover:text-ncpor-glaciology transition-colors">{data.title || explainer.generated_title}</h3>
                        <p className="text-ncpor-textSecondary line-clamp-3 text-sm mb-6 flex-grow leading-relaxed">{isQuiz ? `Test your knowledge with these ${data.length} questions.` : data.explainer_text}</p>
                        <div className="text-ncpor-glaciology font-medium text-sm flex items-center mt-auto">
                          {isQuiz ? 'Start Quiz' : 'Read Explainer'} <ArrowRight className="h-4 w-4 ml-1.5 group-hover:translate-x-1.5 transition-transform" />
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
