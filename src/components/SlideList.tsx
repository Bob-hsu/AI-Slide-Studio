import React from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { Plus, Trash2, Bookmark, X, ChevronUp, ChevronDown, BrainCircuit, FolderPlus, Folder, FolderOpen, MoreVertical, Edit2, LayoutTemplate, Search, Tag } from 'lucide-react';
import { cn } from '../utils/cn';
import { useState } from 'react';

export default function SlideList() {
  const { 
    presentation, 
    activeSlideId, 
    setActiveSlide, 
    addSlide, 
    deleteSlide, 
    moveSlide, 
    customTemplates,
    templateFolders,
    addTemplateFolder,
    deleteTemplateFolder,
    updateTemplateFolder,
    updateCustomTemplate,
    deleteCustomTemplate
  } = useEditorStore();
  
  const [showLibrary, setShowLibrary] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState('');
  const [showFolderMenu, setShowFolderMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  if (!presentation) return null;

  const filteredTemplates = (selectedFolderId === 'all' 
    ? customTemplates 
    : selectedFolderId === 'uncategorized'
    ? customTemplates.filter(t => !t.folderId)
    : customTemplates.filter(t => t.folderId === selectedFolderId)
  ).filter(t => {
    const searchLower = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(searchLower) ||
      t.description?.toLowerCase().includes(searchLower) ||
      t.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  });

  const handleAddFolder = () => {
    const name = prompt('Enter folder name:');
    if (name) addTemplateFolder(name);
  };

  const handleRenameFolder = (id: string, currentName: string) => {
    const name = prompt('Rename folder to:', currentName);
    if (name) updateTemplateFolder(id, name);
    setShowFolderMenu(null);
  };

  const handleMoveTemplate = (templateId: string, folderId: string | undefined) => {
    updateCustomTemplate(templateId, { folderId });
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="font-semibold text-gray-700">Slides</h2>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setShowLibrary(true)}
            className="p-1 hover:bg-gray-100 rounded-md text-gray-500 hover:text-indigo-600 transition-colors"
            title="Import from Library"
          >
            <Bookmark className="w-5 h-5" />
          </button>
          <button 
            onClick={() => addSlide()}
            className="p-1 hover:bg-gray-100 rounded-md text-gray-500 hover:text-indigo-600 transition-colors"
            title="Add Slide"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {presentation.slides.map((slide, index) => (
          <React.Fragment key={slide.id}>
            <div 
              onClick={() => setActiveSlide(slide.id)}
              className={cn(
                "group relative aspect-video rounded-lg border-2 cursor-pointer overflow-hidden transition-all bg-white",
                activeSlideId === slide.id 
                  ? "border-indigo-500 shadow-md ring-2 ring-indigo-200" 
                  : "border-gray-200 hover:border-gray-300"
              )}
              style={!presentation.isImagePPT ? { background: slide.background } : undefined}
            >
              <div className="absolute top-2 left-2 bg-white/80 backdrop-blur-sm text-xs font-medium px-2 py-1 rounded shadow-sm text-gray-700 z-10">
                {index + 1}
              </div>
              
              {presentation.isImagePPT && slide.imageUrl ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                  <img src={slide.imageUrl} alt={`Slide ${index + 1}`} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-full h-full p-2 origin-top-left transform scale-[0.2] pointer-events-none relative">
                  {slide.elements.length === 0 && presentation.isImagePPT && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                      {slide.status === 'generating' ? (
                        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <span className="text-4xl text-gray-300">Image Slide</span>
                      )}
                    </div>
                  )}
                  {slide.elements.map(element => (
                    <div
                      key={element.id}
                      className="absolute"
                      style={{
                        left: element.x,
                        top: element.y,
                        width: element.width,
                        height: element.height,
                        ...element.style
                      }}
                    >
                      {element.type === 'text' && (
                        <div 
                          className="w-full h-full truncate"
                          style={{
                            fontSize: element.style?.fontSize,
                            fontWeight: element.style?.fontWeight,
                            color: element.style?.color,
                          }}
                        >
                          {element.content}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveSlide(slide.id, 'up');
                  }}
                  disabled={index === 0}
                  className="p-1 bg-white/90 backdrop-blur-sm text-gray-600 rounded shadow-sm hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30"
                  title="Move Up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveSlide(slide.id, 'down');
                  }}
                  disabled={index === presentation.slides.length - 1}
                  className="p-1 bg-white/90 backdrop-blur-sm text-gray-600 rounded shadow-sm hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30"
                  title="Move Down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSlide(slide.id);
                  }}
                  className="p-1 bg-white/90 backdrop-blur-sm text-red-500 rounded shadow-sm hover:bg-red-50 z-10"
                  title="Delete Slide"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex justify-center py-1 opacity-0 hover:opacity-100 transition-opacity">
              <button 
                onClick={() => addSlide(undefined, index)}
                className="p-1 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                title="Insert Slide"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Template Library Modal */}
      {showLibrary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-6 flex-1">
                <h2 className="text-2xl font-bold flex items-center gap-2 shrink-0">
                  <Bookmark className="w-6 h-6 text-indigo-600" />
                  Template Library
                </h2>
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, description or tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>
              <button onClick={() => setShowLibrary(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors ml-4">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar: Folders */}
              <div className="w-64 border-r border-gray-100 bg-gray-50/50 p-4 flex flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Folders</span>
                  <button 
                    onClick={handleAddFolder}
                    className="p-1 hover:bg-indigo-50 text-indigo-600 rounded transition-colors"
                    title="New Folder"
                  >
                    <FolderPlus className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1 overflow-y-auto flex-1">
                  <button
                    onClick={() => setSelectedFolderId('all')}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      selectedFolderId === 'all' || !selectedFolderId ? "bg-indigo-50 text-indigo-600" : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <LayoutTemplate className="w-4 h-4" />
                    All Templates
                  </button>
                  <button
                    onClick={() => setSelectedFolderId('uncategorized')}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      selectedFolderId === 'uncategorized' ? "bg-indigo-50 text-indigo-600" : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <Folder className="w-4 h-4" />
                    Uncategorized
                  </button>

                  <div className="pt-2 pb-1 border-t border-gray-100 mt-2" />

                  {templateFolders.map(folder => (
                    <div key={folder.id} className="group relative">
                      <button
                        onClick={() => setSelectedFolderId(folder.id)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all pr-8",
                          selectedFolderId === folder.id ? "bg-indigo-50 text-indigo-600" : "text-gray-600 hover:bg-gray-100"
                        )}
                      >
                        {selectedFolderId === folder.id ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                        <span className="truncate">{folder.name}</span>
                      </button>
                      <div className="absolute right-1 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowFolderMenu(showFolderMenu === folder.id ? null : folder.id);
                          }}
                          className="p-1 hover:bg-gray-200 rounded text-gray-400"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {showFolderMenu === folder.id && (
                        <div className="absolute right-0 top-8 w-32 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
                          <button 
                            onClick={() => handleRenameFolder(folder.id, folder.name)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                          >
                            <Edit2 className="w-3 h-3" /> Rename
                          </button>
                          <button 
                            onClick={() => {
                              deleteTemplateFolder(folder.id);
                              if (selectedFolderId === folder.id) setSelectedFolderId('all');
                              setShowFolderMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Content: Templates */}
              <div className="flex-1 p-6 overflow-y-auto">
                {filteredTemplates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
                    <Bookmark className="w-16 h-16 opacity-10" />
                    <p className="text-sm">No templates found in this folder.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTemplates.map(template => (
                      <div 
                        key={template.id}
                        className="group flex flex-col border border-gray-200 rounded-xl overflow-hidden hover:border-indigo-500 hover:shadow-md transition-all bg-white"
                      >
                        <div 
                          onClick={() => {
                            addSlide(template);
                            setShowLibrary(false);
                          }}
                          className="aspect-video relative flex items-center justify-center bg-gray-50 cursor-pointer"
                        >
                          {template.slide.imageUrl ? (
                            <img src={template.slide.imageUrl} alt={template.name} className="w-full h-full object-cover" />
                          ) : template.slide.elements.find(e => e.type === 'image') ? (
                            <img 
                              src={template.slide.elements.find(e => e.type === 'image')?.content} 
                              alt={template.name} 
                              className="w-full h-full object-cover" 
                            />
                          ) : template.slide.imagePrompt ? (
                            <div className="flex flex-col items-center gap-2 text-indigo-600">
                              <BrainCircuit className="w-8 h-8" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">AI Prompt</span>
                            </div>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                              <Bookmark className="w-12 h-12 opacity-20" />
                            </div>
                          )}
                          
                          {template.slide.imagePrompt && !template.slide.imageUrl && (
                            <div className="absolute top-2 right-2">
                              <BrainCircuit className="w-4 h-4 text-indigo-600" />
                            </div>
                          )}

                          <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-colors" />
                        </div>

                        <div className="p-3 border-t border-gray-100 flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate text-sm">{template.name}</p>
                              <p className="text-[10px] text-gray-500 mt-0.5">
                                {template.slide.imagePrompt ? 'Learned from Asset' : 'Visual Template'}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <select 
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleMoveTemplate(template.id, e.target.value || undefined);
                                }}
                                value={template.folderId || ''}
                                className="text-[10px] border border-gray-200 rounded px-1 py-0.5 bg-gray-50 text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value="">Move to...</option>
                                {templateFolders.map(f => (
                                  <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                              </select>
                              <button 
                                type="button"
                                onClickCapture={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deleteCustomTemplate(template.id);
                                }}
                                className="p-1 hover:bg-red-50 text-red-500 rounded cursor-pointer relative z-20"
                              >
                                <Trash2 className="w-3.5 h-3.5 pointer-events-none" />
                              </button>
                            </div>
                          </div>

                          {template.description && (
                            <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">
                              {template.description}
                            </p>
                          )}

                          {template.tags && template.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {template.tags.map((tag, i) => (
                                <span key={i} className="flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px] font-medium">
                                  <Tag className="w-2 h-2" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
