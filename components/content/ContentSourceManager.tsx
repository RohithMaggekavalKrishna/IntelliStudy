import React, { useState } from 'react';
import { searchTopic } from '../../services/geminiService';
import { db } from '../../services/db';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import toast from 'react-hot-toast';
import { ContentSource } from '../../types';
import { Search, Youtube, FileText, X } from 'lucide-react';

interface ContentSourceManagerProps {
    projectId: string;
    onContentAdded: (contentSource: ContentSource) => void;
    onClose: () => void;
}

type SourceType = 'topic' | 'youtube' | 'text';

const ContentSourceManager: React.FC<ContentSourceManagerProps> = ({
    projectId,
    onContentAdded,
    onClose
}) => {
    const [activeTab, setActiveTab] = useState<SourceType>('topic');
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        topic: '',
        youtubeUrl: '',
        title: '',
        textContent: ''
    });

    const handleTopicSearch = async () => {
        if (!formData.topic.trim()) {
            toast.error('Please enter a topic');
            return;
        }

        setLoading(true);
        try {
            const { text, sources } = await searchTopic(formData.topic);

            const sourceLinks = sources.length > 0
                ? sources.map(s => `[${s.title}](${s.uri})`).join(', ')
                : '';

            const fullContent = sourceLinks
                ? `${text}\n\n**Sources:** ${sourceLinks}`
                : text;

            const contentSource = await db.createContentSource({
                projectId: projectId,
                title: `Research: ${formData.topic}`,
                type: 'topic',
                content: fullContent,
                metadata: {
                    topic: formData.topic,
                    sources: sources
                }
            });

            toast.success('Topic research added successfully!');
            onContentAdded(contentSource);
            onClose();

        } catch (error) {
            console.error('Error researching topic:', error);
            toast.error('Failed to research topic');
        } finally {
            setLoading(false);
        }
    };

    const handleYouTubeAdd = async () => {
        if (!formData.youtubeUrl.trim()) {
            toast.error('Please enter a YouTube URL');
            return;
        }

        const youtubeRegex = /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
        if (!youtubeRegex.test(formData.youtubeUrl)) {
            toast.error('Please enter a valid YouTube URL');
            return;
        }

        setLoading(true);
        try {
            const mockTranscript = `This is a demo transcript for the YouTube video: ${formData.youtubeUrl}\n\nIn a real implementation, this would be the actual transcribed content from the video using services like Whisper API or YouTube's transcript API.\n\nThe transcript would contain the spoken content, timestamps, and any relevant metadata from the video.`;

            const videoTitle = `YouTube Video: ${formData.youtubeUrl.split('/').pop() || 'Video'}`;

            const contentSource = await db.createContentSource({
                projectId: projectId,
                title: videoTitle,
                type: 'youtube',
                content: mockTranscript,
                metadata: {
                    url: formData.youtubeUrl,
                    transcribed: true
                }
            });

            toast.success('YouTube video added successfully!');
            onContentAdded(contentSource);
            onClose();

        } catch (error) {
            console.error('Error adding YouTube video:', error);
            toast.error('Failed to add YouTube video');
        } finally {
            setLoading(false);
        }
    };

    const handleTextAdd = async () => {
        if (!formData.title.trim() || !formData.textContent.trim()) {
            toast.error('Please enter both title and content');
            return;
        }

        setLoading(true);
        try {
            const contentSource = await db.createContentSource({
                projectId: projectId,
                title: formData.title,
                type: 'text',
                content: formData.textContent,
                metadata: {
                    wordCount: formData.textContent.split(' ').length
                }
            });

            toast.success('Text content added successfully!');
            onContentAdded(contentSource);
            onClose();

        } catch (error) {
            console.error('Error adding text content:', error);
            toast.error('Failed to add text content');
        } finally {
            setLoading(false);
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'topic':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Research Topic
                            </label>
                            <input
                                type="text"
                                value={formData.topic}
                                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                                placeholder="e.g., 'Machine Learning Fundamentals'"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                                disabled={loading}
                            />
                        </div>

                        <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3">
                            <p className="text-indigo-800 text-sm flex items-center gap-2">
                                <Search size={14} /> AI will research this topic using current web information.
                            </p>
                        </div>

                        <Button
                            onClick={handleTopicSearch}
                            disabled={loading || !formData.topic.trim()}
                            className="w-full"
                            loading={loading}
                        >
                            Research Topic
                        </Button>
                    </div>
                );

            case 'youtube':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                YouTube URL
                            </label>
                            <input
                                type="url"
                                value={formData.youtubeUrl}
                                onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                                placeholder="https://youtube.com/watch?v=..."
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                                disabled={loading}
                            />
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                            <p className="text-amber-800 text-sm">
                                🎥 Note: This is a demo. In production, this would perform actual transcription.
                            </p>
                        </div>

                        <Button
                            onClick={handleYouTubeAdd}
                            disabled={loading || !formData.youtubeUrl.trim()}
                            className="w-full"
                            loading={loading}
                        >
                            Add YouTube Video
                        </Button>
                    </div>
                );

            case 'text':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Title
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Give your content a title"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Content
                            </label>
                            <textarea
                                value={formData.textContent}
                                onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
                                placeholder="Paste your text content here..."
                                rows={8}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                                disabled={loading}
                            />
                        </div>

                        <Button
                            onClick={handleTextAdd}
                            disabled={loading || !formData.title.trim() || !formData.textContent.trim()}
                            className="w-full"
                            loading={loading}
                        >
                            Add Text Content
                        </Button>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl animate-in zoom-in-95">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Add Content Source</h2>
                        <p className="text-slate-500 text-sm">Choose how you'd like to add learning content</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
                        <X size={24} />
                    </button>
                </div>

                <div className="border-b border-slate-100">
                    <nav className="flex space-x-8 px-6">
                        <button
                            onClick={() => setActiveTab('topic')}
                            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition ${activeTab === 'topic' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            <Search size={16} /> Research Topic
                        </button>
                        <button
                            onClick={() => setActiveTab('youtube')}
                            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition ${activeTab === 'youtube' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            <Youtube size={16} /> YouTube
                        </button>
                        <button
                            onClick={() => setActiveTab('text')}
                            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition ${activeTab === 'text' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            <FileText size={16} /> Text Content
                        </button>
                    </nav>
                </div>

                <div className="p-6">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

export default ContentSourceManager;
