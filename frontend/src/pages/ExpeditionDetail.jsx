import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, FileText, BarChart, Book, Image as ImageIcon, AlertCircle, RefreshCw, Send, Plus, Globe } from 'lucide-react';
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
  const [contentLang, setContentLang] = useState('en');
  
  // Data Fetching via React Query
  const { data: expedition, isLoading: loadingExpedition, isError: expError } = useQuery({
    queryKey: ['expedition', id],
    queryFn: () => expeditionApi.getExpeditionFull(id)
  });

  const { data: aiContentWrapper, isLoading: loadingAi } = useQuery({
    queryKey: ['aiContent', id],
    queryFn: () => genApi.getGeneratedContent(id)
  });

  const generateMutation = useMutation({
    mutationFn: () => genApi.generateContent(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['aiContent', id]);
    }
  });

  if (loadingExpedition) return <div className="text-center p-20"><div className="animate-spin h-10 w-10 border-4 border-ncpor-accent border-t-transparent rounded-full mx-auto"></div></div>;
  if (expError || !expedition) return <div className="text-center p-20 text-ncpor-warning bg-ncpor-warning/10 border border-ncpor-warning/20 max-w-lg mx-auto rounded-xl mt-12">Expedition not found or failed to load.</div>;

  const aiContent = aiContentWrapper ? aiContentWrapper[contentLang] : null;

  const renderMediaAttachment = (mediaId) => {
    if (!mediaId && expedition.media_items.length === 0) {
       return <div className="mt-2 text-xs text-slate-400 italic flex items-center"><ImageIcon className="h-3 w-3 mr-1"/> No media available for this expedition.</div>;
    }
    
    let media = expedition.media_items.find(m => m.id === mediaId);
    if (!media && expedition.media_items.length > 0) {
       media = expedition.media_items[0];
    }
    if (!media) return null;
    
    return (
      <div className="mt-3 p-2 bg-white border border-slate-200 rounded flex items-center space-x-3">
        <div className="h-10 w-10 bg-slate-100 rounded overflow-hidden flex items-center justify-center flex-shrink-0">
           {media.media_type === 'photo' ? (
             <img src={`${API_BASE_URL}/api/files/${media.file_path.replace('uploads/', '')}`} className="object-cover w-full h-full" alt={media.title} />
           ) : (
             <ImageIcon className="h-5 w-5 text-slate-400" />
           )}
        </div>
        <div className="flex-grow min-w-0">
          <p className="text-[10px] font-bold text-ocean-600 uppercase tracking-wider mb-0.5">📎 Suggested attachment</p>
          <p className="text-xs font-medium text-slate-700 truncate">{media.title}</p>
        </div>
        <button className="text-xs text-slate-500 hover:text-ocean-600 font-medium px-2 py-1 bg-slate-50 hover:bg-ocean-50 rounded border border-slate-200 transition-colors">
          Change
        </button>
      </div>
    );
  };

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
          <div className="bg-gradient-to-br from-ocean-800 to-ocean-900 rounded-xl shadow-lg border border-ocean-700 text-white overflow-hidden flex flex-col h-[700px]">
            <div className="p-5 border-b border-ocean-700 flex-shrink-0">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-3">
                  <div className="bg-ocean-700 p-2 rounded-lg">
                    <Bot className="h-5 w-5 text-ice-300" />
                  </div>
                  <h2 className="text-lg font-bold">AI Outreach Engine</h2>
                </div>
                
                {aiContentWrapper && (
                  <div className="flex bg-ocean-950 p-1 rounded-md border border-ocean-700">
                    <button onClick={() => setContentLang('en')} className={`px-2 py-1 text-xs font-semibold rounded transition-colors ${contentLang === 'en' ? 'bg-ocean-600 text-white' : 'text-ocean-300 hover:text-white'}`}>EN</button>
                    <button onClick={() => setContentLang('hi')} className={`px-2 py-1 text-xs font-semibold rounded transition-colors ${contentLang === 'hi' ? 'bg-ocean-600 text-white' : 'text-ocean-300 hover:text-white'}`}>हिन्दी</button>
                  </div>
                )}
              </div>
              <p className="text-ocean-200 text-xs">Generate social posts and articles in English & Hindi automatically.</p>
            </div>
            
            <div className="p-5 bg-slate-50 text-slate-800 flex-grow overflow-y-auto custom-scrollbar relative">
              {generateMutation.isPending ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/90 z-10">
                  <div className="animate-spin h-10 w-10 border-4 border-ocean-600 border-t-transparent rounded-full mb-4"></div>
                  <p className="font-bold text-ocean-900">Generating Bilingual Content...</p>
                  <p className="text-xs text-slate-500 mt-2 max-w-[200px] text-center">Writing articles and suggesting media attachments. This takes ~45 seconds.</p>
                </div>
              ) : null}
              
              {!aiContentWrapper && !loadingAi && !generateMutation.isPending ? (
                <div className="text-center py-12">
                  <Globe className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 text-sm mb-6 max-w-[200px] mx-auto">No bilingual outreach content generated yet.</p>
                  <button onClick={() => generateMutation.mutate()} className="w-full bg-ocean-600 hover:bg-ocean-700 text-white py-3 rounded-lg text-sm font-semibold shadow-md transition-colors flex items-center justify-center space-x-2">
                    <Bot className="h-4 w-4" />
                    <span>Generate AI Content</span>
                  </button>
                  {generateMutation.isError && <p className="text-red-500 text-xs mt-3 flex items-center justify-center"><AlertCircle className="h-3 w-3 mr-1"/>Failed to generate</p>}
                </div>
              ) : aiContent ? (
                <div className={`space-y-6 ${contentLang === 'hi' ? 'font-hind' : ''}`}>
                  <div className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 shadow-sm sticky top-0 z-10">
                    <h3 className="font-bold text-ocean-900 text-sm flex items-center"><Globe className="h-4 w-4 mr-1 text-ocean-600"/> {contentLang === 'en' ? 'English Content' : 'हिन्दी सामग्री'}</h3>
                    <button onClick={() => generateMutation.mutate()} className="text-[10px] uppercase font-bold tracking-wider flex items-center text-ocean-600 hover:text-ocean-800 bg-ocean-50 px-2 py-1 rounded">
                      <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
                    </button>
                  </div>

                  {/* Social Posts */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider border-b pb-1">Social Media</h4>
                    
                    {['twitter', 'instagram', 'linkedin'].map(platform => {
                      const post = aiContent.social_posts?.[platform];
                      if (!post) return null;
                      return (
                        <div key={platform} className="bg-white border border-slate-200 shadow-sm rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold uppercase text-slate-500">{platform}</span>
                            <button className="text-[10px] uppercase tracking-wider text-ocean-600 font-bold flex items-center"><Send className="h-3 w-3 mr-1"/> Publish</button>
                          </div>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{post.generated_text}</p>
                          {renderMediaAttachment(post.suggested_media_id)}
                        </div>
                      );
                    })}
                  </div>

                  {/* Website Article */}
                  {aiContent.website_article && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider border-b pb-1 mt-6">Website Article</h4>
                      <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4">
                        <h5 className="font-bold text-ocean-900 leading-tight mb-2 text-lg">{aiContent.website_article.generated_title}</h5>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{aiContent.website_article.generated_text}</p>
                        {renderMediaAttachment(aiContent.website_article.suggested_media_id)}
                      </div>
                    </div>
                  )}

                  {/* Educational Explainer */}
                  {aiContent.educational_explainer && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider border-b pb-1 mt-6">Educational Explainer</h4>
                      <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4">
                        <h5 className="font-bold text-ocean-900 mb-2">{aiContent.educational_explainer.generated_title}</h5>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{aiContent.educational_explainer.generated_text}</p>
                        {renderMediaAttachment(aiContent.educational_explainer.suggested_media_id)}
                      </div>
                    </div>
                  )}

                  {/* Interactive Quiz Preview */}
                  {aiContent.quiz && aiContent.quiz.length > 0 && (
                    <div className="mt-8 border-t border-slate-200 pt-6">
                      <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-4">Quiz Preview</h4>
                      <Quiz questions={aiContent.quiz} />
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      
      {/* Dynamic Upload Modal */}
      <UploadModal 
        isOpen={uploadModalOpen} 
        onClose={() => setUploadModalOpen(false)} 
        type={activeTab.slice(0, -1)} 
        expeditionId={id} 
      />
    </div>
  );
};
export default ExpeditionDetail;
