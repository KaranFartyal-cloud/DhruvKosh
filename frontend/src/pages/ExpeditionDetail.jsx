import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Bot, FileText, BarChart, Book, Image as ImageIcon, Activity, AlertCircle, RefreshCw, Send, CheckCircle } from 'lucide-react';
import Quiz from '../components/Quiz';

const ExpeditionDetail = () => {
  const { id } = useParams();
  const [expedition, setExpedition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reports');
  const [aiContent, setAiContent] = useState(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState(null);

  const fetchExpedition = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/expeditions/${id}/full`);
      setExpedition(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAiContent = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/generated/expedition/${id}/content`);
      // Reformat the response to match what the generation endpoint returns directly
      if (res.data && (res.data.social_posts.length > 0 || res.data.website_articles.length > 0)) {
        const formatted = {
          social_posts: {
            twitter: res.data.social_posts.find(p => p.platform === 'twitter')?.generated_text || '',
            instagram: res.data.social_posts.find(p => p.platform === 'instagram')?.generated_text || '',
            linkedin: res.data.social_posts.find(p => p.platform === 'linkedin')?.generated_text || ''
          },
          website_article: res.data.website_articles.length > 0 ? JSON.parse(res.data.website_articles[0].generated_text) : null,
          educational_explainer: res.data.educational_explainers.length > 0 ? JSON.parse(res.data.educational_explainers.find(e => !e.generated_text.includes('quiz'))?.generated_text || '{}') : null,
          quiz: res.data.educational_explainers.length > 0 ? JSON.parse(res.data.educational_explainers.find(e => e.generated_text.includes('quiz'))?.generated_text || '[]') : []
        };
        setAiContent(formatted);
      }
    } catch (err) {
      console.error("No previous AI content or failed to load");
    }
  };

  useEffect(() => {
    fetchExpedition();
    fetchAiContent();
  }, [id]);

  const generateAIContent = async () => {
    setGeneratingAI(true);
    setAiError(null);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/generated/generate/${id}`);
      setAiContent(res.data);
    } catch (err) {
      console.error(err);
      setAiError("Failed to generate AI content. Please try again.");
    } finally {
      setGeneratingAI(false);
    }
  };

  if (loading) return <div className="text-center p-20"><div className="animate-spin h-10 w-10 border-4 border-ocean-600 border-t-transparent rounded-full mx-auto"></div></div>;
  if (!expedition) return <div className="text-center p-20 text-red-500">Expedition not found</div>;

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-3xl font-bold text-slate-800">{expedition.name}</h1>
            <span className="bg-ice-100 text-ocean-800 px-3 py-1 rounded-full text-xs font-bold">{expedition.expedition_code}</span>
          </div>
          <p className="text-slate-600 max-w-3xl mb-4">{expedition.summary}</p>
          <div className="flex space-x-6 text-sm text-slate-500">
            <div><span className="font-semibold text-slate-700">Region:</span> <span className="capitalize">{expedition.region.replace('_', ' ')}</span></div>
            <div><span className="font-semibold text-slate-700">Dates:</span> {expedition.start_date} to {expedition.end_date}</div>
            <div><span className="font-semibold text-slate-700">Lead:</span> {expedition.team_lead}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column: Data Tabs */}
        <div className="lg:w-2/3 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
              <button onClick={() => setActiveTab('reports')} className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${activeTab === 'reports' ? 'text-ocean-700 border-b-2 border-ocean-600 bg-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}><FileText className="h-4 w-4" /><span>Reports ({expedition.reports.length})</span></button>
              <button onClick={() => setActiveTab('datasets')} className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${activeTab === 'datasets' ? 'text-ocean-700 border-b-2 border-ocean-600 bg-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}><BarChart className="h-4 w-4" /><span>Datasets ({expedition.datasets.length})</span></button>
              <button onClick={() => setActiveTab('publications')} className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${activeTab === 'publications' ? 'text-ocean-700 border-b-2 border-ocean-600 bg-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}><Book className="h-4 w-4" /><span>Publications ({expedition.publications.length})</span></button>
              <button onClick={() => setActiveTab('media')} className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${activeTab === 'media' ? 'text-ocean-700 border-b-2 border-ocean-600 bg-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}><ImageIcon className="h-4 w-4" /><span>Media ({expedition.media_items.length})</span></button>
            </div>
            
            <div className="p-6">
              {activeTab === 'reports' && (
                <div className="space-y-4">
                  {expedition.reports.length === 0 ? <p className="text-slate-500">No reports uploaded yet.</p> : expedition.reports.map(r => (
                    <div key={r.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50 flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-slate-800">{r.title}</h4>
                        <p className="text-xs text-slate-500 mt-1 capitalize">{r.report_type} Report • {r.page_count || 0} pages</p>
                      </div>
                      <a href={`${API_BASE_URL}/api/files/${r.file_path.replace('uploads/', '')}`} target="_blank" rel="noreferrer" className="text-ocean-600 hover:underline text-sm font-medium">View File</a>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'datasets' && (
                <div className="space-y-4">
                  {expedition.datasets.length === 0 ? <p className="text-slate-500">No datasets uploaded yet.</p> : expedition.datasets.map(d => (
                    <div key={d.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50 flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-slate-800">{d.title}</h4>
                        <p className="text-xs text-slate-500 mt-1 capitalize">{d.data_type} • {d.file_format} • {d.parameters_measured?.join(', ')}</p>
                      </div>
                      <a href={`${API_BASE_URL}/api/files/${d.file_path.replace('uploads/', '')}`} target="_blank" rel="noreferrer" className="text-ocean-600 hover:underline text-sm font-medium">Download</a>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'publications' && (
                <div className="space-y-4">
                  {expedition.publications.length === 0 ? <p className="text-slate-500">No publications linked yet.</p> : expedition.publications.map(p => (
                    <div key={p.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                      <h4 className="font-semibold text-slate-800">{p.title}</h4>
                      <p className="text-sm text-slate-600 mt-1">{p.authors?.join(', ')}</p>
                      <p className="text-xs text-slate-500 mt-2 italic">{p.journal_or_venue}</p>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'media' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {expedition.media_items.length === 0 ? <p className="text-slate-500 col-span-3">No media uploaded yet.</p> : expedition.media_items.map(m => (
                    <div key={m.id} className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                      <div className="h-32 bg-slate-200 flex items-center justify-center">
                         <ImageIcon className="h-8 w-8 text-slate-400" />
                      </div>
                      <div className="p-3">
                        <h4 className="font-semibold text-slate-800 text-sm line-clamp-1">{m.title}</h4>
                        <p className="text-xs text-slate-500 capitalize">{m.media_type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Generation */}
        <div className="lg:w-1/3">
          <div className="bg-gradient-to-br from-ocean-800 to-ocean-900 rounded-xl shadow-lg border border-ocean-700 text-white overflow-hidden">
            <div className="p-6 border-b border-ocean-700">
              <div className="flex items-center space-x-3 mb-2">
                <div className="bg-ocean-700 p-2 rounded-lg">
                  <Bot className="h-6 w-6 text-ice-300" />
                </div>
                <h2 className="text-xl font-bold">AI Outreach Generator</h2>
              </div>
              <p className="text-ocean-200 text-sm">Automatically generate social media posts, articles, and educational content from expedition data.</p>
            </div>
            
            <div className="p-6 bg-white text-slate-800">
              {generatingAI ? (
                <div className="text-center py-10">
                  <div className="animate-spin h-10 w-10 border-4 border-ocean-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="font-medium text-ocean-800">Analyzing expedition data...</p>
                  <p className="text-sm text-slate-500 mt-2">This usually takes 30-60 seconds</p>
                </div>
              ) : !aiContent ? (
                <div className="text-center py-6">
                  <Bot className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-600 mb-6">No outreach content generated yet.</p>
                  <button onClick={generateAIContent} className="w-full bg-ocean-600 hover:bg-ocean-700 text-white py-3 rounded-lg font-medium shadow-md transition-colors flex items-center justify-center space-x-2">
                    <Bot className="h-5 w-5" />
                    <span>Generate Content Now</span>
                  </button>
                  {aiError && <p className="text-red-500 text-sm mt-4 flex items-center justify-center"><AlertCircle className="h-4 w-4 mr-1"/>{aiError}</p>}
                </div>
              ) : (
                <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-ocean-900">Generated Content</h3>
                    <button onClick={generateAIContent} className="text-xs flex items-center text-ocean-600 hover:text-ocean-800">
                      <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
                    </button>
                  </div>

                  {/* Social Posts */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-slate-700 text-sm border-b pb-1">Social Media</h4>
                    
                    {['twitter', 'instagram', 'linkedin'].map(platform => (
                      <div key={platform} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold uppercase text-slate-500">{platform}</span>
                          <button className="text-xs text-ocean-600 font-medium flex items-center"><Send className="h-3 w-3 mr-1"/> Publish</button>
                        </div>
                        <p className="text-sm text-slate-700">{aiContent.social_posts[platform]}</p>
                      </div>
                    ))}
                  </div>

                  {/* Website Article */}
                  {aiContent.website_article && !aiContent.website_article.error && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-slate-700 text-sm border-b pb-1 mt-6">Website Article</h4>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <h5 className="font-bold text-ocean-900 leading-tight mb-2">{aiContent.website_article.headline}</h5>
                        <h6 className="text-sm font-medium text-slate-600 mb-3">{aiContent.website_article.subheading}</h6>
                        <p className="text-sm text-slate-700 line-clamp-4">{aiContent.website_article.body}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {aiContent.website_article.suggested_tags?.map(tag => (
                            <span key={tag} className="bg-ice-100 text-ocean-700 text-[10px] px-2 py-1 rounded-full">{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Educational Explainer */}
                  {aiContent.educational_explainer && !aiContent.educational_explainer.error && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-slate-700 text-sm border-b pb-1 mt-6">Educational Explainer</h4>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <h5 className="font-bold text-ocean-900 mb-2">{aiContent.educational_explainer.title}</h5>
                        <p className="text-sm text-slate-700 line-clamp-3 mb-4">{aiContent.educational_explainer.explainer_text}</p>
                        
                        <div className="bg-ice-50 p-3 rounded border border-ice-200 mb-3">
                          <h6 className="text-xs font-bold text-ocean-800 mb-1">Fun Fact!</h6>
                          <p className="text-sm text-slate-600 italic">{aiContent.educational_explainer.fun_fact}</p>
                        </div>

                        <div className="text-xs text-slate-500 font-medium mb-1">Glossary Terms:</div>
                        <ul className="list-disc list-inside text-xs text-slate-600">
                          {aiContent.educational_explainer.glossary?.slice(0,3).map(g => (
                            <li key={g.term}><span className="font-semibold">{g.term}</span></li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Interactive Quiz Preview */}
                  {aiContent.quiz && aiContent.quiz.length > 0 && (
                    <div className="mt-8 border-t pt-6">
                      <h4 className="font-semibold text-slate-700 text-sm mb-4">Quiz Preview</h4>
                      <Quiz questions={aiContent.quiz} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ExpeditionDetail;
