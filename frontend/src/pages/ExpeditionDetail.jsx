import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, FileText, BarChart, Book, Image as ImageIcon, AlertCircle, RefreshCw, Send, Plus } from 'lucide-react';
import { API_BASE_URL } from '../config';
import * as expeditionApi from '../api/expeditions';
import * as genApi from '../api/generated';
import Quiz from '../components/Quiz';
import UploadModal from '../components/UploadModal';

const ExpeditionDetail = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('reports');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  
  // Data Fetching via React Query
  const { data: expedition, isLoading: loadingExpedition, isError: expError } = useQuery({
    queryKey: ['expedition', id],
    queryFn: () => expeditionApi.getExpeditionFull(id)
  });

  const { data: aiContent, isLoading: loadingAi, refetch: refetchAi } = useQuery({
    queryKey: ['aiContent', id],
    queryFn: () => genApi.getGeneratedContent(id)
  });

  const generateMutation = useMutation({
    mutationFn: () => genApi.generateContent(id),
    onSuccess: (data) => {
      // Data shape directly from generation API differs from fetch API, so just invalidate to refetch properly formatted
      queryClient.invalidateQueries(['aiContent', id]);
    }
  });

  if (loadingExpedition) return <div className="text-center p-20"><div className="animate-spin h-10 w-10 border-4 border-ncpor-accent border-t-transparent rounded-full mx-auto"></div></div>;
  if (expError || !expedition) return <div className="text-center p-20 text-ncpor-warning bg-ncpor-warning/10 border border-ncpor-warning/20 max-w-lg mx-auto rounded-xl mt-12">Expedition not found or failed to load.</div>;

  return (
    <div className="font-sans">
      <div className="bg-ncpor-card rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-ncpor-border p-8 mb-8 flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-4 mb-4">
            <h1 className="text-3xl font-bold font-display text-ncpor-textPrimary tracking-wide">{expedition.name}</h1>
            <span className="bg-ncpor-accent/10 text-ncpor-accent border border-ncpor-accent/20 px-3 py-1 rounded-full text-xs font-bold tracking-wider font-mono">{expedition.expedition_code}</span>
          </div>
          <p className="text-ncpor-textSecondary max-w-3xl mb-6 leading-relaxed">{expedition.summary}</p>
          <div className="flex space-x-8 text-sm text-ncpor-textMuted bg-ncpor-bgSecondary/50 p-4 rounded-lg border border-ncpor-border/50 inline-flex">
            <div><span className="font-semibold text-ncpor-textPrimary uppercase tracking-wider text-xs mr-2">Region:</span> <span className="capitalize">{expedition.region.replace('_', ' ')}</span></div>
            <div><span className="font-semibold text-ncpor-textPrimary uppercase tracking-wider text-xs mr-2">Dates:</span> {expedition.start_date} <span className="mx-1">to</span> {expedition.end_date}</div>
            <div><span className="font-semibold text-ncpor-textPrimary uppercase tracking-wider text-xs mr-2">Lead:</span> {expedition.team_lead}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column: Data Tabs */}
        <div className="lg:w-2/3 space-y-8">
          <div className="bg-ncpor-card rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-ncpor-border overflow-hidden">
            <div className="flex border-b border-ncpor-border bg-ncpor-bgSecondary overflow-x-auto justify-between">
              <div className="flex">
                <button onClick={() => setActiveTab('reports')} className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors border-b-2 ${activeTab === 'reports' ? 'text-ncpor-accent border-ncpor-accent bg-ncpor-card' : 'text-ncpor-textMuted border-transparent hover:text-ncpor-textPrimary hover:bg-ncpor-card/50'}`}><FileText className="h-4 w-4" /><span>Reports ({expedition.reports.length})</span></button>
                <button onClick={() => setActiveTab('datasets')} className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors border-b-2 ${activeTab === 'datasets' ? 'text-ncpor-accent border-ncpor-accent bg-ncpor-card' : 'text-ncpor-textMuted border-transparent hover:text-ncpor-textPrimary hover:bg-ncpor-card/50'}`}><BarChart className="h-4 w-4" /><span>Datasets ({expedition.datasets.length})</span></button>
                <button onClick={() => setActiveTab('publications')} className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors border-b-2 ${activeTab === 'publications' ? 'text-ncpor-accent border-ncpor-accent bg-ncpor-card' : 'text-ncpor-textMuted border-transparent hover:text-ncpor-textPrimary hover:bg-ncpor-card/50'}`}><Book className="h-4 w-4" /><span>Publications ({expedition.publications.length})</span></button>
                <button onClick={() => setActiveTab('media')} className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors border-b-2 ${activeTab === 'media' ? 'text-ncpor-accent border-ncpor-accent bg-ncpor-card' : 'text-ncpor-textMuted border-transparent hover:text-ncpor-textPrimary hover:bg-ncpor-card/50'}`}><ImageIcon className="h-4 w-4" /><span>Media ({expedition.media_items.length})</span></button>
              </div>
              <div className="p-3">
                <button onClick={() => setUploadModalOpen(true)} className="flex items-center space-x-2 bg-ncpor-accent/10 text-ncpor-accent border border-ncpor-accent/30 hover:bg-ncpor-accent/20 px-4 py-2 rounded-lg text-sm font-semibold transition-all">
                  <Plus className="h-4 w-4" /> <span>Upload</span>
                </button>
              </div>
            </div>
            
            <div className="p-6 min-h-[300px]">
              {activeTab === 'reports' && (
                <div className="space-y-4">
                  {expedition.reports.length === 0 ? <p className="text-ncpor-textMuted italic">No reports uploaded yet.</p> : expedition.reports.map(r => (
                    <div key={r.id} className="border border-ncpor-border rounded-lg p-5 bg-ncpor-bgSecondary flex justify-between items-center hover:border-ncpor-accent/30 transition-colors">
                      <div>
                        <h4 className="font-semibold font-display text-lg text-ncpor-textPrimary tracking-wide">{r.title}</h4>
                        <p className="text-xs text-ncpor-textSecondary mt-1 capitalize tracking-wider font-medium">{r.report_type} Report • {r.page_count || 0} pages</p>
                      </div>
                      <a href={`${API_BASE_URL}/api/files/${r.file_path.replace('uploads/', '')}`} target="_blank" rel="noreferrer" className="text-ncpor-accent hover:text-ncpor-lightIce text-sm font-medium tracking-wide">View PDF</a>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'datasets' && (
                <div className="space-y-4">
                  {expedition.datasets.length === 0 ? <p className="text-ncpor-textMuted italic">No datasets uploaded yet.</p> : expedition.datasets.map(d => (
                    <div key={d.id} className="border border-ncpor-border rounded-lg p-5 bg-ncpor-bgSecondary flex justify-between items-center hover:border-ncpor-accent/30 transition-colors">
                      <div>
                        <h4 className="font-semibold font-display text-lg text-ncpor-textPrimary tracking-wide">{d.title}</h4>
                        <p className="text-xs text-ncpor-textSecondary mt-1 capitalize tracking-wider font-medium">{d.data_type} • {d.file_format} • {d.parameters_measured?.join(', ')}</p>
                      </div>
                      <a href={`${API_BASE_URL}/api/files/${d.file_path.replace('uploads/', '')}`} target="_blank" rel="noreferrer" className="text-ncpor-accent hover:text-ncpor-lightIce text-sm font-medium tracking-wide">Download Data</a>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'publications' && (
                <div className="space-y-4">
                  {expedition.publications.length === 0 ? <p className="text-ncpor-textMuted italic">No publications linked yet.</p> : expedition.publications.map(p => (
                    <div key={p.id} className="border border-ncpor-border rounded-lg p-5 bg-ncpor-bgSecondary flex justify-between items-start hover:border-ncpor-accent/30 transition-colors">
                      <div>
                        <h4 className="font-semibold font-display text-lg text-ncpor-textPrimary tracking-wide">{p.title}</h4>
                        <p className="text-sm text-ncpor-textSecondary mt-1">{p.authors?.join(', ')}</p>
                        <p className="text-xs text-ncpor-textMuted mt-2 italic">{p.journal_or_venue}</p>
                      </div>
                      {p.file_path && <a href={`${API_BASE_URL}/api/files/${p.file_path.replace('uploads/', '')}`} target="_blank" rel="noreferrer" className="text-ncpor-accent hover:text-ncpor-lightIce text-sm font-medium tracking-wide">PDF</a>}
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'media' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {expedition.media_items.length === 0 ? <p className="text-ncpor-textMuted italic col-span-3">No media uploaded yet.</p> : expedition.media_items.map(m => (
                    <div key={m.id} className="border border-ncpor-border rounded-lg overflow-hidden bg-ncpor-bgSecondary group cursor-pointer hover:border-ncpor-accent/50 transition-colors">
                      <div className="h-32 bg-ncpor-bg flex items-center justify-center relative overflow-hidden">
                         {m.media_type === 'photo' ? (
                           <img src={`${API_BASE_URL}/api/files/${m.file_path.replace('uploads/', '')}`} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" alt={m.title} />
                         ) : (
                           <ImageIcon className="h-8 w-8 text-ncpor-textMuted group-hover:text-ncpor-accent/50 transition-colors" />
                         )}
                      </div>
                      <div className="p-3">
                        <h4 className="font-semibold text-ncpor-textPrimary text-sm line-clamp-1">{m.title}</h4>
                        <p className="text-xs text-ncpor-textSecondary capitalize mt-1">{m.media_type}</p>
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
          <div className="bg-gradient-to-br from-[#0A1D20] to-ncpor-bg border border-ncpor-border rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.6)] text-ncpor-textPrimary overflow-hidden">
            <div className="p-6 border-b border-ncpor-border">
              <div className="flex items-center space-x-3 mb-2">
                <div className="bg-ncpor-cardElevated border border-ncpor-border p-2.5 rounded-lg shadow-inner">
                  <Bot className="h-6 w-6 text-ncpor-accent" />
                </div>
                <h2 className="text-xl font-bold font-display tracking-wide text-ncpor-textPrimary">AI Outreach Generator</h2>
              </div>
              <p className="text-ncpor-textMuted text-sm leading-relaxed mt-4">Automatically generate social media posts, articles, and educational content from expedition data.</p>
            </div>
            
            <div className="p-6 bg-ncpor-card text-ncpor-textPrimary">
              {generateMutation.isPending ? (
                <div className="text-center py-12">
                  <div className="animate-spin h-10 w-10 border-4 border-ncpor-accent border-t-transparent rounded-full mx-auto mb-6 shadow-[0_0_15px_rgba(69,214,194,0.3)]"></div>
                  <p className="font-medium text-ncpor-textPrimary tracking-wide">Analyzing expedition data...</p>
                  <p className="text-sm text-ncpor-textMuted mt-2">This usually takes 30-60 seconds</p>
                </div>
              ) : !aiContent && !loadingAi ? (
                <div className="text-center py-10">
                  <Bot className="h-16 w-16 text-ncpor-border mx-auto mb-6" />
                  <p className="text-ncpor-textSecondary mb-8">No outreach content generated yet.</p>
                  <button onClick={() => generateMutation.mutate()} className="w-full bg-ncpor-accent hover:bg-ncpor-lightIce text-ncpor-bg py-3.5 rounded-lg font-bold shadow-[0_0_15px_rgba(69,214,194,0.15)] hover:shadow-[0_0_25px_rgba(69,214,194,0.3)] transition-all flex items-center justify-center space-x-2 hover:-translate-y-0.5 duration-200">
                    <Bot className="h-5 w-5" />
                    <span>Generate Content Now</span>
                  </button>
                  {generateMutation.isError && <p className="text-ncpor-warning text-sm mt-4 flex items-center justify-center"><AlertCircle className="h-4 w-4 mr-1.5"/>Failed to generate content</p>}
                </div>
              ) : aiContent ? (
                <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold font-display text-lg tracking-wide text-ncpor-textPrimary">Generated Content</h3>
                    <button onClick={() => generateMutation.mutate()} className="text-xs flex items-center text-ncpor-textMuted hover:text-ncpor-accent transition-colors uppercase tracking-wider font-semibold bg-ncpor-bgSecondary px-3 py-1.5 rounded border border-ncpor-border">
                      <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${generateMutation.isPending ? 'animate-spin' : ''}`} /> Regenerate
                    </button>
                  </div>

                  {/* Social Posts */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-ncpor-textSecondary text-xs uppercase tracking-wider border-b border-ncpor-border/50 pb-2">Social Media</h4>
                    
                    {['twitter', 'instagram', 'linkedin'].map(platform => (
                      <div key={platform} className="bg-ncpor-bgSecondary border border-ncpor-border rounded-lg p-5 hover:border-ncpor-accent/30 transition-colors">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-ncpor-textMuted">{platform}</span>
                          <button className="text-xs text-ncpor-accent font-semibold flex items-center hover:text-ncpor-lightIce transition-colors"><Send className="h-3.5 w-3.5 mr-1.5"/> Publish</button>
                        </div>
                        <p className="text-sm text-ncpor-textSecondary leading-relaxed">{aiContent.social_posts?.[platform]}</p>
                      </div>
                    ))}
                  </div>

                  {/* Website Article */}
                  {aiContent.website_article && !aiContent.website_article.error && (
                    <div className="space-y-3 pt-4">
                      <h4 className="font-semibold text-ncpor-textSecondary text-xs uppercase tracking-wider border-b border-ncpor-border/50 pb-2">Website Article</h4>
                      <div className="bg-ncpor-bgSecondary border border-ncpor-border rounded-lg p-5">
                        {aiContent.website_article.low_confidence && <div className="text-xs bg-ncpor-warning/10 text-ncpor-warning border border-ncpor-warning/20 p-2.5 rounded-lg mb-4 font-semibold tracking-wide flex items-start"><AlertCircle className="h-4 w-4 mr-2 shrink-0" /> {aiContent.website_article.validation_warning}</div>}
                        <h5 className="font-bold font-display text-xl text-ncpor-textPrimary leading-tight mb-3">{aiContent.website_article.headline}</h5>
                        <h6 className="text-sm font-medium text-ncpor-textSecondary mb-4 border-l-2 border-ncpor-accent pl-3 py-1">{aiContent.website_article.subheading}</h6>
                        <p className="text-sm text-ncpor-textMuted line-clamp-4 leading-relaxed">{aiContent.website_article.body}</p>
                        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-ncpor-border/50">
                          {aiContent.website_article.suggested_tags?.map(tag => (
                            <span key={tag} className="bg-ncpor-bg text-ncpor-textSecondary border border-ncpor-border text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full">#{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Educational Explainer */}
                  {aiContent.educational_explainer && !aiContent.educational_explainer.error && (
                    <div className="space-y-3 pt-4">
                      <h4 className="font-semibold text-ncpor-textSecondary text-xs uppercase tracking-wider border-b border-ncpor-border/50 pb-2">Educational Explainer</h4>
                      <div className="bg-ncpor-bgSecondary border border-ncpor-border rounded-lg p-5">
                        {aiContent.educational_explainer.low_confidence && <div className="text-xs bg-ncpor-warning/10 text-ncpor-warning border border-ncpor-warning/20 p-2.5 rounded-lg mb-4 font-semibold tracking-wide flex items-start"><AlertCircle className="h-4 w-4 mr-2 shrink-0" /> {aiContent.educational_explainer.validation_warning}</div>}
                        <h5 className="font-bold font-display text-xl text-ncpor-textPrimary mb-4">{aiContent.educational_explainer.title}</h5>
                        <p className="text-sm text-ncpor-textSecondary line-clamp-3 mb-5 leading-relaxed">{aiContent.educational_explainer.explainer_text}</p>
                        
                        <div className="bg-ncpor-glaciology/10 p-4 rounded-lg border border-ncpor-glaciology/30 mb-5">
                          <h6 className="text-xs font-bold font-display tracking-wide uppercase text-ncpor-glaciology mb-2 flex items-center"><BookOpen className="h-3.5 w-3.5 mr-1.5"/> Fun Fact!</h6>
                          <p className="text-sm text-ncpor-textPrimary italic leading-relaxed">{aiContent.educational_explainer.fun_fact}</p>
                        </div>

                        <div className="text-xs text-ncpor-textSecondary uppercase tracking-wider font-semibold mb-3">Glossary Terms:</div>
                        <ul className="list-disc list-outside ml-4 text-sm text-ncpor-textMuted space-y-1.5">
                          {aiContent.educational_explainer.glossary?.slice(0,3).map(g => (
                            <li key={g.term}><span className="font-semibold text-ncpor-textPrimary">{g.term}</span></li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Interactive Quiz Preview */}
                  {aiContent.quiz && aiContent.quiz.length > 0 && (
                    <div className="mt-8 border-t border-ncpor-border/50 pt-6">
                      <h4 className="font-semibold text-ncpor-textSecondary text-xs uppercase tracking-wider mb-4">Quiz Preview</h4>
                      <div className="bg-ncpor-bgSecondary border border-ncpor-border rounded-lg p-1">
                        <Quiz questions={aiContent.quiz} />
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      
      {/* Dynamic Upload Modal based on Active Tab */}
      <UploadModal 
        isOpen={uploadModalOpen} 
        onClose={() => setUploadModalOpen(false)} 
        type={activeTab.slice(0, -1)} // 'reports' -> 'report'
        expeditionId={id} 
      />
    </div>
  );
};
export default ExpeditionDetail;
