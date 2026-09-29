import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FileText, BookOpen, ArrowRight, Globe } from 'lucide-react';
import * as api from '../api/generated';
import PolarGlobeHero from '../components/PolarGlobeHero';

const PublicHome = () => {
  const { data: contentList, isLoading, isError } = useQuery({
    queryKey: ['publicContent'],
    queryFn: api.getPublicContent
  });
  
  const [lang, setLang] = useState('en');
  const [searchFilter, setSearchFilter] = useState('');

  // Filter content by category and search
  const filteredContent = useMemo(() => {
    if (!contentList) return [];
    if (!searchFilter.trim()) return contentList;
    const q = searchFilter.toLowerCase();
    return contentList.filter(c => 
      c.generated_title?.toLowerCase().includes(q) ||
      c.generated_text?.toLowerCase().includes(q)
    );
  }, [contentList, searchFilter]);

  const allArticles = filteredContent?.filter(c => c.content_category === 'website_article') || [];
  const allExplainers = filteredContent?.filter(c => c.content_category === 'educational_explainer') || [];
  
  // Group by expedition to show alternatives if Hindi is missing
  const getDisplayItems = (items) => {
    // Unique source/expeditions
    const exps = [...new Set(items.map(i => i.expedition_id))];
    const display = [];
    
    for (const exp_id of exps) {
      const expItems = items.filter(i => i.expedition_id === exp_id);
      const requestedItem = expItems.find(i => i.language === lang);
      if (requestedItem) {
        display.push({ item: requestedItem, missingLang: false });
      } else {
        const fallbackItem = expItems.find(i => i.language === 'en'); // fallback to EN
        if (fallbackItem) {
           display.push({ item: fallbackItem, missingLang: true });
        }
      }
    }
    return display;
  };

  const displayArticles = getDisplayItems(allArticles);
  const displayExplainers = getDisplayItems(allExplainers);

  return (
    <div className="space-y-10">
      <div className="flex justify-end mb-2">
        <div className="bg-white dark:bg-[#0D1422] rounded-full p-1 shadow-sm border border-slate-200 dark:border-white/10 flex items-center">
          <Globe className="h-4 w-4 text-slate-400 ml-2 mr-1" />
          <button onClick={() => setLang('en')} className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${lang === 'en' ? 'bg-ocean-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'}`}>EN</button>
          <button onClick={() => setLang('hi')} className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${lang === 'hi' ? 'bg-ocean-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'}`}>हिन्दी</button>
        </div>
      </div>
      
      {/* ── Premium Polar Globe Hero Section (DhruvKosh NCPOR) ── */}
      <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/10 mb-12">
        <PolarGlobeHero 
          onSearch={(query) => {
            setSearchFilter(query);
            const target = document.getElementById('latest');
            if (target) target.scrollIntoView({ behavior: 'smooth' });
          }}
        />
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
        <div id="latest" className={`space-y-16 ${lang === 'hi' ? 'font-hind' : ''}`}>
          {displayArticles.length > 0 && (
            <section>
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-ocean-100 p-2 rounded-lg text-ocean-700"><FileText className="h-6 w-6" /></div>
                <h2 className="text-3xl font-bold font-serif text-slate-800">
                  {lang === 'en' ? "Latest News & Articles" : "नवीनतम समाचार और लेख"}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayArticles.map(({item: article, missingLang}) => {
                  return (
                    <Link to={`/content/${article.id}`} key={article.id} className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full group relative">
                      {missingLang && (
                        <div className="absolute top-0 left-0 w-full bg-amber-100 text-amber-800 text-[10px] text-center font-bold py-1 z-10">
                          हिन्दी संस्करण जल्द ही आ रहा है (Hindi version coming soon)
                        </div>
                      )}
                      <div className={`h-40 bg-ice-100 border-b border-ice-200 relative overflow-hidden flex items-center justify-center ${missingLang ? 'mt-6' : ''}`}>
                        <FileText className="h-12 w-12 text-ice-300 group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <div className="p-6 flex-grow flex flex-col">
                        <div className="flex items-center text-xs text-ncpor-textMuted mb-3 tracking-wider uppercase font-medium">
                          <span className="text-ncpor-accent">News</span>
                          <span className="mx-2">•</span>
                          <span>{new Date(article.published_at || article.created_at).toLocaleDateString()}</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2 font-serif leading-tight group-hover:text-ocean-700 transition-colors">{article.generated_title}</h3>
                        <p className="text-slate-600 line-clamp-3 text-sm mb-4 flex-grow">{article.generated_text}</p>
                        <div className="text-ocean-600 font-medium text-sm flex items-center mt-auto">
                           {lang === 'en' || missingLang ? "Read full article" : "पूरा लेख पढ़ें"} <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {displayExplainers.length > 0 && (
            <section>
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-teal-100 p-2 rounded-lg text-teal-700"><BookOpen className="h-6 w-6" /></div>
                <h2 className="text-3xl font-bold font-serif text-slate-800">
                  {lang === 'en' ? "Learn & Explore" : "सीखें और अन्वेषण करें"}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayExplainers.map(({item: explainer, missingLang}) => {
                  const isQuiz = explainer.generated_text.startsWith('[');
                  let quizCount = 0;
                  if (isQuiz) {
                    try { quizCount = JSON.parse(explainer.generated_text).length; } catch(e){}
                  }
                  
                  return (
                    <Link to={`/content/${explainer.id}`} key={explainer.id} className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full group relative">
                      {missingLang && (
                        <div className="absolute top-0 left-0 w-full bg-amber-100 text-amber-800 text-[10px] text-center font-bold py-1 z-10">
                          हिन्दी संस्करण जल्द ही आ रहा है (Hindi version coming soon)
                        </div>
                      )}
                      <div className={`p-6 flex-grow flex flex-col ${missingLang ? 'pt-8' : ''}`}>
                        <div className="flex items-center text-xs text-slate-500 mb-3">
                          <span className="bg-teal-50 text-teal-700 px-2 py-1 rounded font-bold uppercase">
                             {isQuiz ? (lang === 'en' || missingLang ? 'Interactive Quiz' : 'इंटरएक्टिव क्विज़') : (lang === 'en' || missingLang ? 'Educational' : 'शैक्षिक')}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2 leading-tight group-hover:text-teal-700 transition-colors">{explainer.generated_title}</h3>
                        <p className="text-slate-600 line-clamp-3 text-sm mb-4 flex-grow">
                          {isQuiz 
                            ? (lang === 'en' || missingLang ? `Test your knowledge with these ${quizCount} questions.` : `इन ${quizCount} प्रश्नों के साथ अपने ज्ञान का परीक्षण करें।`) 
                            : explainer.generated_text}
                        </p>
                        <div className="text-teal-600 font-medium text-sm flex items-center mt-auto">
                          {isQuiz 
                            ? (lang === 'en' || missingLang ? 'Start Quiz' : 'क्विज़ शुरू करें') 
                            : (lang === 'en' || missingLang ? 'Read Explainer' : 'एक्सप्लेनर पढ़ें')} 
                          <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
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
